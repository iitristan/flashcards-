"use client";

import type { ReviewRating } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReviewButtonsProps {
  onRate: (rating: ReviewRating) => void;
  disabled?: boolean;
}

const buttons: {
  rating: ReviewRating;
  label: string;
  className: string;
}[] = [
  {
    rating: "again",
    label: "Again",
    className: "bg-red-500 hover:bg-red-600 text-white",
  },
  {
    rating: "hard",
    label: "Hard",
    className: "bg-yellow-500 hover:bg-yellow-600 text-white",
  },
  {
    rating: "good",
    label: "Good",
    className: "bg-green-500 hover:bg-green-600 text-white",
  },
  {
    rating: "easy",
    label: "Easy",
    className: "bg-blue-500 hover:bg-blue-600 text-white",
  },
];

export function ReviewButtons({ onRate, disabled }: ReviewButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {buttons.map(({ rating, label, className }) => (
        <Button
          key={rating}
          className={cn("h-12", className)}
          disabled={disabled}
          onClick={() => onRate(rating)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
