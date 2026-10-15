export type StudyMode = 'spaced-repetition' | 'multiple-choice' | 'identification' | 'blitz-marathon';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type ThemeType = 'matcha' | 'strawberry' | 'navy' | 'dark';

export type DeckCategory = 
  | 'Clinical Nutrition'
  | 'Nutritional Biochemistry'
  | 'Food Service Systems'
  | 'Public Health & Community'
  | 'Maternal & Child Nutrition'
  | 'General Dietetics';

export const DECK_CATEGORIES: DeckCategory[] = [
  'Clinical Nutrition',
  'Nutritional Biochemistry',
  'Food Service Systems',
  'Public Health & Community',
  'Maternal & Child Nutrition',
  'General Dietetics'
];

export interface CategoryInfo {
  name: DeckCategory;
  label: string;
  icon: string;
  emoji: string;
  color: string;
  description: string;
}

export const CATEGORY_CONFIG: Record<DeckCategory, CategoryInfo> = {
  'Clinical Nutrition': {
    name: 'Clinical Nutrition',
    label: 'Clinical Nutrition',
    icon: 'Stethoscope',
    emoji: '🩺',
    color: '#7FA98B',
    description: 'Medical Nutrition Therapy, Clinical Assessments & Pathophysiology'
  },
  'Nutritional Biochemistry': {
    name: 'Nutritional Biochemistry',
    label: 'Nutritional Biochemistry',
    icon: 'Sparkles',
    emoji: '✨',
    color: '#FF9A76',
    description: 'Micronutrients, Metabolic Pathways & Biochemistry'
  },
  'Food Service Systems': {
    name: 'Food Service Systems',
    label: 'Food Service Systems',
    icon: 'Calculator',
    emoji: '🍱',
    color: '#D4A373',
    description: 'Food Sanitation, Production, Calculations & Management'
  },
  'Public Health & Community': {
    name: 'Public Health & Community',
    label: 'Public Health & Community',
    icon: 'BookOpen',
    emoji: '🌐',
    color: '#76B39D',
    description: 'Community Programs, Epidemiology & Public Nutrition'
  },
  'Maternal & Child Nutrition': {
    name: 'Maternal & Child Nutrition',
    label: 'Maternal & Child Nutrition',
    icon: 'Heart',
    emoji: '👶',
    color: '#F38BA0',
    description: 'Pediatrics, Maternal Care & Life Stages'
  },
  'General Dietetics': {
    name: 'General Dietetics',
    label: 'General Dietetics',
    icon: 'Apple',
    emoji: '🍎',
    color: '#8B5CF6',
    description: 'Fundamentals, Ethics & Comprehensive Dietetics'
  }
};

export interface Sm2Data {
  interval: number; // in days
  easeFactor: number; // default 2.5
  repetitions: number;
  dueDate: string; // ISO string
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string; // Question / Concept / Prompt
  back: string; // Correct Answer / Key Term
  rationale: string; // Detailed clinical or exam rationale & key takeaway
  options?: string[]; // 4 options for Multiple Choice mode (including the correct answer)
  tags: string[]; // e.g. ["CKD", "Renal", "MNT"]
  ndleSubject?: import('./ndle').NDLESubject; // Canonical PRC NDLE Subject
  practiceAreaId?: string; // Explicit assignment to a practice area
  unassigned?: boolean; // True if card is unassigned from practice areas
  difficulty?: 'easy' | 'medium' | 'hard';
  leitnerBox?: number; // 1 to 5 (ARtLS box)
  userNotes?: string; // User personal notes / mnemonics per item
  sm2: Sm2Data;
  aiExplanation?: import('./gemini').MCExplanationResponse;
  lastReviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}


export interface DeckStats {
  totalCards: number;
  dueToday: number;
  masteredCards: number; // Cards with interval >= 21 days or repetitions >= 3
  learningCards: number;
  newCards: number;
  averageAccuracy: number; // 0 to 100
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  category: DeckCategory;
  icon: string; // Emoji or Lucide icon identifier
  color: string; // Tailwind color token or hex
  tags: string[];
  cards: Flashcard[];
  stats?: DeckStats;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeckPlaylist {
  id: string;
  title: string;
  description: string;
  deckIds: string[];
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardReviewResult {
  cardId: string;
  userAnswer?: string;
  isCorrect: boolean;
  rating?: ReviewRating;
  timeSpentSeconds: number;
  verdict?: 'correct' | 'partially_correct' | 'incorrect';
  feedback?: string;
}

export type CardStage = 'new' | 'learning' | 'developing' | 'mastered';

export type SparkleStyle = 'clinical' | 'vibrant' | 'cosmic' | 'minimal';

export type CardDesign = 'modern' | 'compact' | 'classic';

export type CardSortOption = 'default' | 'progress-asc' | 'progress-desc' | 'difficulty' | 'alphabetical' | 'most-reviewed';

export type CardFilterOption = 'all' | 'unseen' | 'learning' | 'developing' | 'mastered' | 'due' | 'wrong';

export interface CardGroupFilterItem {
  id: string;
  label: string;
  tag: string;
  enabled: boolean;
}

export interface CardGroupFilterConfig {
  id: string; // e.g. 'nbcd', 'cphn', 'ffss', 'maternal', 'general'
  name: string;
  ndleSubject?: import('./ndle').NDLESubject;
  category?: DeckCategory;
  color: string;
  icon: string;
  description: string;
  activeSort: CardSortOption;
  stageFilter: CardFilterOption;
  filters: CardGroupFilterItem[];
  searchQuery?: string;
}

export const DEFAULT_CARD_GROUP_FILTERS: Record<string, CardGroupFilterConfig> = {
  nbcd: {
    id: 'nbcd',
    name: 'Clinical Nutrition & Biochemistry',
    ndleSubject: 'Nutritional Biochemistry and Clinical Dietetics',
    category: 'Clinical Nutrition',
    color: '#059669',
    icon: 'Stethoscope',
    description: 'Medical Nutrition Therapy, Clinical Assessments & Pathophysiology',
    activeSort: 'default',
    stageFilter: 'all',
    filters: [
      { id: 'nbcd-mnt', label: 'Medical Nutrition Therapy (MNT)', tag: 'mnt', enabled: true },
      { id: 'nbcd-renal', label: 'Renal & Kidney Disease', tag: 'renal', enabled: true },
      { id: 'nbcd-enteral', label: 'Enteral & Parenteral Nutrition', tag: 'parenteral', enabled: true },
      { id: 'nbcd-biochem', label: 'Biochemistry & Metabolic Pathways', tag: 'biochem', enabled: true },
      { id: 'nbcd-diabetes', label: 'Diabetes & Endocrine Care', tag: 'diabetes', enabled: true },
      { id: 'nbcd-assessment', label: 'Clinical Assessment & Diagnostics', tag: 'assessment', enabled: true },
    ]
  },
  cphn: {
    id: 'cphn',
    name: 'Community & Public Health Nutrition',
    ndleSubject: 'Community and Public Health Nutrition',
    category: 'Public Health & Community',
    color: '#2563eb',
    icon: 'Globe',
    description: 'Community Programs, Epidemiology, Maternal/Child & Public Health',
    activeSort: 'default',
    stageFilter: 'all',
    filters: [
      { id: 'cphn-public', label: 'Public Health Programs', tag: 'public health', enabled: true },
      { id: 'cphn-maternal', label: 'Maternal Nutrition', tag: 'maternal', enabled: true },
      { id: 'cphn-child', label: 'Pediatrics & Child Nutrition', tag: 'child', enabled: true },
      { id: 'cphn-ppan', label: 'PPAN & NNC Framework', tag: 'ppan', enabled: true },
      { id: 'cphn-epi', label: 'Nutritional Epidemiology', tag: 'epidemiology', enabled: true },
      { id: 'cphn-anthro', label: 'Anthropometric Assessments', tag: 'anthropometry', enabled: true },
    ]
  },
  ffss: {
    id: 'ffss',
    name: 'Foods & Food Service Systems',
    ndleSubject: 'Foods and Food Service Systems',
    category: 'Food Service Systems',
    color: '#d97706',
    icon: 'UtensilsCrossed',
    description: 'Food Sanitation, Production, Recipe Costing, Menu Planning & HACCP',
    activeSort: 'default',
    stageFilter: 'all',
    filters: [
      { id: 'ffss-haccp', label: 'HACCP & Food Safety', tag: 'haccp', enabled: true },
      { id: 'ffss-costing', label: 'Recipe Costing & Yields', tag: 'costing', enabled: true },
      { id: 'ffss-production', label: 'Food Production & Preparation', tag: 'production', enabled: true },
      { id: 'ffss-menu', label: 'Menu Planning & Procurement', tag: 'menu', enabled: true },
      { id: 'ffss-chemistry', label: 'Food Science & Food Chemistry', tag: 'food science', enabled: true },
      { id: 'ffss-admin', label: 'Food Service Administration', tag: 'food service', enabled: true },
    ]
  },
  maternal: {
    id: 'maternal',
    name: 'Maternal & Child Nutrition',
    category: 'Maternal & Child Nutrition',
    color: '#F38BA0',
    icon: 'Heart',
    description: 'Lactation, Pregnancy, Infant Feeding & Pediatric Milestones',
    activeSort: 'default',
    stageFilter: 'all',
    filters: [
      { id: 'mat-prenatal', label: 'Prenatal & Gestational Diet', tag: 'pregnancy', enabled: true },
      { id: 'mat-lactation', label: 'Lactation & Human Milk', tag: 'lactation', enabled: true },
      { id: 'mat-infant', label: 'Infant Feeding Guidelines', tag: 'infant', enabled: true },
      { id: 'mat-toddler', label: 'Toddler & Child Milestones', tag: 'child', enabled: true },
    ]
  },
  general: {
    id: 'general',
    name: 'General Dietetics & Board Essentials',
    category: 'General Dietetics',
    color: '#8B5CF6',
    icon: 'Apple',
    description: 'Core Dietetics Fundamentals, Ethics & Comprehensive Review',
    activeSort: 'default',
    stageFilter: 'all',
    filters: [
      { id: 'gen-ethics', label: 'Code of Ethics & Regulatory Laws', tag: 'ethics', enabled: true },
      { id: 'gen-dri', label: 'DRIs, RDAs & Nutrient Requirements', tag: 'dri', enabled: true },
      { id: 'gen-counseling', label: 'Counseling & Behavior Change', tag: 'counseling', enabled: true },
    ]
  }
};

export interface CardProgressInfo {
  stage: CardStage;
  label: string;
  stageLabel: string;
  badge: string;
  color: string;
  dotColor: string;
  intervalDays: number;
  repetitions: number;
  totalReviews: number;
  isPracticed: boolean;
  box: number;
  leitnerBox: number;
  isDue: boolean;
}

export function getCardProgressInfo(card: Flashcard): CardProgressInfo {
  const reps = card.sm2?.repetitions || 0;
  const interval = card.sm2?.interval || 0;
  const isPracticed = Boolean(card.lastReviewedAt || reps > 0);
  const box = card.leitnerBox || (reps === 0 ? 1 : Math.min(5, reps + 1));
  const isDue = Boolean(card.sm2?.dueDate && new Date(card.sm2.dueDate) <= new Date());
  const totalReviews = reps;

  if (!isPracticed || reps === 0) {
    return {
      stage: 'new',
      label: 'Unseen / New',
      stageLabel: 'Unseen',
      badge: '🆕 Unseen',
      color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      dotColor: 'bg-slate-400',
      intervalDays: interval,
      repetitions: reps,
      totalReviews,
      isPracticed: false,
      box: 1,
      leitnerBox: 1,
      isDue
    };
  }

  if (interval >= 21 || reps >= 4) {
    const finalBox = Math.max(4, box);
    return {
      stage: 'mastered',
      label: 'Mastered',
      stageLabel: 'Mastered',
      badge: '🏆 Mastered',
      color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      dotColor: 'bg-emerald-500',
      intervalDays: interval,
      repetitions: reps,
      totalReviews,
      isPracticed: true,
      box: finalBox,
      leitnerBox: finalBox,
      isDue
    };
  }

  if (interval >= 4 || reps >= 2) {
    const finalBox = Math.max(3, box);
    return {
      stage: 'developing',
      label: 'Developing / Proficient',
      stageLabel: 'Developing',
      badge: '📈 Developing',
      color: 'text-teal-700 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      dotColor: 'bg-teal-500',
      intervalDays: interval,
      repetitions: reps,
      totalReviews,
      isPracticed: true,
      box: finalBox,
      leitnerBox: finalBox,
      isDue
    };
  }

  const finalBox = Math.max(2, box);
  return {
    stage: 'learning',
    label: 'In Learning',
    stageLabel: 'In Learning',
    badge: '🔄 Learning',
    color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    intervalDays: interval,
    repetitions: reps,
    totalReviews,
    isPracticed: true,
    box: finalBox,
    leitnerBox: finalBox,
    isDue
  };
}

export interface StudySessionState {
  id?: string;
  deckId: string;
  deckTitle: string;
  practiceArea?: import('./ndle').NDLESubject; // Canonical PRC NDLE Practice Area
  activeSort?: CardSortOption;
  activeFilter?: CardFilterOption;
  searchFilter?: string;
  sparkleStyle?: SparkleStyle;
  mode: StudyMode;
  cardsQueue: Flashcard[];
  currentIndex: number;
  results: CardReviewResult[];
  startTime: number;
  isCompleted: boolean;
  timerDurationSeconds: number; // 0 for off, or 10, 15, 20, 25, 30
  updatedAt?: string;
}

export interface StudyLogEntry {
  id?: string;
  userId?: string;
  cardId: string;
  deckId: string;
  mode: StudyMode;
  rating?: ReviewRating;
  userAnswer?: string;
  isCorrect: boolean;
  timeSpentSeconds?: number;
  verdict?: 'correct' | 'partially_correct' | 'incorrect';
  createdAt?: string;
  timestamp?: string;
}

export interface UserPreferences {
  theme: ThemeType;
  sparkleStyle?: SparkleStyle;
  cardDesign?: CardDesign;
  timerDuration: number; // 0 = off, 10, 15, 20, 25, 30
  soundEnabled: boolean;
  autoFlip: boolean;
  dailyGoal: number; // cards per day
  studyStreak: number;
  lastStudyDate: string | null;
  geminiApiKey?: string;
}

export interface AIGradeResponse {
  verdict: 'correct' | 'partially_correct' | 'incorrect';
  score: number; // 0 to 100
  feedback: string; // Concise, friendly feedback from AI
  rationale: string; // Educational explanation
  suggestedAnswer: string;
}

export type { MCExplanationRequest, MCExplanationResponse, ExplanationSource } from './gemini';

// Backward-compatibility definitions
export interface DeckWithStats {
  id: string;
  name: string;
  totalCards: number;
  dueToday: number;
  masteryPercent: number;
}

export interface ReviewCard {
  id: string;
  front: string;
  back: string;
  deckId: string;
  deckName: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

export interface DailyStudyLog {
  date: string; // YYYY-MM-DD
  cardsStudied: number;
  correctCount: number;
  timeSpentSeconds: number;
  modeCounts: Record<StudyMode, number>;
}

export interface LearningAnalyticsData {
  weeklyLogs: { dayLabel: string; date: string; count: number; goal: number }[];
  retentionFunnel: {
    box1New: number; // Interval 0
    box2Learning: number; // 1-3 days
    box3Developing: number; // 4-10 days
    box4Proficient: number; // 11-20 days
    box5Mastered: number; // >= 21 days
  };
  totalReviewsAllTime: number;
  overallAccuracyPercent: number;
  avgTimePerCardSeconds: number;
  bestStreak: number;
  currentStreak: number;
  totalTimeMinutes: number;
  modeBreakdown: Record<StudyMode, number>;
}



export interface Sm2Fields {
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: Date;
}

export * from './ndle';



