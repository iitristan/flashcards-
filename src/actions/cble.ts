"use server";

import { INITIAL_DECKS } from "@/lib/data/sampleDecks";
import { QUIZLET_FOOD_SERVICE_DECK } from "@/lib/data/quizletFoodServiceDeck";
import { CLINICAL_BIOCHEMISTRY_DECK } from "@/lib/data/clinicalBiochemistryDeck";
import { COMMUNITY_PUBLIC_HEALTH_DECK } from "@/lib/data/communityPublicHealthDeck";
import { CBLEQuestion, MOCK_CBLE_QUESTIONS } from "@/data/cble-mock-data";
import {
  normalizeQuestionStemHeuristics,
  reframeQuestionForCBLE,
} from "@/lib/services/cbleQuestionReframer";
import { query } from "@/lib/db";
import { NDLESubject } from "@/types/ndle";

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

    // 1. Fetch questions from PostgreSQL database
    try {
      const cbleDbQuestions = await query<any>(`
        SELECT id, question, options, correct_answer, explanation, category, subject
        FROM public.cble_questions
        LIMIT 100
      `).catch(() => []);

      if (cbleDbQuestions && cbleDbQuestions.length > 0) {
        for (const q of cbleDbQuestions) {
          const optList: string[] = Array.isArray(q.options)
            ? q.options.map((o: unknown) =>
                typeof o === "string" ? o : (o as { text?: string })?.text || ""
              )
            : [];

          rawCards.push({
            id: `pg-cble-${q.id}`,
            front: q.question,
            back: q.correct_answer || (optList[0] ?? ""),
            rationale: q.explanation || "",
            options: optList,
            category: q.category || q.subject || "Board Exam Review",
          });
        }
      }

      // Fetch from flashcards table
      const pgFlashcards = await query<any>(`
        SELECT f.id, f.front, f.back, f.rationale, f.options, d.title as deck_title, d.category as deck_category
        FROM public.flashcards f
        LEFT JOIN public.decks d ON f.deck_id = d.id
        LIMIT 150
      `).catch(() => []);

      if (pgFlashcards && pgFlashcards.length > 0) {
        for (const fc of pgFlashcards) {
          const optList: string[] = Array.isArray(fc.options) ? fc.options : [];
          rawCards.push({
            id: `pg-card-${fc.id}`,
            front: fc.front,
            back: fc.back,
            rationale: fc.rationale || "",
            options: optList,
            category: fc.deck_title || fc.deck_category || "Clinical Nutrition",
          });
        }
      }
    } catch (err) {
      console.warn("Could not query PostgreSQL database for CBLE questions:", err);
    }

    // 2. Collect high-yield cards from INITIAL_DECKS
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

    // 4. Collect authentic NDLE Clinical Dietetics & Biochemistry questions
    if (CLINICAL_BIOCHEMISTRY_DECK && CLINICAL_BIOCHEMISTRY_DECK.cards) {
      for (const card of CLINICAL_BIOCHEMISTRY_DECK.cards) {
        rawCards.push({
          id: card.id,
          front: card.front,
          back: card.back,
          rationale: card.rationale,
          options: card.options,
          category: "Medical Nutrition Therapy (MNT)",
        });
      }
    }

    // 5. Collect authentic NDLE Community & Public Health Nutrition questions
    if (COMMUNITY_PUBLIC_HEALTH_DECK && COMMUNITY_PUBLIC_HEALTH_DECK.cards) {
      for (const card of COMMUNITY_PUBLIC_HEALTH_DECK.cards) {
        rawCards.push({
          id: card.id,
          front: card.front,
          back: card.back,
          rationale: card.rationale,
          options: card.options,
          category: "Community & Public Health",
        });
      }
    }

    // 6. Collect authentic NDLE Food Service Systems board exam questions
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

    // 7. Include questions from MOCK_CBLE_QUESTIONS (with images/diagrams)
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

    // Helper: Classify each card into one of the 3 official NDLE domains and fine-grained subtopics
    const classifyCardForCBLE = (card: typeof rawCards[0]) => {
      const combinedText = `${card.category || ''} ${card.front} ${card.back} ${card.rationale || ''}`.toLowerCase();

      // CPHN indicators
      const isCphn =
        combinedText.includes('community') ||
        combinedText.includes('public health') ||
        combinedText.includes('cphn') ||
        combinedText.includes('ppan') ||
        combinedText.includes('nnc') ||
        combinedText.includes('operation timbang') ||
        combinedText.includes('opt plus') ||
        combinedText.includes('first 1000 days') ||
        combinedText.includes('ra 11148') ||
        combinedText.includes('ra 8976') ||
        combinedText.includes('ra 8172') ||
        combinedText.includes('asin law') ||
        combinedText.includes('milk code') ||
        combinedText.includes('eo 51') ||
        combinedText.includes('ra 10028') ||
        combinedText.includes('stunting') ||
        combinedText.includes('wasting') ||
        combinedText.includes('muac') ||
        combinedText.includes('rutf') ||
        combinedText.includes('f-75') ||
        combinedText.includes('f-100') ||
        combinedText.includes('pinggang pinoy') ||
        combinedText.includes('kumainments') ||
        combinedText.includes('breastfeeding') ||
        combinedText.includes('iycf') ||
        combinedText.includes('epidemiology') ||
        combinedText.includes('incidence') ||
        combinedText.includes('relative risk') ||
        combinedText.includes('24-hour recall') ||
        combinedText.includes('food balance sheet') ||
        combinedText.includes('sphere') ||
        combinedText.includes('kwashiorkor') ||
        combinedText.includes('marasmus');

      // FFSS indicators
      const isFfss =
        combinedText.includes('food service') ||
        combinedText.includes('foodservice') ||
        combinedText.includes('haccp') ||
        combinedText.includes('food safety') ||
        combinedText.includes('danger zone') ||
        combinedText.includes('sanitation') ||
        combinedText.includes('foodborne') ||
        combinedText.includes('salmonella') ||
        combinedText.includes('purchasing') ||
        combinedText.includes('procurement') ||
        combinedText.includes('inventory') ||
        combinedText.includes('fifo') ||
        combinedText.includes('costing') ||
        combinedText.includes('recipe standardization') ||
        combinedText.includes('edible portion') ||
        combinedText.includes('as purchased') ||
        combinedText.includes('portion control') ||
        combinedText.includes('scoop #') ||
        combinedText.includes('menu planning') ||
        combinedText.includes('cook-chill') ||
        combinedText.includes('trayline') ||
        combinedText.includes('caramelization') ||
        combinedText.includes('gelatinization') ||
        combinedText.includes('coagulation') ||
        combinedText.includes('syneresis') ||
        combinedText.includes('leavening') ||
        combinedText.includes('bulbs') ||
        combinedText.includes('culinary');

      if (isCphn) {
        let topic = 'Community & Public Health';
        if (combinedText.includes('first 1000 days') || combinedText.includes('ra 11148') || combinedText.includes('milk code') || combinedText.includes('breastfeeding') || combinedText.includes('iycf')) {
          topic = 'Maternal, Infant & Young Child Nutrition';
        } else if (combinedText.includes('opt') || combinedText.includes('muac') || combinedText.includes('stunting') || combinedText.includes('assessment') || combinedText.includes('recall')) {
          topic = 'Community Assessment & Growth Standards';
        } else if (combinedText.includes('ppan') || combinedText.includes('nnc') || combinedText.includes('policy') || combinedText.includes('law') || combinedText.includes('fortification') || combinedText.includes('asin')) {
          topic = 'Public Health Policy, PPAN & Legislation';
        } else if (combinedText.includes('sam') || combinedText.includes('f-75') || combinedText.includes('emergency') || combinedText.includes('sphere') || combinedText.includes('kwashiorkor')) {
          topic = 'Severe Malnutrition & Emergency Nutrition';
        }
        return {
          ...card,
          subjectDomain: 'Community and Public Health Nutrition' as NDLESubject,
          subjectShort: 'Community & Public Health',
          topic,
        };
      }

      if (isFfss && !combinedText.includes('renal') && !combinedText.includes('ckd') && !combinedText.includes('mnt') && !combinedText.includes('diabetes')) {
        let topic = 'Food Service Systems';
        if (combinedText.includes('haccp') || combinedText.includes('sanitation') || combinedText.includes('safety') || combinedText.includes('danger zone') || combinedText.includes('foodborne')) {
          topic = 'Food Safety, Sanitation & HACCP';
        } else if (combinedText.includes('cost') || combinedText.includes('recipe') || combinedText.includes('yield') || combinedText.includes('scoop') || combinedText.includes('edible portion')) {
          topic = 'Food Costing & Recipe Standardization';
        } else if (combinedText.includes('chemistry') || combinedText.includes('science') || combinedText.includes('coagulation') || combinedText.includes('gelatinization') || combinedText.includes('leavening')) {
          topic = 'Food Science & Food Chemistry';
        } else if (combinedText.includes('purchasing') || combinedText.includes('receiving') || combinedText.includes('inventory') || combinedText.includes('fifo') || combinedText.includes('storage')) {
          topic = 'Procurement, Receiving & Inventory';
        }
        return {
          ...card,
          subjectDomain: 'Foods and Food Service Systems' as NDLESubject,
          subjectShort: 'Foods & Food Service',
          topic,
        };
      }

      // Default: Clinical & Nutritional Biochemistry (NBCD)
      let topic = 'Medical Nutrition Therapy (MNT)';
      if (combinedText.includes('renal') || combinedText.includes('ckd') || combinedText.includes('dialysis') || combinedText.includes('kidney') || combinedText.includes('burn') || combinedText.includes('curreri')) {
        topic = 'Renal & Critical Care MNT';
      } else if (combinedText.includes('diabetes') || combinedText.includes('insulin') || combinedText.includes('hba1c') || combinedText.includes('somogyi') || combinedText.includes('glycemic')) {
        topic = 'Endocrine & Diabetes MNT';
      } else if (combinedText.includes('enteral') || combinedText.includes('parenteral') || combinedText.includes('tpn') || combinedText.includes('formula') || combinedText.includes('refeeding')) {
        topic = 'Enteral & Parenteral Nutrition';
      } else if (combinedText.includes('vitamin') || combinedText.includes('mineral') || combinedText.includes('biochem') || combinedText.includes('pathway') || combinedText.includes('deficiency')) {
        topic = 'Nutritional Biochemistry & Micronutrients';
      } else if (combinedText.includes('inborn') || combinedText.includes('pku') || combinedText.includes('msud') || combinedText.includes('galactosemia')) {
        topic = 'Inborn Errors of Metabolism';
      } else if (combinedText.includes('gi') || combinedText.includes('dumping') || combinedText.includes('celiac') || combinedText.includes('pancreatitis') || combinedText.includes('hepatic') || combinedText.includes('liver')) {
        topic = 'Gastrointestinal & Hepatic Dietetics';
      }
      return {
        ...card,
        subjectDomain: 'Nutritional Biochemistry and Clinical Dietetics' as NDLESubject,
        subjectShort: 'Clinical & Biochemistry',
        topic,
      };
    };

    // Classify all unique cards into the 3 official NDLE domains
    const classifiedPool = uniqueCards.map(classifyCardForCBLE);

    const nbcdPool = shuffle(classifiedPool.filter((c) => c.subjectDomain === 'Nutritional Biochemistry and Clinical Dietetics'));
    const cphnPool = shuffle(classifiedPool.filter((c) => c.subjectDomain === 'Community and Public Health Nutrition'));
    const ffssPool = shuffle(classifiedPool.filter((c) => c.subjectDomain === 'Foods and Food Service Systems'));

    // Standard board exam session: 100 or 200 questions
    const targetCount = itemCount >= 200 ? 200 : 100;

    // Official Philippine NDLE Board Exam Weights:
    // - 35% Nutritional Biochemistry and Clinical Dietetics (NBCD)
    // - 30% Community and Public Health Nutrition (CPHN)
    // - 35% Foods and Food Service Systems (FFSS)
    const quotaNBCD = Math.round(targetCount * 0.35);
    const quotaCPHN = Math.round(targetCount * 0.30);
    const quotaFFSS = targetCount - quotaNBCD - quotaCPHN;

    // Draw from each pool up to quota
    const selectedNBCD = nbcdPool.slice(0, quotaNBCD);
    const selectedCPHN = cphnPool.slice(0, quotaCPHN);
    const selectedFFSS = ffssPool.slice(0, quotaFFSS);

    // If any pool had fewer questions than target, backfill from other pools
    const combinedExamCards = [...selectedNBCD, ...selectedCPHN, ...selectedFFSS];

    if (combinedExamCards.length < targetCount) {
      const alreadyChosenIds = new Set(combinedExamCards.map((c) => c.id));
      const remainingCandidates = shuffle(classifiedPool.filter((c) => !alreadyChosenIds.has(c.id)));
      const needed = targetCount - combinedExamCards.length;
      combinedExamCards.push(...remainingCandidates.slice(0, needed));
    }

    // Interleave and randomize the balanced questions for a challenging multi-topic exam
    const examCards = shuffle(combinedExamCards);

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
        subject: card.subjectShort || "General Nutrition",
        question: normalizeQuestionStemHeuristics(card.front),
        image: mockMatch?.image,
        options,
        correctAnswer: correctKey,
        explanation:
          card.rationale || `The correct answer is "${card.back}".`,
        category: card.topic || card.category || "Board Exam Review",
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
    const examResultId = `cble-res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await query(`
      INSERT INTO public.cble_exam_results (
        id, examinee_name, examination_name, subject, total_questions,
        correct_count, score_percentage, is_passed, time_spent_seconds,
        user_answers, category_breakdown, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    `, [
      examResultId,
      payload.examineeName,
      payload.examinationName,
      payload.subject,
      payload.totalQuestions,
      payload.correctCount,
      payload.scorePercentage,
      payload.isPassed,
      payload.timeSpentSeconds,
      JSON.stringify(payload.userAnswers || {}),
      JSON.stringify(payload.categoryBreakdown || {}),
    ]);

    return { success: true, id: examResultId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Could not save to cble_exam_results in PostgreSQL:", message);
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

