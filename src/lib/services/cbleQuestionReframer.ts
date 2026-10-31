import { GoogleGenerativeAI } from "@google/generative-ai";
import { query, queryOne } from "@/lib/db";

const reframedStemCache = new Map<string, string>();

/**
 * Fast clinical & academic normalization rules that immediately eliminate
 * capitalization errors, colloquial fragments, and broken question starts.
 */
export function normalizeQuestionStemHeuristics(rawStem: string): string {
  if (!rawStem || rawStem.trim().length === 0) return rawStem;

  let text = rawStem.trim();

  // If ALL CAPS, convert to sentence case with medical acronym preservation
  if (text === text.toUpperCase() && text.length > 20) {
    text = text.toLowerCase();
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Capitalize first character
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Fix common quizlet stem artifacts:
  // "example of:" -> "Which of the following is an example of:"
  text = text.replace(/^example of:\s*/i, "Which of the following is an example of ");
  text = text.replace(/^examples of:\s*/i, "Which of the following are examples of ");
  text = text.replace(/^defined as:\s*/i, "Which of the following is defined as ");
  text = text.replace(/^meaning of:\s*/i, "What is the definition of ");
  text = text.replace(/^type of:\s*/i, "Which of the following is a type of ");
  text = text.replace(/^function of:\s*/i, "What is the primary function of ");

  // Ensure sentence ends with appropriate punctuation (? or :)
  if (!text.endsWith("?") && !text.endsWith(":") && !text.endsWith(".")) {
    if (
      text.toLowerCase().startsWith("what") ||
      text.toLowerCase().startsWith("which") ||
      text.toLowerCase().startsWith("how") ||
      text.toLowerCase().startsWith("where") ||
      text.toLowerCase().startsWith("why") ||
      text.toLowerCase().startsWith("who")
    ) {
      text += "?";
    } else {
      text += ":";
    }
  }

  // Common clinical acronyms and names to keep properly capitalized
  const properTerms: [RegExp, string][] = [
    [/\bcrohn'?s\b/gi, "Crohn's"],
    [/\bwilson'?s\b/gi, "Wilson's"],
    [/\bharris-benedict\b/gi, "Harris-Benedict"],
    [/\bpku\b/gi, "PKU"],
    [/\btpn\b/gi, "TPN"],
    [/\bppn\b/gi, "PPN"],
    [/\bgfr\b/gi, "GFR"],
    [/\bckd\b/gi, "CKD"],
    [/\bbmi\b/gi, "BMI"],
    [/\bter\b/gi, "TER"],
    [/\bbee\b/gi, "BEE"],
    [/\buun\b/gi, "UUN"],
    [/\bbun\b/gi, "BUN"],
    [/\binr\b/gi, "INR"],
    [/\bcho\b/gi, "CHO"],
    [/\bpro\b/gi, "PRO"],
    [/\bfnri\b/gi, "FNRI"],
    [/\bprc\b/gi, "PRC"],
    [/\bndle\b/gi, "NDLE"],
    [/\bwho\b/gi, "WHO"],
    [/\bmarfe\b/gi, "MARFE"],
  ];

  for (const [pattern, replacement] of properTerms) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

/**
 * Reframe a question stem for realistic PRC CBLE examination presentation.
 * Uses Admin AI when configured, with database and memory caching.
 * CRITICAL: This reframes ONLY the question stem for clarity.
 * Answers and options are NEVER generated or altered.
 */
export async function reframeQuestionForCBLE(originalStem: string): Promise<string> {
  const cleanOriginal = originalStem.trim();
  if (!cleanOriginal) return originalStem;

  // 1. Check in-memory cache
  if (reframedStemCache.has(cleanOriginal)) {
    return reframedStemCache.get(cleanOriginal)!;
  }

  // 2. Check PostgreSQL database cache
  try {
    const row = await queryOne<{ reframed_stem: string }>(
      "SELECT reframed_stem FROM public.cble_question_reframes WHERE original_stem = $1",
      [cleanOriginal]
    );

    if (row?.reframed_stem) {
      reframedStemCache.set(cleanOriginal, row.reframed_stem);
      return row.reframed_stem;
    }
  } catch {
    // Non-fatal if table not yet created
  }

  // 3. Apply high-precision heuristic normalization first
  const heuristicCleaned = normalizeQuestionStemHeuristics(cleanOriginal);

  // 4. Try Admin AI reframing if key is available
  const adminApiKey =
    process.env.ADMIN_GEMINI_API_KEY ||
    process.env.ADMIN_AI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (adminApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(adminApiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 250,
        },
      });

      const prompt = `You are a Philippine Professional Regulation Commission (PRC) NDLE Board Exam Editor.
Clean up and reframe the following question stem so that it mirrors authentic, realistic board exam precision:
1. Fix capitalization errors, awkward phrasing, and informal grammar.
2. Standardize question structure into formal academic/clinical board exam format (e.g., "Which of the following...", "In clinical evaluation of...", "A patient presents with...").
3. Keep it clear, concise, and professional.
4. STRICT PROHIBITION: Do NOT provide the answer. Do NOT change facts, quantities, or the clinical premise. Output ONLY the polished question stem text, nothing else.

Question Stem:
"${heuristicCleaned}"`;

      const result = await model.generateContent(prompt);
      const aiReframed = result.response.text().trim().replace(/^["']|["']$/g, "");

      if (aiReframed && aiReframed.length > 10) {
        reframedStemCache.set(cleanOriginal, aiReframed);

        // Persist to PostgreSQL
        try {
          await query(`
            INSERT INTO public.cble_question_reframes (original_stem, reframed_stem, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (original_stem) DO UPDATE SET reframed_stem = EXCLUDED.reframed_stem, updated_at = NOW()
          `, [cleanOriginal, aiReframed]);
        } catch {
          // Ignore if table not present
        }

        return aiReframed;
      }
    } catch (err) {
      console.warn("Admin AI reframing failed, using heuristic cleaned stem:", err);
    }
  }

  // Cache and return heuristic cleaned version
  reframedStemCache.set(cleanOriginal, heuristicCleaned);
  return heuristicCleaned;
}

/**
 * Batch process questions with heuristic cleaning for instant UI delivery,
 * ensuring zero lag while polishing every item.
 */
export function normalizeCBLEQuestionsBatch<T extends { question: string }>(questions: T[]): T[] {
  return questions.map((q) => ({
    ...q,
    question: normalizeQuestionStemHeuristics(q.question),
  }));
}
