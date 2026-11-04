"use server";

import { INITIAL_DECKS } from "@/lib/data/sampleDecks";
import { QUIZLET_FOOD_SERVICE_DECK } from "@/lib/data/quizletFoodServiceDeck";
import { CBLEQuestion, MOCK_CBLE_QUESTIONS } from "@/data/cble-mock-data";
import { getNeonPool, hasNeonDatabaseUrl } from "@/lib/neon";
import {
  normalizeQuestionStemHeuristics,
  reframeQuestionForCBLE,
} from "@/lib/services/cbleQuestionReframer";
import { getServerSupabaseClient } from "@/lib/supabase/serverClient";

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function getCBLEExamQuestions(itemCount: number = 100): Promise<CBLEQuestion[]> {
  try {
    const rawCards: {
      id: string;
      front: string;
      back: string;
      rationale?: string;
      options?: string[];
      category?: string;
    }[] = [];

    // Load the exam bank and flashcards from Neon when configured.
    if (hasNeonDatabaseUrl) {
      try {
        const { rows: cbleDbQuestions } = await getNeonPool().query<{
          id: string;
          question: string;
          options: unknown;
          correct_answer: string;
          explanation: string | null;
          category: string;
          subject: string;
        }>(
          `SELECT id, question, options, correct_answer, explanation, category, subject
           FROM public.cble_questions
           LIMIT 100`,
        );

        for (const question of cbleDbQuestions) {
          const optionList: string[] = Array.isArray(question.options)
            ? question.options.map((option: unknown) =>
                typeof option === "string"
                  ? option
                  : (option as { text?: string })?.text || "",
              )
            : [];
          rawCards.push({
            id: `neon-cble-${question.id}`,
            front: question.question,
            back: question.correct_answer || (optionList[0] ?? ""),
            rationale: question.explanation || "",
            options: optionList,
            category: question.category || question.subject || "Board Exam Review",
          });
        }
      } catch (err) {
        console.warn("Could not query the Neon CBLE question bank:", err);
      }

      try {
        const { rows: dbCards } = await getNeonPool().query<{
          id: string;
          front: string;
          back: string;
          rationale: string | null;
          options: unknown;
          title: string;
          category: string;
        }>(
          `SELECT f.id, f.front, f.back, f.rationale, f.options,
                  d.title, d.category
           FROM public.flashcards f
           JOIN public.decks d ON d.id = f.deck_id`,
        );

        if (dbCards && dbCards.length > 0) {
          for (const c of dbCards) {
            const options: string[] = Array.isArray(c.options)
              ? c.options.filter((option): option is string => typeof option === "string")
              : [];
            rawCards.push({
              id: c.id,
              front: c.front,
              back: c.back,
              rationale: c.rationale || "",
              options,
              category: c.title || c.category || "General Nutrition",
            });
          }
        }
      } catch (err) {
        console.warn("Could not query flashcards from Neon:", err);
      }
    }

    // 3. Also collect high-yield cards from INITIAL_DECKS
    for (const deck of INITIAL_DECKS) {
      for (const card of deck.cards) {
        rawCards.push({
          id: card.id,
          front: card.front,
          back: card.back,
          rationale: card.rationale,
          options: card.options,
          category: deck.title || deck.category,
        });
      }
    }

    // 4. Add all 200 NDLE board exam questions from QUIZLET_FOOD_SERVICE_DECK
    if (QUIZLET_FOOD_SERVICE_DECK && QUIZLET_FOOD_SERVICE_DECK.cards) {
      for (const card of QUIZLET_FOOD_SERVICE_DECK.cards) {
        rawCards.push({
          id: card.id,
          front: card.front,
          back: card.back,
          rationale: card.rationale,
          options: card.options,
          category: QUIZLET_FOOD_SERVICE_DECK.title || "Food Service Systems",
        });
      }
    }

    // 5. Also include questions from MOCK_CBLE_QUESTIONS with images/diagrams
    for (const mockQ of MOCK_CBLE_QUESTIONS) {
      rawCards.push({
        id: `cble-${mockQ.id}`,
        front: mockQ.question,
        back: mockQ.options.find((o) => o.key === mockQ.correctAnswer)?.text || "",
        rationale: mockQ.explanation,
        options: mockQ.options.map((o) => o.text),
        category: mockQ.category,
      });
    }

    // Deduplicate cards by front prompt
    const seen = new Set<string>();
    const uniqueCards = rawCards.filter((c) => {
      const cleanFront = (c.front || '').trim().toLowerCase();
      if (!cleanFront || seen.has(cleanFront)) return false;
      seen.add(cleanFront);
      return true;
    });

    if (uniqueCards.length === 0) {
      return MOCK_CBLE_QUESTIONS;
    }

    // Shuffle cards so every session is a unique random experience
    const randomized = shuffle(uniqueCards);

    // Standard board exam session: 100 or 200 questions (or all if < requested)
    const targetCount = itemCount >= 200 ? 200 : 100;
    const examCards = randomized.slice(0, Math.min(targetCount, randomized.length));

    // Extract all possible answers to use as distractors
    const allBackAnswers = Array.from(
      new Set(uniqueCards.map((c) => (c.back || '').trim()))
    ).filter((b) => b.length > 0);

    // Convert to CBLEQuestion format
    const formattedQuestions: CBLEQuestion[] = examCards.map((card, idx) => {
      let optionTexts: string[] = [];
      const correctAnsTrimmed = (card.back || '').trim();

      if (card.options && Array.isArray(card.options) && card.options.length >= 4) {
        // Ensure card.back is included in options
        const hasBack = card.options.some(
          (o) => (typeof o === 'string' ? o : String(o || '')).trim().toLowerCase() === correctAnsTrimmed.toLowerCase()
        );
        const baseOptions = card.options.map((o) => (typeof o === 'string' ? o : String(o || '')));
        if (!hasBack) {
          baseOptions[0] = correctAnsTrimmed;
        }
        optionTexts = shuffle(baseOptions.slice(0, 4));
      } else {
        // Generate options: 1 correct answer + 3 random distractors
        const otherOptions = shuffle(
          allBackAnswers.filter(
            (a) => a.toLowerCase() !== correctAnsTrimmed.toLowerCase()
          )
        ).slice(0, 3);

        const pool = [correctAnsTrimmed, ...otherOptions];
        while (pool.length < 4) {
          pool.push(`Option ${pool.length + 1}`);
        }
        optionTexts = shuffle(pool);
      }

      // Check if this matches any mock item with SVG or image diagram
      const mockMatch = MOCK_CBLE_QUESTIONS.find(
        (m) => (m.question || '').trim().toLowerCase() === (card.front || '').trim().toLowerCase()
      );

      // Map options to A, B, C, D
      const keys: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
      const options = optionTexts.map((text, optIdx) => ({
        key: keys[optIdx],
        text,
      }));

      // Find which option matches card.back
      let correctKey: "A" | "B" | "C" | "D" = "A";
      const matchIndex = options.findIndex(
        (opt) => opt.text.trim().toLowerCase() === correctAnsTrimmed.toLowerCase()
      );
      if (matchIndex !== -1) {
        correctKey = keys[matchIndex];
      } else {
        // Guarantee match by explicitly setting option A to correct answer
        options[0].text = correctAnsTrimmed;
        correctKey = "A";
      }

      return {
        id: idx + 1,
        questionNumber: idx + 1,
        subject: "MIXED SUBJECT",
        question: normalizeQuestionStemHeuristics(card.front),
        image: mockMatch?.image,
        options,
        correctAnswer: correctKey,
        explanation:
          card.rationale || `The correct answer is "${card.back}".`,
        category: card.category || "Board Exam Review",
      };
    });

    return formattedQuestions;
  } catch (error) {
    console.error("Failed to load CBLE exam questions:", error);
    return MOCK_CBLE_QUESTIONS;
  }
}

export interface SaveCBLEExamResultPayload {
  userId?: string | null;
  examineeName: string;
  examinationName: string;
  subject: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  isPassed: boolean;
  timeSpentSeconds: number;
  userAnswers: Record<number, "A" | "B" | "C" | "D">;
  categoryBreakdown?: Record<string, { total: number; correct: number }>;
}

export async function saveCBLEExamResult(payload: SaveCBLEExamResultPayload) {
  try {
    const supabase = getServerSupabaseClient();

    if (!supabase) {
      return { success: true, localOnly: true };
    }

    const examResultId = `cble-res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const { error } = await supabase.from("cble_exam_results").insert({
      id: examResultId,
      user_id: payload.userId || null,
      examinee_name: payload.examineeName,
      examination_name: payload.examinationName,
      subject: payload.subject,
      total_questions: payload.totalQuestions,
      correct_count: payload.correctCount,
      score_percentage: payload.scorePercentage,
      is_passed: payload.isPassed,
      time_spent_seconds: payload.timeSpentSeconds,
      user_answers: payload.userAnswers,
      category_breakdown: payload.categoryBreakdown || {},
      completed_at: new Date().toISOString(),
    });

    if (error) {
      console.warn(
        "Could not save to cble_exam_results in Supabase (run supabase/schema.sql to create the table):",
        error.message
      );
      return { success: false, error: error.message };
    }

    return { success: true, id: examResultId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Failed to persist CBLE exam result:", message);
    return { success: false, error: message };
  }
}

/**
 * Server action to reframe a single question stem using Admin AI with caching.
 * Polishes grammar, punctuation, and board exam structure without altering answers.
 */
export async function reframeQuestionStemAction(stem: string): Promise<string> {
  return reframeQuestionForCBLE(stem);
}
