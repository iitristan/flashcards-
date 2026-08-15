"use client";

import { cn } from "@/lib/utils";

interface FlashcardProps {
  front: string;
  back: string;
  flipped: boolean;
  onFlip: () => void;
}

export function Flashcard({ front, back, flipped, onFlip }: FlashcardProps) {
  return (
    <div
      className="perspective-[1200px] mx-auto w-full max-w-2xl cursor-pointer"
      onClick={onFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFlip();
        }
      }}
      aria-label={flipped ? "Show question" : "Show answer"}
    >
      <div
        className={cn(
          "relative min-h-[320px] transition-transform duration-500 [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]"
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border bg-card p-8 shadow-lg [backface-visibility:hidden]">
          <div className="text-center">
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              Question
            </p>
            <p className="text-xl font-medium leading-relaxed md:text-2xl">
              {front}
            </p>
            <p className="mt-8 text-sm text-muted-foreground">
              Click to reveal answer
            </p>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border bg-primary/5 p-8 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="text-center">
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              Answer
            </p>
            <p className="text-xl font-medium leading-relaxed md:text-2xl">
              {back}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
