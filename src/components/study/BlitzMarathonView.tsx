'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Award,
  Timer,
  Sparkles
} from 'lucide-react';

import { Flashcard, ReviewRating, MCExplanationResponse } from '@/types';
import { shuffleArray } from '@/lib/services/flashcardService';
import { soundEffects } from '@/lib/soundEffects';
import { FormattedCardText, cleanRawHtml } from './FormattedCardText';
import { cleanOptionLabel } from '@/lib/importers/anki/ankiConverter';
import { useNutriStore } from '@/lib/store/useNutriStore';
import { SelfNoteInput } from './SelfNoteInput';
import { GoogleAiOverview } from './GoogleAiOverview';

interface BlitzMarathonViewProps {
  card: Flashcard;
  onAnswer: (result: {
    rating: ReviewRating;
    isCorrect: boolean;
    selectedOption: string;
    timeSpentSeconds: number;
  }) => void;
  currentIndex: number;
  totalCards: number;
}

const QUESTION_TIME_LIMIT = 12; // 12 seconds per blitz card

export const BlitzMarathonView: React.FC<BlitzMarathonViewProps> = ({
  card,
  onAnswer,
  currentIndex,
  totalCards
}) => {
  const { preferences } = useNutriStore();
  const [prevCardId, setPrevCardId] = useState(card.id);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [comboStreak, setComboStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [aiExplanation, setAiExplanation] = useState<MCExplanationResponse | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Sync state on card change during render
  if (prevCardId !== card.id) {
    setPrevCardId(card.id);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setSelectedOption(null);
    setHasSubmitted(false);
    setAiExplanation(null);
    setIsLoadingAi(false);
  }

  // Clean prompt and extract on-the-fly
  const displayQuestion = useMemo(() => {
    const raw = cleanRawHtml(card.front);
    const optionSplit = raw.split(/\n\s*[a-dA-D1-4][\.\)\:\-]/)[0];
    return optionSplit.trim() || raw;
  }, [card.front]);

  const [options, setOptions] = useState<string[]>([]);

  // Dynamically randomize and interchange option slots (A, B, C, D) on each presentation
  useEffect(() => {
    const cleanBack = cleanOptionLabel(card.back || '');
    let pool: string[] = [];

    if (card.options && card.options.length >= 2) {
      const cleaned = card.options.map(opt => cleanOptionLabel(opt));
      pool = Array.from(new Set([...cleaned, cleanBack]));
    } else {
      pool = [
        cleanBack,
        'Increased dietary sodium intake',
        'Normal metabolic steady-state',
        'Standard clinical recommendation'
      ];
    }

    if (pool.length < 4) {
      const allDecks = useNutriStore.getState().decks;
      const otherAnswers = allDecks.flatMap(d => d.cards || [])
        .map(c => cleanOptionLabel(c.back || ''))
        .filter(ans => ans && ans.toLowerCase() !== cleanBack.toLowerCase());
      
      const shuffledOther = shuffleArray(Array.from(new Set(otherAnswers)));
      pool = Array.from(new Set([cleanBack, ...pool, ...shuffledOther.slice(0, 4 - pool.length)]));
    }

    if (pool.length < 4) {
      const fallbackDistractors = [
        'Increased dietary sodium intake',
        'Normal metabolic steady-state',
        'Standard clinical recommendation',
        'Decreased serum potassium concentration'
      ];
      pool = Array.from(new Set([...pool, ...fallbackDistractors]));
    }

    setOptions(shuffleArray(pool.slice(0, 4)));
  }, [card.id, card.back, card.options, card.updatedAt, card.lastReviewedAt]);

  const normalizeForComparison = useCallback((str: string) => {
    return cleanOptionLabel(cleanRawHtml(str || '')).trim().toLowerCase();
  }, []);

  const fetchAiExplanation = useCallback(async (userChoice: string) => {
    setIsLoadingAi(true);
    try {
      const res = await fetch('/api/explain-mc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: displayQuestion,
          userAnswer: cleanOptionLabel(userChoice),
          correctAnswer: cleanOptionLabel(card.back),
          allOptions: options,
          rationale: card.rationale || '',
          apiKey: preferences.geminiApiKey || undefined
        })
      });

      if (res.ok) {
        const data: MCExplanationResponse = await res.json();
        setAiExplanation(data);
      }
    } catch (e) {
      console.warn('Failed to fetch AI explanation:', e);
    } finally {
      setIsLoadingAi(false);
    }
  }, [displayQuestion, card.back, card.rationale, options, preferences.geminiApiKey]);

  // Blitz Countdown Timer Interval
  useEffect(() => {
    if (hasSubmitted) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setHasSubmitted(true);
          setSelectedOption(null);
          setComboStreak(0);
          soundEffects.playIncorrect();
          return 0;
        }

        if (prev <= 4) {
          soundEffects.playTick();
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [card.id, hasSubmitted, fetchAiExplanation]);

  const handleSelectOption = (option: string) => {
    if (hasSubmitted) return;

    setSelectedOption(option);
    setHasSubmitted(true);

    const isCorrect = normalizeForComparison(option) === normalizeForComparison(card.back);

    if (isCorrect) {
      const currentStreak = comboStreak + 1;
      setComboStreak(currentStreak);
      const multiplier = currentStreak >= 5 ? 3 : currentStreak >= 3 ? 2 : 1;
      const pointsEarned = (100 + timeLeft * 15) * multiplier;
      setScore(prev => prev + pointsEarned);
      soundEffects.playCorrect();
    } else {
      setComboStreak(0);
      soundEffects.playIncorrect();
    }
  };

  const handleNext = useCallback(() => {
    const isCorrect = selectedOption
      ? normalizeForComparison(selectedOption) === normalizeForComparison(card.back)
      : false;
    const rating: ReviewRating = isCorrect ? 'good' : 'again';

    onAnswer({
      rating,
      isCorrect,
      selectedOption: selectedOption || 'Time Expired',
      timeSpentSeconds: QUESTION_TIME_LIMIT - timeLeft
    });
  }, [selectedOption, normalizeForComparison, card.back, onAnswer, timeLeft]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasSubmitted && e.key === 'Enter') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSubmitted, handleNext]);


  const letters = ['A', 'B', 'C', 'D'];
  const timerPercentage = (timeLeft / QUESTION_TIME_LIMIT) * 100;
  const multiplier = comboStreak >= 5 ? 3 : comboStreak >= 3 ? 2 : 1;
  const isSelectedCorrect = selectedOption
    ? normalizeForComparison(selectedOption) === normalizeForComparison(card.back)
    : false;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center space-y-5">
      {/* Blitz Top Dashboard Meter */}
      <div className="w-full grid grid-cols-3 gap-2 sm:gap-3">
        {/* Score Card */}
        <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-[var(--text-subtle)] block uppercase tracking-wider leading-none mb-1">Score</span>
            <span className="text-sm sm:text-base font-bold text-[var(--text-main)] leading-none">{score}</span>
          </div>
        </div>

        {/* Combo Multiplier Card */}
        <div className={`p-3 rounded-xl border transition-all shadow-xs flex items-center gap-2.5 ${
          multiplier > 1 
            ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/30' 
            : 'bg-[var(--bg-surface)] border-[var(--border-color)]'
        }`}>
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            multiplier > 1 ? 'bg-orange-500 text-white animate-pulse' : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]'
          }`}>
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-[var(--text-subtle)] block uppercase tracking-wider leading-none mb-1">Streak</span>
            <div className="text-sm sm:text-base font-bold text-[var(--text-main)] leading-none truncate">
              <span>{comboStreak}x</span>
              {multiplier > 1 && (
                <span className="text-xs text-orange-500 font-bold ml-1">({multiplier}x)</span>
              )}
            </div>
          </div>
        </div>

        {/* Blitz Countdown Clock */}
        <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex items-center gap-2.5">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            timeLeft <= 3 ? 'bg-rose-500 text-white animate-ping' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}>
            <Timer className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-[var(--text-subtle)] block uppercase tracking-wider leading-none mb-1">Timer</span>
            <span className={`text-sm sm:text-base font-bold leading-none ${timeLeft <= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-main)]'}`}>
              {timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Animated Timer Bar */}
      <div className="w-full h-1.5 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden border border-[var(--border-subtle)]">
        <motion.div
          animate={{ width: `${timerPercentage}%` }}
          transition={{ duration: 1, ease: 'linear' }}
          className={`h-full rounded-full transition-colors ${
            timeLeft > 6
              ? 'bg-emerald-500'
              : timeLeft > 3
              ? 'bg-amber-500'
              : 'bg-rose-500'
          }`}
        />
      </div>

      {/* Blitz Question Card */}
      <div className="w-full rounded-xl p-5 sm:p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-2.5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-current" /> Blitz ({currentIndex + 1}/{totalCards})
          </span>
        </div>

        <div className="py-2">
          <div className="text-lg sm:text-xl font-bold text-[var(--text-main)] leading-relaxed">
            <FormattedCardText content={displayQuestion} />
          </div>
        </div>
      </div>

      {/* Options Grid */}
      <div
        role="radiogroup"
        aria-label="Blitz answer choices"
        className="w-full grid grid-cols-1 gap-2.5"
      >
        {options.map((option, idx) => {
          const isTarget = normalizeForComparison(option) === normalizeForComparison(card.back);
          const isSelected = selectedOption === option;

          let containerStyle = 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-orange-500 hover:bg-[var(--bg-surface-subtle)]';
          let textColor = 'text-[var(--text-main)]';

          if (hasSubmitted) {
            if (isTarget) {
              containerStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/20';
              textColor = 'text-emerald-950 dark:text-emerald-100 font-bold';
            } else if (isSelected && !isTarget) {
              containerStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/20';
              textColor = 'text-rose-950 dark:text-rose-100 font-bold';
            } else {
              containerStyle = 'bg-[var(--bg-surface)] border-[var(--border-color)] opacity-60';
              textColor = 'text-[var(--text-main)]';
            }
          }

          return (
            <motion.button
              key={`${card.id}-${idx}`}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={hasSubmitted}
              aria-label={`Option ${letters[idx] || idx + 1}: ${cleanOptionLabel(option)}`}
              whileHover={!hasSubmitted ? { scale: 1.005 } : {}}
              whileTap={!hasSubmitted ? { scale: 0.995 } : {}}
              onClick={() => handleSelectOption(option)}
              disabled={hasSubmitted}
              className={`w-full p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between text-left group shadow-xs ${containerStyle}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                    hasSubmitted && isTarget
                      ? 'bg-emerald-600 text-white'
                      : hasSubmitted && isSelected && !isTarget
                      ? 'bg-rose-600 text-white'
                      : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] group-hover:bg-[var(--primary)] group-hover:text-white'
                  }`}
                >
                  {letters[idx] || idx + 1}
                </span>
                <span className={`text-sm sm:text-base leading-snug font-medium ${textColor}`}>
                  {cleanOptionLabel(option)}
                </span>
              </div>

              {hasSubmitted && (
                <div className="flex-shrink-0">
                  {isTarget && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                  {isSelected && !isTarget && <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Answer Rationale, AI Breakdown & Continue */}
      <AnimatePresence>
        {hasSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4 pt-1"
          >
            {/* Quick Result Banner with High Contrast */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between shadow-xs ${
              isSelectedCorrect
                ? 'bg-emerald-100/90 dark:bg-emerald-950/80 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100'
                : 'bg-rose-100/95 dark:bg-rose-950/90 border-rose-400 dark:border-rose-700 text-rose-950 dark:text-rose-100'
            }`}>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                {isSelectedCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300 flex-shrink-0" />
                    <span className="text-emerald-950 dark:text-emerald-100">
                      CORRECT! +{(100 + timeLeft * 15) * multiplier} PTS ({multiplier}x COMBO)
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-700 dark:text-rose-300 flex-shrink-0" />
                    <span className="text-rose-950 dark:text-rose-100">
                      STREAK BROKEN — Target answer: &ldquo;{cleanOptionLabel(card.back)}&rdquo;
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* On-Demand AI Overview Button (Save Tokens - Only Fetches When Clicked) */}
            {!aiExplanation && !isLoadingAi && (
              <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] min-w-0">
                  <Sparkles className={`w-4 h-4 flex-shrink-0 ${isSelectedCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`} />
                  <span className="truncate">Clinical AI Breakdown</span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchAiExplanation(selectedOption || card.back)}
                  className={`px-3 py-1.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] transition-all shadow-xs flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap active:scale-95 cursor-pointer ${
                    isSelectedCorrect
                      ? 'hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-700 dark:hover:text-emerald-300'
                      : 'hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-700 dark:hover:text-amber-300'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 ${isSelectedCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`} />
                  <span>AI Overview</span>
                </button>
              </div>
            )}

            {/* Google-Style AI Overview & Authoritative Clinical Breakdown */}
            {(aiExplanation || isLoadingAi) && (
              <GoogleAiOverview
                explanation={aiExplanation}
                isLoading={isLoadingAi}
                onRetry={() => fetchAiExplanation(selectedOption || card.back)}
                correctAnswer={cleanOptionLabel(card.back)}
                userAnswer={selectedOption ? cleanOptionLabel(selectedOption) : undefined}
                isCorrect={isSelectedCorrect}
              />
            )}

            {/* Self-Notes & Card Correction Per Item */}
            <SelfNoteInput
              cardId={card.id}
              deckId={card.deckId}
              card={card}
              initialNote={card.userNotes || ''}
            />

            {/* Continue Button */}
            <button
              onClick={handleNext}
              className="w-full py-3.5 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-[0.99] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Next Blitz Card</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-black/20 text-[11px] font-mono font-medium">
                Enter ↵
              </kbd>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
