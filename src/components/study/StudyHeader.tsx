'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Sparkles, BookOpen, CheckCircle2, Flame } from 'lucide-react';
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
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error' | 'syncing';
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
  saveStatus = 'idle',
  onToggleSound,
  onExit,
  onTimerExpire,
  isPaused
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const modeDetails: Record<StudyMode, { label: string; icon: typeof Sparkles; color: string }> = {
    'spaced-repetition': {
      label: 'Spaced Repetition',
      icon: BookOpen,
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
    },
    'blitz-marathon': {
      label: 'Blitz Marathon',
      icon: Flame,
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
    },
    'multiple-choice': {
      label: 'Multiple Choice',
      icon: CheckCircle2,
      color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
    },
    'identification': {
      label: 'AI Identification',
      icon: Sparkles,
      color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
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
    <div className="w-full max-w-3xl mx-auto mb-6 space-y-3">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-3">
        {/* Back button & Save Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExitClick}
            aria-label="Exit review session"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] transition-all active:scale-95 flex-shrink-0 shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Review</span>
          </button>

          {saveStatus && saveStatus !== 'idle' && (
            <span className="hidden xs:inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-subtle)] px-2 py-0.5 rounded-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  saveStatus === 'saving'
                    ? 'bg-amber-500 animate-pulse'
                    : saveStatus === 'saved'
                    ? 'bg-emerald-500'
                    : 'bg-rose-500'
                }`}
              />
              <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Error'}</span>
            </span>
          )}
        </div>

        {/* Right tools (Timer + Sound) */}
        <div className="flex items-center gap-2 flex-shrink-0">
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
            className="p-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-all active:scale-90 shadow-xs"
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[var(--primary)]" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Title & Mode Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <h2 className="text-sm sm:text-base font-black text-[var(--text-main)] truncate" title={deckTitle}>
            {deckTitle}
          </h2>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${currentMode.color} flex-shrink-0 shadow-2xs`}>
            <ModeIcon className="w-3 h-3" />
            <span>{currentMode.label}</span>
          </span>
        </div>

        <div className="text-xs font-extrabold text-[var(--text-muted)] flex-shrink-0">
          <span>Card {Math.min(currentIndex + 1, totalCards)} of {totalCards}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Session progress: ${progressPercentage}%`}
          className="w-full h-2.5 bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden border border-[var(--border-subtle)] p-0.5 shadow-inner"
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
