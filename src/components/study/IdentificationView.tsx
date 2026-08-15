'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, CheckCircle2, AlertCircle, XCircle, ArrowRight, Tag, BookOpen, Loader2 } from 'lucide-react';
import { Flashcard, ReviewRating, AIGradeResponse } from '@/types';
import { soundEffects } from '@/lib/soundEffects';
import { FormattedCardText } from './FormattedCardText';

interface IdentificationViewProps {
  card: Flashcard;
  onAnswer: (result: {
    rating: ReviewRating;
    isCorrect: boolean;
    userAnswer: string;
    verdict: 'correct' | 'partially_correct' | 'incorrect';
    feedback: string;
  }) => void;
  isExpired?: boolean;
}

export const IdentificationView: React.FC<IdentificationViewProps> = ({
  card,
  onAnswer,
  isExpired = false
}) => {
  const [inputAnswer, setInputAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradeResult, setGradeResult] = useState<AIGradeResponse | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async (overrideAnswer?: string) => {
    const textToSubmit = overrideAnswer !== undefined ? overrideAnswer : inputAnswer;
    if (isSubmitting || gradeResult) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: card.front,
          targetAnswer: card.back,
          userAnswer: textToSubmit,
          rationale: card.rationale
        })
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate answer');
      }

      const result: AIGradeResponse = await response.json();
      setGradeResult(result);

      if (result.verdict === 'correct') {
        soundEffects.playCorrect();
      } else if (result.verdict === 'partially_correct') {
        soundEffects.playRating('good');
      } else {
        soundEffects.playIncorrect();
      }
    } catch {
      // Fallback evaluation
      const isExact = textToSubmit.trim().toLowerCase() === card.back.trim().toLowerCase();
      const fallbackResult: AIGradeResponse = {
        verdict: isExact ? 'correct' : 'incorrect',
        score: isExact ? 100 : 0,
        feedback: isExact ? 'Correct answer!' : 'Review the definition below.',
        rationale: card.rationale,
        suggestedAnswer: card.back
      };
      setGradeResult(fallbackResult);
      if (isExact) soundEffects.playCorrect();
      else soundEffects.playIncorrect();
    } finally {
      setIsSubmitting(false);
    }
  }, [card.front, card.back, card.rationale, inputAnswer, isSubmitting, gradeResult]);

  // Auto focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Handle timer expiration
  useEffect(() => {
    if (isExpired && !gradeResult && !isSubmitting) {
      const timer = setTimeout(() => {
        handleSubmit('Time Expired');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isExpired, gradeResult, isSubmitting, handleSubmit]);

  const handleNext = () => {
    if (!gradeResult) return;

    let rating: ReviewRating = 'again';
    let isCorrect = false;

    if (gradeResult.verdict === 'correct') {
      rating = 'easy';
      isCorrect = true;
    } else if (gradeResult.verdict === 'partially_correct') {
      rating = 'hard';
      isCorrect = true;
    } else {
      rating = 'again';
      isCorrect = false;
    }

    onAnswer({
      rating,
      isCorrect,
      userAnswer: inputAnswer,
      verdict: gradeResult.verdict,
      feedback: gradeResult.feedback
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!gradeResult && !isSubmitting && inputAnswer.trim().length > 0) {
        handleSubmit();
      } else if (gradeResult) {
        handleNext();
      }
    }
  };

  const verdictConfig = {
    correct: {
      label: 'Correct! 🌟',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      icon: CheckCircle2,
      borderClass: 'border-emerald-500 ring-2 ring-emerald-400/30'
    },
    partially_correct: {
      label: 'Partially Correct ✨',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      icon: AlertCircle,
      borderClass: 'border-amber-500 ring-2 ring-amber-400/30'
    },
    incorrect: {
      label: 'Needs Review 📖',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
      icon: XCircle,
      borderClass: 'border-rose-500 ring-2 ring-rose-400/30'
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center space-y-6">
      {/* Question Card */}
      <div className="w-full rounded-3xl p-6 sm:p-8 bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-[var(--card-shadow)] space-y-4">
        {/* Tags */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]"
              >
                <Tag className="w-3 h-3 text-[var(--primary)]" />
                {tag}
              </span>
            ))}
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400">
            <Sparkles className="w-3.5 h-3.5" /> AI Identification
          </span>
        </div>

        {/* Prompt */}
        <div className="py-2">
          <div className="text-lg sm:text-xl font-extrabold text-[var(--text-main)] leading-relaxed">
            <FormattedCardText content={card.front} />
          </div>
        </div>
      </div>

      {/* Answer Input Box */}
      <div className="w-full space-y-3">
        <div className="relative">
          <textarea
            ref={inputRef}
            rows={3}
            value={inputAnswer}
            onChange={(e) => setInputAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting || gradeResult !== null}
            aria-label="Clinical identification answer input"
            placeholder="Type your answer, formula, or medical term here... (Press Enter to submit)"
            className={`w-full p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface)] border-2 transition-all outline-none text-sm sm:text-base font-medium text-[var(--text-main)] placeholder:text-[var(--text-subtle)] resize-none shadow-xs ${
              gradeResult
                ? verdictConfig[gradeResult.verdict].borderClass
                : 'border-[var(--border-color)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-light)]'
            }`}
          />

          {!gradeResult && (
            <div className="absolute right-4 bottom-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSubmit()}
                disabled={isSubmitting || inputAnswer.trim().length === 0}
                aria-label="Submit clinical response"
                className="p-3 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:hover:bg-[var(--primary)] text-white shadow-sm transition-all flex items-center justify-center"
                title="Submit Answer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </motion.button>
            </div>
          )}
        </div>

        {/* AI Loading state */}
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800"
          >
            <Sparkles className="w-4 h-4 animate-spin text-[var(--primary)]" />
            <span>Analyzing your clinical response...</span>
          </motion.div>
        )}
      </div>

      {/* AI Grade Result Drawer */}
      <AnimatePresence>
        {gradeResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            role="region"
            aria-live="polite"
            aria-label="Grading evaluation"
            className="w-full space-y-4"
          >
            <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-[var(--card-shadow)] space-y-4">
              {/* Verdict Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {React.createElement(verdictConfig[gradeResult.verdict].icon, {
                    className: `w-5 h-5 ${
                      gradeResult.verdict === 'correct'
                        ? 'text-emerald-600'
                        : gradeResult.verdict === 'partially_correct'
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`
                  })}
                  <span className="font-extrabold text-sm text-[var(--text-main)]">
                    {verdictConfig[gradeResult.verdict].label}
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${verdictConfig[gradeResult.verdict].badgeClass}`}
                >
                  Score: {gradeResult.score}%
                </span>
              </div>

              {/* AI Feedback */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs sm:text-sm font-medium text-[var(--text-main)]">
                <div className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400 mb-1 text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Professor Feedback
                </div>
                {gradeResult.feedback}
              </div>

              {/* Target Key Answer */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                  Expected Board Key
                </span>
                <div className="text-sm font-bold text-[var(--primary)]">
                  <FormattedCardText content={gradeResult.suggestedAnswer || card.back} />
                </div>
              </div>

              {/* Scientific Rationale */}
              {card.rationale && (
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-main)]">
                    <BookOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>Clinical / Exam Rationale</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] leading-relaxed">
                    <FormattedCardText content={card.rationale} />
                  </div>
                </div>
              )}
            </div>

            {/* Next Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
              className="w-full py-4 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-bold shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>Next Question (Press Enter)</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
