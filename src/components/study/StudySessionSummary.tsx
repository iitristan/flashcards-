'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Sparkles, CheckCircle2, XCircle, Flame, Clock } from 'lucide-react';
import { CardReviewResult } from '@/types';

interface StudySessionSummaryProps {
  deckTitle: string;
  results: CardReviewResult[];
  startTime: number;
  streak: number;
  onRestart: (missedOnly?: boolean) => void;
  onReturnHome: () => void;
}

export const StudySessionSummary: React.FC<StudySessionSummaryProps> = ({
  deckTitle,
  results,
  startTime,
  streak,
  onRestart,
  onReturnHome
}) => {
  const totalCards = results.length;
  const correctCount = results.filter(
    (r) => r.isCorrect || r.rating === 'good' || r.rating === 'easy'
  ).length;
  const missedCount = totalCards - correctCount;
  const accuracy = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;
  const [totalTimeSeconds] = useState(() => Math.max(1, Math.round((Date.now() - startTime) / 1000)));
  const minutes = Math.floor(totalTimeSeconds / 60);
  const seconds = totalTimeSeconds % 60;

  useEffect(() => {
    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7FA98B', '#FF9A76', '#F38BA0', '#FAEDCD', '#A6E3A1']
      });
    } catch {
      // confetti error ignored
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl mx-auto p-6 sm:p-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm text-center space-y-5"
    >
      {/* Trophy & Mascot Avatar */}
      <div className="relative inline-block">
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
          className="w-16 h-16 mx-auto rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-3xl shadow-xs select-none"
        >
          🥑
        </motion.div>
        <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-400 text-white shadow-xs">
          <Trophy className="w-3.5 h-3.5 fill-current" />
        </span>
      </div>

      {/* Title & Deck */}
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--primary-light)] text-[var(--primary)]">
          <Sparkles className="w-3 h-3" /> Review Completed
        </span>
        <h2 className="text-2xl font-bold text-[var(--text-main)]">
          {accuracy >= 80 ? 'Outstanding Work!' : 'Session Complete!'}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)]">
          You finished studying <span className="font-semibold text-[var(--text-main)]">{deckTitle}</span>
        </p>
      </div>

      {/* Big Stats Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Accuracy */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Accuracy
          </span>
          <p className="text-2xl font-bold text-[var(--primary)]">
            {accuracy}%
          </p>
        </div>

        {/* Time Spent */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Time
          </span>
          <p className="text-2xl font-bold text-[var(--text-main)]">
            {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
          </p>
        </div>

        {/* Streak */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-center gap-1">
            <Flame className="w-3 h-3 text-orange-500" /> Streak
          </span>
          <p className="text-2xl font-bold text-orange-500">
            {streak} {streak === 1 ? 'day' : 'days'}
          </p>
        </div>
      </div>

      {/* Breakdown Bar */}
      <div className="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-2">
        <div className="flex justify-between text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> {correctCount} Mastered / Correct
          </span>
          <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <XCircle className="w-4 h-4" /> {missedCount} Needs Review
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden bg-black/10 dark:bg-white/10 flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(correctCount / totalCards) * 100}%` }}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${(missedCount / totalCards) * 100}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        {missedCount > 0 && (
          <button
            onClick={() => onRestart(true)}
            aria-label={`Review ${missedCount} missed flashcards`}
            className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Review {missedCount} Missed Cards</span>
          </button>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={() => onRestart(false)}
            aria-label="Restart entire study session from the beginning"
            className="flex-1 py-3 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart All</span>
          </button>

          <button
            onClick={onReturnHome}
            aria-label="Return to deck dashboard"
            className="flex-1 py-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)] font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
