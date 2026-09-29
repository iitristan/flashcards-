import type { MCExplanationResponse, AIGradeResponse } from "@/types";
import { getServerSupabaseClient } from "@/lib/supabase/serverClient";

// In-memory cache fallback for high-speed hit without network roundtrips
const memoryExplanationCache = new Map<string, MCExplanationResponse>();
const memoryGradeCache = new Map<string, AIGradeResponse>();

/**
 * Robustly normalizes question text:
 * - Decodes HTML entities (&nbsp;, &#39;, etc.)
 * - Strips HTML tags (<p>, <br>, etc.)
 * - Trims off appended multiple choice choices (e.g. "\n a. ...")
 * - Strips special markdown/asterisks
 * - Collapses whitespace and normalizes to lowercase
 */
export function normalizeQuestionText(q: string): string {
  if (!q) return "";
  let clean = q;
  // Decode HTML entities
  clean = clean
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");

  // Strip HTML tags like <p>, <div>, <br>
  clean = clean.replace(/<[^>]+>/g, " ");

  // Strip trailing multiple-choice lists if appended to the prompt:
  // e.g. "Question prompt...\n a. Choice 1\n b. Choice 2..."
  clean = clean.split(/\n\s*[a-dA-D1-4][\.\)\:\-]/)[0];

  // Strip markdown markers and stray asterisks/underscores
  clean = clean.replace(/[\*\_\~]+/g, "");

  // Normalize whitespace and case
  return clean.trim().toLowerCase().replace(/\s+/g, " ");
}

export function createCacheKey(prefix: string, question: string, answer: string = ""): string {
  const cleanQ = normalizeQuestionText(question);
  const cleanA = (answer || "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${prefix}:${cleanQ}:::${cleanA}`;
}

/**
 * Get cached multiple-choice explanation from memory or Supabase.
 * Searches:
 * 1. Exact match (question + userAnswer) in memory (< 1ms)
 * 2. General question match in memory (< 1ms)
 * 3. Exact match in Supabase
 * 4. Question prefix match in Supabase (matches any previous choice for this question)
 * 5. Case-insensitive question_text match in Supabase
 */
export async function getCachedMCExplanation(
  question: string,
  userAnswer: string = ""
): Promise<MCExplanationResponse | null> {
  const cleanQ = normalizeQuestionText(question);
  if (!cleanQ) return null;

  const exactKey = createCacheKey("mc", question, userAnswer);
  const generalKey = `mc:${cleanQ}:::`;

  // 1. In-memory check (< 1ms)
  if (memoryExplanationCache.has(exactKey)) {
    return memoryExplanationCache.get(exactKey) || null;
  }
  if (memoryExplanationCache.has(generalKey)) {
    return memoryExplanationCache.get(generalKey) || null;
  }

  // 1b. Check in-memory for any key with the same question prefix
  for (const [k, val] of memoryExplanationCache.entries()) {
    if (k.startsWith(generalKey) && val && !val.unavailable) {
      memoryExplanationCache.set(exactKey, val);
      return val;
    }
  }

  // 2. Database check if Supabase is configured
  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {

      // Optimization #5: Combined query — exact key OR prefix key OR question_text match in ONE round-trip
      const { data: combinedResults } = await supabase
        .from("ai_explanation_cache")
        .select("id, ai_explanation")
        .or(`id.eq.${exactKey},id.like.${generalKey}%,question_text.ilike.${cleanQ}`)
        .order("created_at", { ascending: false })
        .limit(3);

      if (combinedResults && combinedResults.length > 0) {
        // Prioritize exact match, then any result
        const exactHit = combinedResults.find((r) => r.id === exactKey);
        const bestHit = exactHit || combinedResults[0];

        if (bestHit?.ai_explanation) {
          const parsed = typeof bestHit.ai_explanation === "string"
            ? JSON.parse(bestHit.ai_explanation)
            : bestHit.ai_explanation;
          if (parsed && (parsed.whyRight || parsed.searchOverview)) {
            memoryExplanationCache.set(exactKey, parsed);
            memoryExplanationCache.set(generalKey, parsed);
            return parsed;
          }
        }
      }

      // Fallback: substring lookup for long questions (only if combined query missed)
      if (cleanQ.length >= 25) {
        const coreText = cleanQ.slice(0, 60);
        const { data: subList } = await supabase
          .from("ai_explanation_cache")
          .select("ai_explanation")
          .ilike("question_text", `%${coreText}%`)
          .order("created_at", { ascending: false })
          .limit(1);

        if (subList && subList.length > 0 && subList[0].ai_explanation) {
          const parsed = typeof subList[0].ai_explanation === "string"
            ? JSON.parse(subList[0].ai_explanation)
            : subList[0].ai_explanation;
          if (parsed && (parsed.whyRight || parsed.searchOverview)) {
            memoryExplanationCache.set(exactKey, parsed);
            memoryExplanationCache.set(generalKey, parsed);
            return parsed;
          }
        }
      }
    } catch {
      // Non-fatal database lookup failure
    }
  }

  return null;
}

/**
 * Persist generated multiple-choice explanation to memory and Supabase
 */
export async function setCachedMCExplanation(
  question: string,
  userAnswer: string,
  isCorrect: boolean,
  explanation: MCExplanationResponse
): Promise<void> {
  const cleanQ = normalizeQuestionText(question);
  if (!cleanQ) return;

  const exactKey = createCacheKey("mc", question, userAnswer);
  const generalKey = `mc:${cleanQ}:::`;

  // 1. Store in memory under both exact and general question keys
  memoryExplanationCache.set(exactKey, explanation);
  memoryExplanationCache.set(generalKey, explanation);

  // 2. Persist to database if Supabase is available
  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {

      await supabase.from("ai_explanation_cache").upsert({
        id: exactKey,
        question_text: cleanQ.slice(0, 500),
        user_answer: userAnswer || "General Explanation",
        is_correct: isCorrect,
        ai_explanation: explanation,
        created_at: new Date().toISOString(),
      }, { onConflict: "id" });
    } catch {
      // Non-fatal if table not yet created in Supabase
    }
  }
}

/**
 * Get cached identification/short-answer grade
 */
export async function getCachedAnswerGrade(
  question: string,
  userAnswer: string
): Promise<AIGradeResponse | null> {
  const cleanQ = normalizeQuestionText(question);
  if (!cleanQ) return null;

  const exactKey = createCacheKey("grade", question, userAnswer);

  if (memoryGradeCache.has(exactKey)) {
    return memoryGradeCache.get(exactKey) || null;
  }

  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {

      const { data } = await supabase
        .from("ai_grade_cache")
        .select("grade_result")
        .eq("id", exactKey)
        .maybeSingle();

      if (data?.grade_result) {
        const parsed = typeof data.grade_result === "string"
          ? JSON.parse(data.grade_result)
          : data.grade_result;
        memoryGradeCache.set(exactKey, parsed);
        return parsed;
      }
    } catch {
      // Table may not exist yet
    }
  }

  return null;
}

/**
 * Persist identification/short-answer grade
 */
export async function setCachedAnswerGrade(
  question: string,
  userAnswer: string,
  gradeResult: AIGradeResponse
): Promise<void> {
  const cleanQ = normalizeQuestionText(question);
  if (!cleanQ) return;

  const exactKey = createCacheKey("grade", question, userAnswer);

  memoryGradeCache.set(exactKey, gradeResult);

  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {

      await supabase.from("ai_grade_cache").upsert({
        id: exactKey,
        question_text: cleanQ.slice(0, 500),
        user_answer: (userAnswer || "").trim(),
        grade_result: gradeResult,
        created_at: new Date().toISOString(),
      }, { onConflict: "id" });
    } catch {
      // Table may not exist yet
    }
  }
}
