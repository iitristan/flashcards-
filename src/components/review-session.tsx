"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReview } from "@/actions/review";
import type { ReviewCard, ReviewRating } from "@/types";
import { Flashcard } from "@/components/flashcard";
import { ReviewButtons } from "@/components/review-buttons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface ReviewSessionProps {
  initialCards: ReviewCard[];
  deckName?: string;
}

export function ReviewSession({ initialCards, deckName }: ReviewSessionProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [pending, startTransition] = useTransition();

  const total = initialCards.length;
  const current = initialCards[currentIndex];

  function handleRate(rating: ReviewRating) {
    if (!current || pending) return;

    startTransition(async () => {
      try {
        await submitReview(current.id, rating);
        setReviewed((r) => r + 1);
        setFlipped(false);

        if (currentIndex + 1 >= initialCards.length) {
          toast.success("Review session complete!");
          router.refresh();
        } else {
          setCurrentIndex((i) => i + 1);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save review"
        );
      }
    });
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="mb-2 text-2xl font-semibold">All caught up!</p>
        <p className="mb-6 text-muted-foreground">
          No cards due for review{deckName ? ` in ${deckName}` : ""}.
        </p>
        <Button onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="mb-2 text-2xl font-semibold">Session complete!</p>
        <p className="mb-6 text-muted-foreground">
          You reviewed {reviewed} card{reviewed === 1 ? "" : "s"}.
        </p>
        <Button onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const progress = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {reviewed} / {total} reviewed
          </span>
          {deckName && <span>{deckName}</span>}
        </div>
        <Progress value={progress} />
      </div>

      <Flashcard
        front={current.front}
        back={current.back}
        flipped={flipped}
        onFlip={() => !flipped && setFlipped(true)}
      />

      {flipped ? (
        <ReviewButtons onRate={handleRate} disabled={pending} />
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Flip the card to rate your recall
        </p>
      )}
    </div>
  );
}
