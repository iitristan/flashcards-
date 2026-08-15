export type StudyMode = 'spaced-repetition' | 'multiple-choice' | 'identification';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type ThemeType = 'matcha' | 'strawberry' | 'dark';

export type DeckCategory = 
  | 'Clinical Nutrition'
  | 'Nutritional Biochemistry'
  | 'Food Service Systems'
  | 'Public Health & Community'
  | 'Maternal & Child Nutrition'
  | 'General Dietetics';

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
  difficulty?: 'easy' | 'medium' | 'hard';
  leitnerBox?: number; // 1 to 5
  sm2: Sm2Data;
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

export interface StudySessionState {
  deckId: string;
  deckTitle: string;
  mode: StudyMode;
  cardsQueue: Flashcard[];
  currentIndex: number;
  results: CardReviewResult[];
  startTime: number;
  isCompleted: boolean;
  timerDurationSeconds: number; // 0 for off, or 10, 15, 20, 25, 30
}

export interface UserPreferences {
  theme: ThemeType;
  timerDuration: number; // 0 = off, 10, 15, 20, 25, 30
  soundEnabled: boolean;
  autoFlip: boolean;
  dailyGoal: number; // cards per day
  studyStreak: number;
  lastStudyDate: string | null;
}

export interface AIGradeResponse {
  verdict: 'correct' | 'partially_correct' | 'incorrect';
  score: number; // 0 to 100
  feedback: string; // Concise, friendly feedback from AI
  rationale: string; // Educational explanation
  suggestedAnswer: string;
}

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

export interface Sm2Fields {
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: Date;
}
