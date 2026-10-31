import type { MCExplanationResponse, AIGradeResponse } from "@/types";
import { query, queryOne } from "@/lib/db";

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
  clean = clean.split(/\n\s*(?:[a-dA-D][\.\)\:\-]\s*|[1-4]\.(?!\d)\s+|[1-4][\)\:\-]\s+)/)[0];

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
 * Get cached multiple-choice explanation from memory or PostgreSQL.
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

  // 2. Database check in PostgreSQL
  try {
    const row = await queryOne<{ id: string; ai_explanation: any }>(`
      SELECT id, ai_explanation
      FROM public.ai_explanation_cache
      WHERE id = $1 OR id LIKE $2 OR question_text ILIKE $3
      ORDER BY created_at DESC
      LIMIT 1
    `, [exactKey, `${generalKey}%`, cleanQ]);

    if (row?.ai_explanation) {
      const parsed = typeof row.ai_explanation === "string"
        ? JSON.parse(row.ai_explanation)
        : row.ai_explanation;
      if (parsed && (parsed.whyRight || parsed.searchOverview)) {
        memoryExplanationCache.set(exactKey, parsed);
        memoryExplanationCache.set(generalKey, parsed);
        return parsed;
      }
    }
  } catch {
    // Non-fatal database lookup failure
  }

  return null;
}

/**
 * Persist generated multiple-choice explanation to memory and PostgreSQL
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

  // 2. Persist to PostgreSQL database
  try {
    await query(`
      INSERT INTO public.ai_explanation_cache (
        id, question_text, user_answer, is_correct, ai_explanation, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE SET
        ai_explanation = EXCLUDED.ai_explanation,
        created_at = NOW()
    `, [
      exactKey,
      cleanQ.slice(0, 500),
      userAnswer || "General Explanation",
      isCorrect,
      JSON.stringify(explanation),
    ]);
  } catch {
    // Non-fatal
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

  try {
    const row = await queryOne<{ grade_result: any }>(`
      SELECT grade_result FROM public.ai_grade_cache WHERE id = $1
    `, [exactKey]);

    if (row?.grade_result) {
      const parsed = typeof row.grade_result === "string"
        ? JSON.parse(row.grade_result)
        : row.grade_result;
      memoryGradeCache.set(exactKey, parsed);
      return parsed;
    }
  } catch {
    // Non-fatal
  }

  return null;
}

/**
 * Persist identification/short-answer grade to PostgreSQL
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

  try {
    await query(`
      INSERT INTO public.ai_grade_cache (
        id, question_text, user_answer, grade_result, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (id) DO UPDATE SET
        grade_result = EXCLUDED.grade_result,
        created_at = NOW()
    `, [
      exactKey,
      cleanQ.slice(0, 500),
      (userAnswer || "").trim(),
      JSON.stringify(gradeResult),
    ]);
  } catch {
    // Non-fatal
  }
}
