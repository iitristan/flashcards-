'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  BookOpen,
  Tag,
  HelpCircle,
  Sparkles,
  Loader2,
  Lightbulb,
  Scale
} from 'lucide-react';
import { Flashcard, ReviewRating } from '@/types';
import { shuffleArray } from '@/lib/services/flashcardService';
import { soundEffects } from '@/lib/soundEffects';
import { FormattedCardText, cleanRawHtml } from './FormattedCardText';
import { cleanOptionLabel } from '@/lib/importers/anki/ankiConverter';
import { MCExplanationResponse } from '@/app/api/explain-mc/route';
import { useNutriStore } from '@/lib/store/useNutriStore';

interface MultipleChoiceViewProps {
  card: Flashcard;
  onAnswer: (result: { rating: ReviewRating; isCorrect: boolean; selectedOption: string }) => void;
  isExpired?: boolean;
}

export const MultipleChoiceView: React.FC<MultipleChoiceViewProps> = ({
  card,
  onAnswer,
  isExpired = false
}) => {
  const { preferences } = useNutriStore();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<MCExplanationResponse | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Clean prompt and extract on-the-fly if needed
  const displayQuestion = useMemo(() => {
    const raw = cleanRawHtml(card.front);
    const optionSplit = raw.split(/\n\s*[a-dA-D1-4][\.\)\:\-]/)[0];
    return optionSplit.trim() || raw;
  }, [card.front]);

  // Generate 4 randomized options
  const options = useMemo(() => {
    if (card.options && card.options.length >= 2) {
      const cleaned = card.options.map(opt => cleanOptionLabel(opt));
      const cleanBack = cleanOptionLabel(card.back);
      const uniqueOpts = Array.from(new Set([...cleaned, cleanBack]));
      return shuffleArray(uniqueOpts.slice(0, 4));
    }

    const cleanBack = cleanOptionLabel(card.back);
    const fallback = [
      cleanBack,
      'Increased dietary sodium intake',
      'Normal metabolic steady-state',
      'Standard clinical recommendation'
    ];
    return shuffleArray(Array.from(new Set(fallback)));
  }, [card.back, card.options]);

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

  // Handle timer expiration
  useEffect(() => {
    if (isExpired && !hasSubmitted) {
      const timer = setTimeout(() => {
        setHasSubmitted(true);
        setSelectedOption(null);
        soundEffects.playIncorrect();
        fetchAiExplanation('Time Expired');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isExpired, hasSubmitted, fetchAiExplanation]);

  const handleSelectOption = (option: string) => {
    if (hasSubmitted) return;

    setSelectedOption(option);
    setHasSubmitted(true);

    const isCorrect = normalizeForComparison(option) === normalizeForComparison(card.back);

    if (isCorrect) {
      soundEffects.playCorrect();
    } else {
      soundEffects.playIncorrect();
      // Automatically fetch Gemini explanation on wrong answers
      fetchAiExplanation(option);
    }
  };

  const handleNext = () => {
    const isCorrect = selectedOption ? normalizeForComparison(selectedOption) === normalizeForComparison(card.back) : false;
    const rating: ReviewRating = isCorrect ? 'good' : 'again';
    onAnswer({
      rating,
      isCorrect,
      selectedOption: selectedOption || 'Time Expired'
    });
  };

  // Keyboard navigation for Enter key to continue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasSubmitted && e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const letters = ['A', 'B', 'C', 'D'];
  const isSelectedCorrect = selectedOption ? normalizeForComparison(selectedOption) === normalizeForComparison(card.back) : false;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center space-y-6">
      {/* Question Card */}
      <div className="w-full rounded-3xl p-6 sm:p-8 bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-[var(--card-shadow)] space-y-4">
        {/* Tags & Mode Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
              >
                <Tag className="w-3 h-3 text-[var(--primary)]" />
                {tag}
              </span>
            ))}
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--text-subtle)]">
            <HelpCircle className="w-3.5 h-3.5" /> Multiple Choice
          </span>
        </div>

        {/* Question Text */}
        <div className="py-2">
          <div className="text-lg sm:text-xl font-extrabold text-[var(--text-main)] leading-relaxed">
            <FormattedCardText content={displayQuestion} />
          </div>
        </div>
      </div>

      {/* Options Grid */}
      <div
        role="radiogroup"
        aria-label="Multiple choice answer options"
        className="w-full grid grid-cols-1 gap-3"
      >
        {options.map((option, idx) => {
          const isTarget = normalizeForComparison(option) === normalizeForComparison(card.back);
          const isSelected = selectedOption === option;

          let containerStyle = 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--primary)] hover:bg-[var(--bg-surface-subtle)]';
          let textColor = 'text-[var(--text-main)]';

          if (hasSubmitted) {
            if (isTarget) {
              containerStyle = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20';
              textColor = 'text-emerald-950 dark:text-emerald-50 font-extrabold';
            } else if (isSelected && !isTarget) {
              containerStyle = 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/20';
              textColor = 'text-rose-950 dark:text-rose-50 font-extrabold';
            } else {
              containerStyle = 'bg-[var(--bg-surface)] border-[var(--border-color)] opacity-75';
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
              whileHover={!hasSubmitted ? { scale: 1.01 } : {}}
              whileTap={!hasSubmitted ? { scale: 0.99 } : {}}
              onClick={() => handleSelectOption(option)}
              disabled={hasSubmitted}
              className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left group shadow-xs ${containerStyle}`}
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                    hasSubmitted && isTarget
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : hasSubmitted && isSelected && !isTarget
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] group-hover:bg-[var(--primary)] group-hover:text-white'
                  }`}
                >
                  {letters[idx] || idx + 1}
                </span>
                <span className={`text-sm sm:text-base leading-snug ${textColor}`}>
                  {cleanOptionLabel(option)}
                </span>
              </div>

              {hasSubmitted && (
                <div className="flex-shrink-0">
                  {isTarget && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-bounce" />}
                  {isSelected && !isTarget && <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Rationale & Gemini Explanation Drawer (shown after selecting an option) */}
      <AnimatePresence>
        {hasSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4 pt-2"
          >
            {/* 1. Clinical / Board Exam Rationale (ALWAYS SHOWN when available in card data) */}
            {card.rationale && (
              <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                  <BookOpen className="w-4 h-4" />
                  <span>Clinical / Board Exam Rationale</span>
                </div>
                <div className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed pl-6 font-medium">
                  <FormattedCardText content={card.rationale} />
                </div>
              </div>
            )}

            {/* AI Explanation Loading State */}
            {isLoadingAi && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center gap-3 text-[var(--text-muted)] text-xs font-bold shadow-xs"
              >
                <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" />
                <span>Analyzing answer comparison...</span>
              </motion.div>
            )}

            {/* 2. Gemini AI Breakdown Card */}
            {aiExplanation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-sm space-y-3.5 relative overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2.5 text-xs font-extrabold text-[var(--text-main)]">
                  <div className="w-5 h-5 rounded-md bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <span>Concept Breakdown</span>
                </div>

                {/* A. Why Chosen Answer was Wrong (if incorrect) */}
                {!isSelectedCorrect && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                      <span>Why &ldquo;{cleanOptionLabel(selectedOption || '')}&rdquo; is incorrect:</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed pl-6">
                      {aiExplanation.whyWrong}
                    </p>
                  </div>
                )}

                {/* B. Why Correct Answer is Right */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>Why &ldquo;{cleanOptionLabel(card.back)}&rdquo; is correct:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed pl-6">
                    {aiExplanation.whyRight}
                  </p>
                </div>

                {/* C. Core Clinical Distinction */}
                {aiExplanation.keyDifference && (
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]">
                      <Scale className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                      <span>Key Distinction:</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed pl-6">
                      {aiExplanation.keyDifference}
                    </p>
                  </div>
                )}

                {/* D. Board Exam Tip / Mnemonic */}
                {aiExplanation.boardTip && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span>Recall Tip:</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed pl-6">
                      {aiExplanation.boardTip}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Manual Deep Dive Button for Correct Answers */}
            {isSelectedCorrect && !aiExplanation && !isLoadingAi && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
                  <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                  <span>Want deeper clinical context on this question?</span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchAiExplanation(selectedOption || card.back)}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-colors shadow-xs"
                >
                  Explain Concept
                </button>
              </div>
            )}

            {/* Continue / Next Question Button */}
            <button
              onClick={handleNext}
              className="w-full py-4 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-[0.99] text-white font-black text-sm shadow-[var(--btn-primary-shadow)] transition-all flex items-center justify-center gap-2"
            >
              <span>Continue (Press Enter)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
