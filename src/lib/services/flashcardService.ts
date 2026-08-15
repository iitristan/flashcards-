import { Flashcard, ReviewRating, Sm2Data, DeckStats } from '@/types';

const MIN_EASE = 1.3;

/**
 * Calculates updated SM-2 Spaced Repetition metrics based on user rating.
 * Ratings:
 * - again: Failed recall (reset interval to 1 day, decrease ease)
 * - hard: Difficult recall (small interval increase, decrease ease slightly)
 * - good: Optimal recall (standard SM-2 interval expansion)
 * - easy: Effortless recall (bonus interval expansion + increase ease)
 */
export function calculateSM2(current: Sm2Data, rating: ReviewRating, now: Date = new Date()): Sm2Data {
  let { interval, easeFactor, repetitions } = current;

  switch (rating) {
    case 'again':
      repetitions = 0;
      interval = 1;
      easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
      break;

    case 'hard':
      repetitions += 1;
      interval = Math.max(1, Math.round(interval * 1.2));
      easeFactor = Math.max(MIN_EASE, easeFactor - 0.15);
      break;

    case 'good':
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 3;
      } else {
        interval = Math.max(1, Math.round(interval * easeFactor));
      }
      repetitions += 1;
      break;

    case 'easy':
      if (repetitions === 0) {
        interval = 2;
      } else if (repetitions === 1) {
        interval = 4;
      } else {
        interval = Math.max(1, Math.round(interval * easeFactor * 1.3));
      }
      repetitions += 1;
      easeFactor += 0.15;
      break;
  }

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + interval);

  return {
    interval,
    easeFactor: Math.round(easeFactor * 100) / 100,
    repetitions,
    dueDate: dueDate.toISOString()
  };
}

/**
 * Formats time interval for rating button labels (e.g. "<1m", "10m", "1d", "4d")
 */
export function getIntervalLabel(current: Sm2Data, rating: ReviewRating): string {
  switch (rating) {
    case 'again':
      return '< 1 min';
    case 'hard':
      if (current.repetitions === 0) return '10 min';
      return `${Math.max(1, Math.round(current.interval * 1.2))}d`;
    case 'good':
      if (current.repetitions === 0) return '1 day';
      if (current.repetitions === 1) return '3 days';
      return `${Math.max(1, Math.round(current.interval * current.easeFactor))}d`;
    case 'easy':
      if (current.repetitions === 0) return '2 days';
      if (current.repetitions === 1) return '4 days';
      return `${Math.max(1, Math.round(current.interval * current.easeFactor * 1.3))}d`;
  }
}

/**
 * Calculates summary statistics for a collection of cards.
 */
export function computeDeckStats(cards: Flashcard[]): DeckStats {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  let dueToday = 0;
  let masteredCards = 0;
  let learningCards = 0;
  let newCards = 0;

  for (const card of cards) {
    const isNew = !card.lastReviewedAt || card.sm2.repetitions === 0;
    const isMastered = card.sm2.repetitions >= 3 || card.sm2.interval >= 21;
    
    if (isNew) {
      newCards++;
    } else if (isMastered) {
      masteredCards++;
    } else {
      learningCards++;
    }

    if (isNew || new Date(card.sm2.dueDate) <= todayEnd) {
      dueToday++;
    }
  }

  const reviewedCards = cards.filter(c => c.lastReviewedAt);
  const averageAccuracy = reviewedCards.length > 0
    ? Math.round((masteredCards / cards.length) * 100)
    : 0;

  return {
    totalCards: cards.length,
    dueToday,
    masteredCards,
    learningCards,
    newCards,
    averageAccuracy
  };
}

/**
 * Shuffles an array randomly (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
