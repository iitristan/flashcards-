import {
  NDLESubject,
  NDLESubjectPerformance,
  BoardReadinessReport,
  BoardReadinessStatus,
  NDLE_SUBJECT_CONFIGS,
  NDLE_SUBJECT_LIST,
} from "@/types/ndle";
import { Deck, Flashcard, StudyLogEntry } from "@/types";
import { classifyCardHeuristic } from "./ndleClassifierService";

export interface CardAttemptRecord {
  cardId: string;
  subject: NDLESubject;
  isCorrect: boolean;
  timestamp: string; // ISO string
}

/**
 * Resolves the NDLE subject for any card via explicit property, tag matching,
 * deck category, or heuristic fallback.
 */
export function resolveCardSubject(
  card: Flashcard,
  parentDeckCategory?: string
): NDLESubject {
  if (card.ndleSubject && NDLE_SUBJECT_CONFIGS[card.ndleSubject]) {
    return card.ndleSubject;
  }

  const tags = (card.tags || []).map((t) => t.toLowerCase());
  if (tags.some((t) => t === "nbcd" || t.includes("clinical") || t.includes("biochem"))) {
    return "Nutritional Biochemistry and Clinical Dietetics";
  }
  if (tags.some((t) => t === "cphn" || t.includes("public health") || t.includes("community"))) {
    return "Community and Public Health Nutrition";
  }
  if (tags.some((t) => t === "ffss" || t.includes("food service") || t.includes("haccp"))) {
    return "Foods and Food Service Systems";
  }

  // Fallback to heuristic
  const classified = classifyCardHeuristic({
    front: card.front,
    back: card.back,
    rationale: card.rationale,
    tags: card.tags,
    deckCategory: parentDeckCategory,
  });

  return classified.subject;
}

/**
 * Returns all cards strictly belonging to an NDLE subject across all decks.
 */
export function getSubjectCards(
  subjectName: NDLESubject,
  decks: Deck[]
): Flashcard[] {
  const cfg = NDLE_SUBJECT_CONFIGS[subjectName];
  const subjectCards: Flashcard[] = [];

  for (const deck of decks) {
    for (const card of deck.cards || []) {
      if (resolveCardSubject(card, deck.category) === subjectName) {
        subjectCards.push({ ...card, deckId: card.deckId || deck.id });
      }
    }
  }

  // Fallback if no cards resolved through classifier
  if (subjectCards.length === 0 && cfg) {
    for (const deck of decks) {
      if (deck.category && deck.category.toLowerCase().includes(cfg.code.toLowerCase())) {
        subjectCards.push(...(deck.cards || []));
      }
    }
  }

  if (subjectCards.length === 0 && decks.length > 0) {
    subjectCards.push(...(decks[0].cards || []));
  }

  return subjectCards;
}

/**
 * Strictly calculates the list of missed / wrong cards for a specific NDLE subject.
 * Accurately tracks the most recent attempt per card so answered/corrected cards
 * are immediately removed from the missed queue.
 */
export function getSubjectMissedCards(
  subjectName: NDLESubject,
  decks: Deck[],
  reviewLogs: StudyLogEntry[] = [],
  checkpointResults?: Array<{ cardId: string; isCorrect: boolean; rating?: string }>,
  activeSessionResults?: Array<{ cardId: string; isCorrect: boolean; rating?: string }>
): Flashcard[] {
  const subjectCards = getSubjectCards(subjectName, decks);
  if (subjectCards.length === 0) return [];

  // 1. Build a map of the latest active session result for each card
  const activeMap = new Map<string, { isCorrect: boolean; rating?: string }>();
  if (activeSessionResults && activeSessionResults.length > 0) {
    for (const r of activeSessionResults) {
      activeMap.set(r.cardId, r);
    }
  }

  // 2. Build a map of the latest checkpoint result for each card
  const checkpointMap = new Map<string, { isCorrect: boolean; rating?: string }>();
  if (checkpointResults && checkpointResults.length > 0) {
    for (const r of checkpointResults) {
      checkpointMap.set(r.cardId, r);
    }
  }

  // 3. Build a map of the most recent review log for each card
  // Sort chronologically so the latest entry overwrites older ones
  const latestLogMap = new Map<string, StudyLogEntry>();
  if (reviewLogs && reviewLogs.length > 0) {
    const sortedLogs = [...reviewLogs].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
      return timeA - timeB;
    });
    for (const log of sortedLogs) {
      latestLogMap.set(log.cardId, log);
    }
  }

  return subjectCards.filter((c) => {
    // Priority 1: Current active session result (most recent in-memory attempt)
    if (activeMap.has(c.id)) {
      const r = activeMap.get(c.id)!;
      return !r.isCorrect || r.rating === 'again' || r.rating === 'hard';
    }

    // Priority 2: In-progress checkpoint result
    if (checkpointMap.has(c.id)) {
      const r = checkpointMap.get(c.id)!;
      return !r.isCorrect || r.rating === 'again' || r.rating === 'hard';
    }

    // Priority 3: Historical review logs (most recent attempt)
    if (latestLogMap.has(c.id)) {
      const log = latestLogMap.get(c.id)!;
      return !log.isCorrect || log.rating === 'again' || log.rating === 'hard';
    }

    // Priority 4: SM-2 state fallback if card was reviewed previously
    if (c.lastReviewedAt) {
      return (c.sm2?.repetitions || 0) === 0;
    }

    // Unseen / new card
    return false;
  });
}


/**
 * 1. Volume Factor (V):
 * Lower confidence when sample size is small (< 30 items per subject).
 * V = min(1.0, N / 30)
 */
export function calculateVolumeFactor(totalAttempts: number): number {
  if (totalAttempts <= 0) return 0;
  return Math.min(1.0, Number((totalAttempts / 30).toFixed(3)));
}

/**
 * 2. Consistency Factor (C):
 * Penalizes volatile flip-flopping between right and wrong answers;
 * rewards sustained streaks of correct answers.
 */
export function calculateConsistencyFactor(
  attempts: Array<{ isCorrect: boolean; timestamp: string }>
): { consistencyFactor: number; flipCount: number; currentStreak: number } {
  if (attempts.length === 0) {
    return { consistencyFactor: 0.5, flipCount: 0, currentStreak: 0 };
  }

  // Sort chronologically (oldest to newest)
  const sorted = [...attempts].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let flipCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].isCorrect !== sorted[i - 1].isCorrect) {
      flipCount++;
    }
  }

  const maxPossibleFlips = Math.max(1, sorted.length - 1);
  const flipRate = flipCount / maxPossibleFlips;

  // Current streak (from most recent attempt backwards)
  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].isCorrect) {
      currentStreak++;
    } else {
      break;
    }
  }

  const streakBonus = Math.min(1.0, currentStreak / 5);

  // Baseline 0.55; high flip penalty reduces score; streak adds bonus
  const rawConsistency = 0.55 - 0.45 * flipRate + 0.45 * streakBonus;
  const consistencyFactor = Math.max(0.1, Math.min(1.0, Number(rawConsistency.toFixed(3))));

  return { consistencyFactor, flipCount, currentStreak };
}

/**
 * 3. Recency Factor (R) and Recency-Weighted Accuracy:
 * Weights recent attempts more heavily than older ones using exponential decay.
 */
export function calculateRecencyMetrics(
  attempts: Array<{ isCorrect: boolean; timestamp: string }>
): {
  recencyFactor: number;
  recencyWeightedAccuracy: number;
  lastAttemptDate: string | null;
} {
  if (attempts.length === 0) {
    return { recencyFactor: 0.3, recencyWeightedAccuracy: 0, lastAttemptDate: null };
  }

  const now = Date.now();
  const sorted = [...attempts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const lastAttemptDate = sorted[0].timestamp;

  // Days since most recent attempt
  const daysSinceLast = Math.max(
    0,
    (now - new Date(lastAttemptDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Freshness decay factor (half-life ~ 30 days)
  const recencyFactor = Math.max(0.2, Math.min(1.0, Math.exp(-daysSinceLast / 30)));

  // Recency-weighted accuracy
  let weightSum = 0;
  let weightedCorrectSum = 0;

  for (const attempt of attempts) {
    const ageDays = Math.max(
      0,
      (now - new Date(attempt.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );
    // Exponential weight: 21-day time constant
    const weight = Math.exp(-ageDays / 21);
    weightSum += weight;
    if (attempt.isCorrect) {
      weightedCorrectSum += weight;
    }
  }

  const recencyWeightedAccuracy =
    weightSum > 0 ? Number(((weightedCorrectSum / weightSum) * 100).toFixed(1)) : 0;

  return {
    recencyFactor: Number(recencyFactor.toFixed(3)),
    recencyWeightedAccuracy,
    lastAttemptDate,
  };
}

/**
 * Calculates Confidence Index (0.0 to 1.0) combining Volume, Consistency, and Recency
 */
export function calculateConfidenceIndex(
  volumeFactor: number,
  consistencyFactor: number,
  recencyFactor: number
): number {
  if (volumeFactor <= 0) return 0;
  // Volume strongly bounds maximum possible confidence
  const quality = 0.45 * consistencyFactor + 0.55 * recencyFactor;
  const index = volumeFactor * quality;
  return Math.max(0, Math.min(1.0, Number(index.toFixed(2))));
}

/**
 * Calculates Single Subject Performance
 */
export function calculateSubjectPerformance(
  subject: NDLESubject,
  attempts: Array<{ isCorrect: boolean; timestamp: string }>
): NDLESubjectPerformance {
  const config = NDLE_SUBJECT_CONFIGS[subject];
  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;

  const rawAccuracy =
    totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
  const accuracy = Number(rawAccuracy.toFixed(1));

  const volumeFactor = calculateVolumeFactor(totalAttempts);
  const { consistencyFactor, flipCount, currentStreak } =
    calculateConsistencyFactor(attempts);
  const { recencyFactor, lastAttemptDate } = calculateRecencyMetrics(attempts);

  const confidenceIndex = calculateConfidenceIndex(
    volumeFactor,
    consistencyFactor,
    recencyFactor
  );

  const weightedScore = Number((config.weight * accuracy).toFixed(2));
  const isConditionedRisk = totalAttempts >= 5 && accuracy <= 50.0;
  const isSafelyPassing = accuracy > 60.0;

  let statusBadge: NDLESubjectPerformance["statusBadge"];
  if (totalAttempts < 5) {
    statusBadge = { label: "Needs Data", emoji: "📊", variant: "neutral" };
  } else if (isConditionedRisk) {
    statusBadge = { label: "Conditioned Risk", emoji: "⚠️", variant: "danger" };
  } else if (accuracy >= 75) {
    statusBadge = { label: "Board Ready", emoji: "🎉", variant: "success" };
  } else if (accuracy >= 60) {
    statusBadge = { label: "Borderline", emoji: "📈", variant: "warning" };
  } else {
    statusBadge = { label: "Vulnerable", emoji: "🚨", variant: "danger" };
  }

  return {
    subject,
    code: config.code,
    weight: config.weight,
    weightPercentage: config.weightPercentage,
    totalAttempts,
    correctAttempts,
    accuracy,
    weightedScore,
    confidenceIndex,
    volumeFactor,
    consistencyFactor,
    recencyFactor,
    currentStreak,
    flipCount,
    lastAttemptDate,
    isConditionedRisk,
    isSafelyPassing,
    statusBadge,
  };
}

/**
 * PRC NDLE General Weighted Average (GWA):
 * GWA = (0.35 * Clinical) + (0.30 * Community) + (0.35 * Food Service)
 */
export function calculateGWA(
  breakdown: Record<NDLESubject, NDLESubjectPerformance>
): number {
  const clinical = breakdown["Nutritional Biochemistry and Clinical Dietetics"].accuracy;
  const community = breakdown["Community and Public Health Nutrition"].accuracy;
  const foodService = breakdown["Foods and Food Service Systems"].accuracy;

  const gwa = 0.35 * clinical + 0.30 * community + 0.35 * foodService;
  return Number(gwa.toFixed(1));
}

/**
 * Passing Probability (%):
 * Dynamic prediction scaled by the Confidence Index.
 * High confidence + GWA >= 75% -> approaches >= 80-90%.
 * Severe penalty if any subject is <= 50% (PRC conditioned threshold).
 */
export function calculatePassingProbability(
  gwa: number,
  overallConfidence: number,
  hasConditionedSubject: boolean,
  totalAttempts: number
): number {
  if (totalAttempts < 5) {
    return 50; // Neutral baseline when insufficient data
  }

  // Sigmoidal probability curve centered at 75% passing threshold
  const k = 0.14; // Slope steepness
  const delta = gwa - 75;
  const rawProb = 1 / (1 + Math.exp(-k * delta)); // 0.0 to 1.0

  // Probability percentage: 10% to 95%
  const basePercent = 10 + rawProb * 85;

  // Scale deviation from 50% baseline by confidence index
  const confidenceMultiplier = Math.pow(Math.max(0.1, overallConfidence), 0.65);
  let passingProb = 50 + (basePercent - 50) * confidenceMultiplier;

  // PRC Conditioned Rule: By law, any score below 50% in any subject results in Conditioned / Failed
  if (hasConditionedSubject) {
    passingProb = Math.min(passingProb, 42); // Bound at high-risk failing probability
  }

  return Math.max(5, Math.min(98, Math.round(passingProb)));
}

/**
 * Determine Board Readiness Status based on PRC licensure rules:
 * - Ready: GWA >= 75% and every subject is safely > 60%
 * - Approaching Readiness: GWA is 65% - 74%, or any subject is near danger zone (51% - 60%)
 * - At Risk / Conditioned Alert: Any subject drops <= 50%
 */
export function determineBoardReadinessStatus(
  gwa: number,
  breakdown: Record<NDLESubject, NDLESubjectPerformance>,
  totalAttempts: number
): {
  status: BoardReadinessStatus;
  statusLabel: string;
  statusEmoji: string;
  statusDescription: string;
  hasConditionedSubject: boolean;
  conditionedSubjectNames: string[];
} {
  const conditionedSubjectNames: string[] = [];
  let anySubjectNearingDanger = false;
  let allSafelyPassing = true;

  for (const sub of NDLE_SUBJECT_LIST) {
    const perf = breakdown[sub];
    if (perf.totalAttempts >= 5 && perf.accuracy <= 50.0) {
      conditionedSubjectNames.push(perf.subject);
    }
    if (perf.totalAttempts >= 5 && perf.accuracy <= 60.0) {
      anySubjectNearingDanger = true;
    }
    if (perf.accuracy <= 60.0) {
      allSafelyPassing = false;
    }
  }

  const hasConditionedSubject = conditionedSubjectNames.length > 0;

  if (totalAttempts < 10) {
    return {
      status: "gathering_data",
      statusLabel: "Gathering Exam Data",
      statusEmoji: "📊",
      statusDescription:
        "Complete at least 10 practice questions across all 3 subjects to generate board readiness insights.",
      hasConditionedSubject: false,
      conditionedSubjectNames: [],
    };
  }

  if (hasConditionedSubject) {
    return {
      status: "conditioned_alert",
      statusLabel: "At Risk / Conditioned Alert",
      statusEmoji: "⚠️",
      statusDescription: `PRC NDLE requires at least 50% in every subject. ${conditionedSubjectNames.join(
        ", "
      )} is currently below the 50% passing threshold!`,
      hasConditionedSubject: true,
      conditionedSubjectNames,
    };
  }

  if (gwa >= 75 && allSafelyPassing) {
    return {
      status: "ready",
      statusLabel: "Board Ready",
      statusEmoji: "🎉",
      statusDescription:
        "Outstanding! Your General Weighted Average is above 75% and all 3 NDLE subjects meet passing standards.",
      hasConditionedSubject: false,
      conditionedSubjectNames: [],
    };
  }

  if (gwa >= 65 || anySubjectNearingDanger) {
    return {
      status: "approaching",
      statusLabel: "Needs reinforcement",
      statusEmoji: "😐",
      statusDescription:
        "On track but requires reinforcement. Target your lowest scoring subject to secure a comfortable buffer above 75%.",
      hasConditionedSubject: false,
      conditionedSubjectNames: [],
    };
  }

  return {
    status: "conditioned_alert",
    statusLabel: "At Risk / Low Average",
    statusEmoji: "⚠️",
    statusDescription:
      "Current GWA is below 65%. High-yield practice and concept review recommended across all subjects.",
    hasConditionedSubject: false,
    conditionedSubjectNames: [],
  };
}

/**
 * Main Engine Function: Evaluates all decks, flashcards, review logs, and CBLE results
 * to generate the comprehensive NDLE Board Readiness Report.
 */
export function generateBoardReadinessReport(
  decks: Deck[],
  reviewLogs: StudyLogEntry[] = [],
  cbleAttempts: Array<{
    subject: string;
    isCorrect: boolean;
    timestamp?: string;
  }> = []
): BoardReadinessReport {
  // 1. Build Card-to-Subject Map
  const cardSubjectMap = new Map<string, NDLESubject>();
  let totalCardsTracked = 0;

  for (const deck of decks) {
    for (const card of deck.cards || []) {
      totalCardsTracked++;
      const subject = resolveCardSubject(card, deck.category);
      cardSubjectMap.set(card.id, subject);
    }
  }

  // 2. Group all attempts by NDLE Subject
  const subjectAttempts: Record<
    NDLESubject,
    Array<{ isCorrect: boolean; timestamp: string }>
  > = {
    "Nutritional Biochemistry and Clinical Dietetics": [],
    "Community and Public Health Nutrition": [],
    "Foods and Food Service Systems": [],
  };

  // 2A. Ingest study logs from flashcard reviews
  for (const log of reviewLogs) {
    const subject = cardSubjectMap.get(log.cardId);
    if (subject && subjectAttempts[subject]) {
      subjectAttempts[subject].push({
        isCorrect: log.isCorrect,
        timestamp: log.timestamp || log.createdAt || new Date().toISOString(),
      });
    }
  }

  // 2B. Ingest CBLE exam attempts if present
  for (const cble of cbleAttempts) {
    let matchedSubject: NDLESubject | null = null;
    const sLower = (cble.subject || "").toLowerCase();

    if (sLower.includes("nbcd") || sLower.includes("clinical") || sLower.includes("biochem")) {
      matchedSubject = "Nutritional Biochemistry and Clinical Dietetics";
    } else if (sLower.includes("cphn") || sLower.includes("community") || sLower.includes("public health")) {
      matchedSubject = "Community and Public Health Nutrition";
    } else if (sLower.includes("ffss") || sLower.includes("food service") || sLower.includes("preservation")) {
      matchedSubject = "Foods and Food Service Systems";
    }

    if (matchedSubject && subjectAttempts[matchedSubject]) {
      subjectAttempts[matchedSubject].push({
        isCorrect: cble.isCorrect,
        timestamp: cble.timestamp || new Date().toISOString(),
      });
    }
  }

  // 2C. Fallback: If no review logs exist yet, derive initial attempt history from card SM2 data
  const hasAnyLogs =
    subjectAttempts["Nutritional Biochemistry and Clinical Dietetics"].length > 0 ||
    subjectAttempts["Community and Public Health Nutrition"].length > 0 ||
    subjectAttempts["Foods and Food Service Systems"].length > 0;

  if (!hasAnyLogs) {
    for (const deck of decks) {
      for (const card of deck.cards || []) {
        if (card.lastReviewedAt || (card.sm2 && card.sm2.repetitions > 0)) {
          const subject = cardSubjectMap.get(card.id) || "Nutritional Biochemistry and Clinical Dietetics";
          const isMastered = (card.sm2?.interval || 0) >= 4 || (card.sm2?.repetitions || 0) >= 2;
          subjectAttempts[subject].push({
            isCorrect: isMastered,
            timestamp: card.lastReviewedAt || card.updatedAt || card.createdAt,
          });
        }
      }
    }
  }

  // 3. Calculate Performance Breakdown per Subject
  const breakdown: Record<NDLESubject, NDLESubjectPerformance> = {
    "Nutritional Biochemistry and Clinical Dietetics": calculateSubjectPerformance(
      "Nutritional Biochemistry and Clinical Dietetics",
      subjectAttempts["Nutritional Biochemistry and Clinical Dietetics"]
    ),
    "Community and Public Health Nutrition": calculateSubjectPerformance(
      "Community and Public Health Nutrition",
      subjectAttempts["Community and Public Health Nutrition"]
    ),
    "Foods and Food Service Systems": calculateSubjectPerformance(
      "Foods and Food Service Systems",
      subjectAttempts["Foods and Food Service Systems"]
    ),
  };

  // 4. Calculate Aggregate Metrics
  const totalAttempts =
    breakdown["Nutritional Biochemistry and Clinical Dietetics"].totalAttempts +
    breakdown["Community and Public Health Nutrition"].totalAttempts +
    breakdown["Foods and Food Service Systems"].totalAttempts;

  const totalCorrect =
    breakdown["Nutritional Biochemistry and Clinical Dietetics"].correctAttempts +
    breakdown["Community and Public Health Nutrition"].correctAttempts +
    breakdown["Foods and Food Service Systems"].correctAttempts;

  const overallAccuracy =
    totalAttempts > 0 ? Number(((totalCorrect / totalAttempts) * 100).toFixed(1)) : 0;

  // Weighted overall confidence
  const overallConfidenceIndex = Number(
    (
      0.35 * breakdown["Nutritional Biochemistry and Clinical Dietetics"].confidenceIndex +
      0.30 * breakdown["Community and Public Health Nutrition"].confidenceIndex +
      0.35 * breakdown["Foods and Food Service Systems"].confidenceIndex
    ).toFixed(2)
  );

  const gwa = calculateGWA(breakdown);

  const {
    status,
    statusLabel,
    statusEmoji,
    statusDescription,
    hasConditionedSubject,
    conditionedSubjectNames,
  } = determineBoardReadinessStatus(gwa, breakdown, totalAttempts);

  const passingProbability = calculatePassingProbability(
    gwa,
    overallConfidenceIndex,
    hasConditionedSubject,
    totalAttempts
  );

  return {
    gwa,
    passingProbability,
    overallAccuracy,
    totalAttempts,
    totalCorrect,
    totalCardsTracked,
    overallConfidenceIndex,
    status,
    statusLabel,
    statusEmoji,
    statusDescription,
    hasConditionedSubject,
    conditionedSubjectNames,
    subjectBreakdown: breakdown,
    generatedAt: new Date().toISOString(),
  };
}
