'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Sparkles, BookOpen, CheckCircle2 } from 'lucide-react';
import { StudyMode } from '@/types';
import { StudyTimer } from './StudyTimer';
import { soundEffects } from '@/lib/soundEffects';

interface StudyHeaderProps {
  deckTitle: string;
  mode: StudyMode;
  currentIndex: number;
  totalCards: number;
  timerDuration: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onExit: () => void;
  onTimerExpire?: () => void;
  isPaused?: boolean;
}

export const StudyHeader: React.FC<StudyHeaderProps> = ({
  deckTitle,
  mode,
  currentIndex,
  totalCards,
  timerDuration,
  soundEnabled,
  onToggleSound,
  onExit,
  onTimerExpire,
  isPaused
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const modeDetails: Record<StudyMode, { label: string; icon: typeof Sparkles; color: string }> = {
    'spaced-repetition': {
      label: 'Anki Spaced Repetition',
      icon: BookOpen,
      color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
    },
    'multiple-choice': {
      label: 'Multiple Choice Quiz',
      icon: CheckCircle2,
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
    },
    'identification': {
      label: 'AI Smart Identification',
      icon: Sparkles,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
    }
  };

  const progressPercentage = Math.min(100, Math.round(((currentIndex) / totalCards) * 100));
  const currentMode = modeDetails[mode];
  const ModeIcon = currentMode.icon;

  const handleExitClick = () => {
    if (currentIndex > 0) {
      setShowExitConfirm(true);
    } else {
      onExit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-6">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-4 mb-3">
        {/* Back button */}
        <button
          onClick={handleExitClick}
          aria-label="Exit review session"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] transition-all active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Review</span>
        </button>

        {/* Deck and mode info */}
        <div className="flex items-center gap-2 overflow-hidden text-center">
          <span className="font-bold text-sm text-[var(--text-main)] truncate max-w-[180px] sm:max-w-[280px]">
            {deckTitle}
          </span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${currentMode.color}`}>
            <ModeIcon className="w-3 h-3" />
            <span className="hidden sm:inline">{currentMode.label}</span>
          </span>
        </div>

        {/* Right tools (Timer + Sound) */}
        <div className="flex items-center gap-2">
          {timerDuration > 0 && (
            <StudyTimer
              initialSeconds={timerDuration}
              cardIndex={currentIndex}
              onExpire={onTimerExpire}
              isPaused={isPaused}
            />
          )}

          <button
            onClick={() => {
              onToggleSound();
              soundEffects.playFlip();
            }}
            className="p-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-all active:scale-90"
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[var(--primary)]" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress bar and counter */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-[var(--text-muted)] px-1">
          <span>Card {Math.min(currentIndex + 1, totalCards)} of {totalCards}</span>
          <span>{progressPercentage}% complete</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Session progress: ${progressPercentage}%`}
          className="w-full h-2.5 bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden border border-[var(--border-subtle)] p-0.5"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--primary)] to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Confirm Exit Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl bg-[var(--bg-surface)] p-6 border border-[var(--border-color)] shadow-[var(--modal-shadow)] text-center space-y-4"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 flex items-center justify-center text-2xl">
              🥑
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[var(--text-main)]">Leave Study Session?</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Cards you already rated are saved! You can resume or start fresh anytime.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-2xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
              >
                Keep Studying
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onExit();
                }}
                className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Yes, Exit
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
