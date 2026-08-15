import type { ReviewRating, Sm2Fields } from "@/types";

const MIN_EASE = 1.3;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function applyReview(
  card: Sm2Fields,
  rating: ReviewRating,
  now: Date = new Date()
): Sm2Fields {
  let { interval, easeFactor, repetitions } = card;

  switch (rating) {
    case "again":
      repetitions = 0;
      interval = 1;
      easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
      break;
    case "hard":
      repetitions += 1;
      interval = Math.max(1, Math.round(interval * 1.2));
      easeFactor = Math.max(MIN_EASE, easeFactor - 0.15);
      break;
    case "good":
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.max(1, Math.round(interval * easeFactor));
      }
      repetitions += 1;
      break;
    case "easy":
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.max(1, Math.round(interval * easeFactor));
      }
      interval = Math.max(1, Math.round(interval * 1.3));
      repetitions += 1;
      easeFactor += 0.15;
      break;
  }

  return {
    interval,
    easeFactor,
    repetitions,
    dueDate: addDays(now, interval),
  };
}

export function getEndOfToday(): Date {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}
