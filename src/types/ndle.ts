export type NDLESubject =
  | 'Nutritional Biochemistry and Clinical Dietetics'
  | 'Community and Public Health Nutrition'
  | 'Foods and Food Service Systems';

export type NDLESubjectCode = 'NBCD' | 'CPHN' | 'FFSS';

export interface NDLESubjectConfig {
  name: NDLESubject;
  code: NDLESubjectCode;
  weight: number; // e.g. 0.35, 0.30, 0.35
  weightPercentage: number; // 35, 30, 35
  shortTitle: string;
  description: string;
  color: string;
  barColor: string;
  bgLight: string;
  borderColor: string;
}

export const NDLE_SUBJECT_CONFIGS: Record<NDLESubject, NDLESubjectConfig> = {
  'Nutritional Biochemistry and Clinical Dietetics': {
    name: 'Nutritional Biochemistry and Clinical Dietetics',
    code: 'NBCD',
    weight: 0.35,
    weightPercentage: 35,
    shortTitle: 'Clinical & Biochemistry',
    description: 'Nutrient metabolism, Medical Nutrition Therapy (MNT), clinical formulas, enteral/parenteral nutrition, pathology.',
    color: '#059669', // Emerald
    barColor: '#22c55e',
    bgLight: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  'Community and Public Health Nutrition': {
    name: 'Community and Public Health Nutrition',
    code: 'CPHN',
    weight: 0.30,
    weightPercentage: 30,
    shortTitle: 'Community & Public Health',
    description: 'Assessment tools, PPAN/NNC nutrition policies, epidemiology, maternal/child nutrition, public health programs.',
    color: '#2563eb', // Blue
    barColor: '#3b82f6',
    bgLight: 'rgba(37, 99, 235, 0.1)',
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  'Foods and Food Service Systems': {
    name: 'Foods and Food Service Systems',
    code: 'FFSS',
    weight: 0.35,
    weightPercentage: 35,
    shortTitle: 'Foods & Food Service',
    description: 'Food science/chemistry, recipe costing/standardization, menu planning, HACCP, food service administration.',
    color: '#d97706', // Amber
    barColor: '#f59e0b',
    bgLight: 'rgba(217, 119, 6, 0.1)',
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
};

export const NDLE_SUBJECT_LIST: NDLESubject[] = [
  'Nutritional Biochemistry and Clinical Dietetics',
  'Community and Public Health Nutrition',
  'Foods and Food Service Systems',
];

export interface NDLESubjectPerformance {
  subject: NDLESubject;
  code: NDLESubjectCode;
  weight: number;
  weightPercentage: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number; // 0 to 100 %
  weightedScore: number; // weight * accuracy
  confidenceIndex: number; // 0.0 to 1.0
  volumeFactor: number; // min(1.0, totalAttempts / 30)
  consistencyFactor: number; // streak bonus vs flip-flop penalty
  recencyFactor: number; // recent attempt weighting
  currentStreak: number;
  flipCount: number;
  lastAttemptDate: string | null;
  isConditionedRisk: boolean; // accuracy <= 50% with attempts >= 5
  isSafelyPassing: boolean; // accuracy > 60%
  statusBadge: {
    label: string;
    emoji: string;
    variant: 'success' | 'warning' | 'danger' | 'neutral';
  };
}

export type BoardReadinessStatus =
  | 'ready'
  | 'approaching'
  | 'conditioned_alert'
  | 'gathering_data';

export interface BoardReadinessReport {
  gwa: number; // General Weighted Average (0 to 100)
  passingProbability: number; // Dynamic prediction scaled by Confidence (0 to 100)
  overallAccuracy: number; // (Total Correct / Total Attempts) * 100
  totalAttempts: number;
  totalCorrect: number;
  totalCardsTracked: number;
  overallConfidenceIndex: number; // 0.0 to 1.0
  status: BoardReadinessStatus;
  statusLabel: string;
  statusEmoji: string;
  statusDescription: string;
  hasConditionedSubject: boolean;
  conditionedSubjectNames: string[];
  subjectBreakdown: Record<NDLESubject, NDLESubjectPerformance>;
  generatedAt: string;
}

export interface NDLEClassificationResult {
  subject: NDLESubject;
  confidence: number; // 0.0 to 1.0
  reasoning: string;
  source: 'ai' | 'heuristic' | 'tag' | 'override';
}
