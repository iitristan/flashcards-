'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Sparkles, BookOpen, CheckCircle2, Flame, Keyboard, X, SlidersHorizontal, ShieldCheck, AlertCircle } from 'lucide-react';
import { StudyMode, Flashcard, CardSortOption, CardFilterOption, SparkleStyle, getCardProgressInfo } from '@/types';
import { NDLESubject, NDLE_SUBJECT_CONFIGS } from '@/types/ndle';
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
  practiceArea?: NDLESubject;
  currentCard?: Flashcard;
  activeSort?: CardSortOption;
  activeFilter?: CardFilterOption;
  sparkleStyle?: SparkleStyle;
  missedCount?: number;
  onReviewMissed?: () => void;
  onToggleSound: () => void;
  onExit: () => void;
  onTimerExpire?: () => void;
  onFilterChange?: (filter: CardFilterOption) => void;
  onSortChange?: (sort: CardSortOption) => void;
  onSparkleChange?: (sparkle: SparkleStyle) => void;
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
  practiceArea,
  currentCard,
  activeSort = 'default',
  activeFilter = 'all',
  sparkleStyle = 'clinical',
  missedCount = 0,
  onReviewMissed,
  onToggleSound,
  onExit,
  onTimerExpire,
  onFilterChange,
  onSortChange,
  onSparkleChange,
  isPaused
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showCustomizeMenu, setShowCustomizeMenu] = useState(false);

  const practiceConfig = practiceArea ? NDLE_SUBJECT_CONFIGS[practiceArea] : null;
  const cardProgress = currentCard ? getCardProgressInfo(currentCard) : null;

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


  const progressPercentage = totalCards > 0 ? Math.min(100, Math.max(0, Math.round(((currentIndex) / totalCards) * 100))) : 0;
  const currentMode = modeDetails[mode] || modeDetails['spaced-repetition'];
  const ModeIcon = currentMode?.icon || Sparkles;

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
            onClick={() => setShowCustomizeMenu(!showCustomizeMenu)}
            className={`p-2 rounded-2xl border transition-all active:scale-90 shadow-xs cursor-pointer ${
              showCustomizeMenu
                ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--primary)]'
            }`}
            title="Sort, filter & customize card experience"
            aria-label="Sort, filter and customize"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-all active:scale-90 shadow-xs cursor-pointer"
            title="View keyboard shortcuts"
            aria-label="View keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              onToggleSound();
              soundEffects.playFlip();
            }}
            className="p-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-all active:scale-90 shadow-xs cursor-pointer"
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[var(--primary)]" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Title & Mode Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 min-w-0 max-w-full flex-wrap">
          <h2 className="text-sm sm:text-base font-black text-[var(--text-main)] truncate" title={deckTitle}>
            {deckTitle}
          </h2>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${currentMode.color} flex-shrink-0 shadow-2xs`}>
            <ModeIcon className="w-3 h-3" />
            <span>{currentMode.label}</span>
          </span>

          {practiceArea && practiceConfig && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border shadow-2xs shrink-0"
              style={{
                backgroundColor: practiceConfig.bgLight,
                borderColor: practiceConfig.borderColor,
                color: practiceConfig.color,
              }}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>{practiceConfig.code} ({practiceConfig.weightPercentage}%)</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {missedCount > 0 && onReviewMissed && (
            <button
              type="button"
              onClick={onReviewMissed}
              title="Click to review and drill questions answered incorrectly"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-900 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <AlertCircle className="w-3 h-3 text-rose-500" />
              <span>{missedCount} Wrong (Review)</span>
            </button>
          )}
          <div className="text-xs font-extrabold text-[var(--text-muted)] flex items-center gap-1.5">
            <span>Card {Math.min(currentIndex + 1, totalCards)} of {totalCards}</span>
            <span className="text-[11px] text-[var(--primary)] font-bold">({progressPercentage}%)</span>
          </div>
        </div>
      </div>

      {/* Card Progression Beyond Simple Mastery */}
      {cardProgress && (
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-0.5 px-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${cardProgress.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cardProgress.dotColor}`} />
              <span>{cardProgress.badge}</span>
            </span>

            <span className="text-[11px] font-semibold text-[var(--text-muted)]">
              Leitner Box {cardProgress.box} • Reviewed {cardProgress.repetitions}×
              {cardProgress.intervalDays > 0 && ` • ${cardProgress.intervalDays}d interval`}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-subtle)]">
            {activeFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--primary)] uppercase">
                Filter: {activeFilter}
              </span>
            )}
            {activeSort !== 'default' && (
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--primary)] uppercase">
                Sort: {activeSort}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] capitalize">
              ✨ {sparkleStyle}
            </span>
          </div>
        </div>
      )}

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

      {/* Quick Customize, Sort & Filter Bar (Expandable) */}
      {showCustomizeMenu && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm space-y-3 text-xs"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Card Sorting, Filtering & Design</span>
            </span>
            <button
              onClick={() => setShowCustomizeMenu(false)}
              className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-main)]"
            >
              ✕
            </button>
          </div>

          {/* Filter Pills */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] block">
              Filter By Progress:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'all', label: 'All Cards' },
                  { id: 'unseen', label: '🆕 Unseen Only' },
                  { id: 'learning', label: '🔄 In Learning' },
                  { id: 'developing', label: '📈 Developing' },
                  { id: 'mastered', label: '🏆 Mastered' },
                  { id: 'due', label: '⏰ Due Cards' },
                  { id: 'wrong', label: '❌ Wrong / Missed' }
                ] as const
              ).map(flt => (
                <button
                  key={flt.id}
                  onClick={() => onFilterChange?.(flt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeFilter === flt.id
                      ? 'bg-[var(--primary)] text-white shadow-xs'
                      : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {flt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Selector & Sparkle Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[var(--border-subtle)]">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] block">
                Sort Queue Order:
              </span>
              <select
                value={activeSort}
                onChange={(e) => onSortChange?.(e.target.value as CardSortOption)}
                aria-label="Sort queue order"
                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] outline-none cursor-pointer"
              >
                <option value="default">Default / Shuffled</option>
                <option value="progress-asc">Unseen / Learning First</option>
                <option value="progress-desc">Mastered First</option>
                <option value="difficulty">By Difficulty (Hard First)</option>
                <option value="most-reviewed">Most Reviewed First</option>
                <option value="alphabetical">Alphabetical (A-Z)</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] block">
                Sparkle / Design Style:
              </span>
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: 'clinical', label: 'Clinical', icon: '🩺' },
                    { id: 'vibrant', label: 'Vibrant', icon: '⚡' },
                    { id: 'cosmic', label: 'Cosmic', icon: '✨' },
                    { id: 'minimal', label: 'Minimal', icon: '⚪' }
                  ] as const
                ).map(st => (
                  <button
                    key={st.id}
                    onClick={() => onSparkleChange?.(st.id)}
                    className={`py-1 px-1.5 rounded-lg text-center font-bold text-[10px] border transition-all cursor-pointer ${
                      sparkleStyle === st.id
                        ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs'
                        : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span>{st.icon}</span>
                    <span className="block truncate">{st.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Keyboard Shortcuts Reference Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-2xl bg-[var(--bg-surface)] p-5 border border-[var(--border-color)] shadow-[var(--modal-shadow)] text-slate-800 dark:text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-[var(--primary)]" />
                <h3 className="text-sm font-bold text-[var(--text-main)]">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface-subtle)]">
                <span className="text-[var(--text-muted)]">Flip Flashcard</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[11px] font-bold">Space</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface-subtle)]">
                <span className="text-[var(--text-muted)]">Rate: Again / Hard / Good / Easy</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[10px] font-bold">1</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[10px] font-bold">2</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[10px] font-bold">3</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[10px] font-bold">4</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface-subtle)]">
                <span className="text-[var(--text-muted)]">Multiple Choice Selection</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[10px] font-bold">A</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[10px] font-bold">B</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[10px] font-bold">C</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[10px] font-bold">D</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface-subtle)]">
                <span className="text-[var(--text-muted)]">Advance / Continue</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[11px] font-bold">Enter</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}

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
                className="flex-1 py-2.5 rounded-2xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
              >
                Keep Studying
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onExit();
                }}
                className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
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
