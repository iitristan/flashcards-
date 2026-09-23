'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, BookOpen, Lightbulb, Tag, Check, ArrowRight, Sparkles } from 'lucide-react';

import { Flashcard, ReviewRating, MCExplanationResponse } from '@/types';
import { getIntervalLabel } from '@/lib/services/flashcardService';
import { useNutriStore } from '@/lib/store/useNutriStore';
import { FormattedCardText } from './FormattedCardText';
import { soundEffects } from '@/lib/soundEffects';
import { SelfNoteInput } from './SelfNoteInput';
import { GoogleAiOverview } from './GoogleAiOverview';

interface SpacedRepetitionCardProps {

  card: Flashcard;
  onRate: (rating: ReviewRating) => void;
  isExpired?: boolean;
}

export const SpacedRepetitionCard: React.FC<SpacedRepetitionCardProps> = ({
  card,
  onRate,
  isExpired = false
}) => {
  const { preferences } = useNutriStore();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<MCExplanationResponse | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const fetchAiExplanation = useCallback(async () => {
    if (isLoadingAi || (aiExplanation && !aiExplanation.unavailable)) return;
    setIsLoadingAi(true);
    try {
      const res = await fetch('/api/explain-mc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: card.front,
          userAnswer: card.back,
          correctAnswer: card.back,
          allOptions: [card.back],
          rationale: card.rationale || '',
          apiKey: preferences.geminiApiKey || undefined
        })
      });
      if (res.ok) {
        const data: MCExplanationResponse = await res.json();
        setAiExplanation(data);
      } else {
        const errData = await res.json().catch(() => null);
        setAiExplanation({
          whyRight: '',
          isAiPowered: false,
          unavailable: true,
          error: errData?.error || `Service temporarily unavailable (${res.status})`,
          authorRationale: card.rationale || undefined
        });
      }
    } catch (err: any) {
      console.warn('Failed to fetch AI explanation in flashcard:', err);
      setAiExplanation({
        whyRight: '',
        isAiPowered: false,
        unavailable: true,
        error: err?.message || 'Network error',
        authorRationale: card.rationale || undefined
      });
    } finally {
      setIsLoadingAi(false);
    }
  }, [card.front, card.back, card.rationale, aiExplanation, isLoadingAi, preferences.geminiApiKey]);

  // Auto flip if timer expired
  useEffect(() => {
    if (isExpired && !isFlipped) {
      const timer = setTimeout(() => {
        setIsFlipped(true);
        soundEffects.playFlip();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isExpired, isFlipped]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => {
      soundEffects.playFlip();
      return !prev;
    });
  }, []);

  const handleRate = useCallback((rating: ReviewRating) => {
    soundEffects.playRating(rating);
    onRate(rating);
  }, [onRate]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (isFlipped) {
        if (e.key === '1') handleRate('again');
        if (e.key === '2') handleRate('hard');
        if (e.key === '3') handleRate('good');
        if (e.key === '4') handleRate('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleRate, isFlipped]);

  const ratingButtons: {
    rating: ReviewRating;
    label: string;
    key: string;
    interval: string;
    color: string;
    hoverColor: string;
    border: string;
  }[] = [
    {
      rating: 'again',
      label: 'Again',
      key: '1',
      interval: getIntervalLabel(card.sm2, 'again'),
      color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
      hoverColor: 'hover:bg-rose-100 dark:hover:bg-rose-900/60',
      border: 'border-rose-200 dark:border-rose-800'
    },
    {
      rating: 'hard',
      label: 'Hard',
      key: '2',
      interval: getIntervalLabel(card.sm2, 'hard'),
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
      hoverColor: 'hover:bg-amber-100 dark:hover:bg-amber-900/60',
      border: 'border-amber-200 dark:border-amber-800'
    },
    {
      rating: 'good',
      label: 'Good',
      key: '3',
      interval: getIntervalLabel(card.sm2, 'good'),
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      hoverColor: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
      border: 'border-emerald-200 dark:border-emerald-800'
    },
    {
      rating: 'easy',
      label: 'Easy',
      key: '4',
      interval: getIntervalLabel(card.sm2, 'easy'),
      color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
      hoverColor: 'hover:bg-sky-100 dark:hover:bg-sky-900/60',
      border: 'border-sky-200 dark:border-sky-800'
    }
  ];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* 3D Flashcard Container */}
      <div
        tabIndex={0}
        role="button"
        aria-label={isFlipped ? "Flashcard answer revealed. Press Space or Enter to flip back." : "Flashcard question. Press Space or Enter to reveal answer."}
        className="w-full h-[380px] sm:h-[420px] perspective-1000 cursor-pointer select-none rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:outline-hidden"
        onClick={handleFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleFlip();
          }
        }}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 25 }}
          className="w-full h-full relative transform-style-preserve-3d"
        >
          {/* FRONT OF CARD */}
          <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl p-6 sm:p-8 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs hover:border-[var(--border-color-strong)] transition-all flex flex-col justify-between overflow-hidden">
            {/* Top Card Header */}
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

              <div className="flex items-center gap-1 text-xs font-semibold text-[var(--text-subtle)]">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Space to flip</span>
              </div>
            </div>

            {/* Front Question Content */}
            <div className="my-auto py-4 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] mb-2 block">
                Board Exam Question
              </span>
              <div className="text-lg sm:text-2xl font-extrabold text-[var(--text-main)] leading-relaxed">
                <FormattedCardText content={card.front} />
              </div>
            </div>

            {/* Bottom Card Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
              {card.rationale ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(!showHint);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                </button>
              ) : <div />}

              <span className="text-xs font-bold text-[var(--primary)] flex items-center gap-1">
                Reveal Answer <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            {/* Hint overlay */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-16 left-6 right-6 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200"
                >
                  <span className="font-bold">💡 Hint: </span>
                  {card.rationale.substring(0, 100)}...
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* BACK OF CARD (Rotated 180deg) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl p-6 sm:p-8 bg-[var(--bg-surface)] border border-[var(--primary)] shadow-xs flex flex-col justify-between overflow-y-auto">
            {/* Back Card Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Check className="w-3.5 h-3.5" /> Correct Answer
              </span>
              <span className="text-xs font-medium text-[var(--text-subtle)]">
                Click card to flip back
              </span>
            </div>

            {/* Target Answer */}
            <div className="my-auto py-3 space-y-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-[var(--primary)]">
                  <FormattedCardText content={card.back} />
                </div>
              </div>

              {/* Clinical / Exam Rationale */}
              {card.rationale && (
                <div className="p-4 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-1.5 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-main)]">
                    <BookOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>Clinical / Exam Rationale</span>
                  </div>
                  <div className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                    <FormattedCardText content={card.rationale} />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom rating reminder */}
            <div className="text-center text-[11px] font-medium text-[var(--text-subtle)] pt-2">
              How well did you know this? Rate below (Keys 1-4)
            </div>
          </div>
        </motion.div>
      </div>

      {/* SM-2 Rating Controls & Self-Notes */}
      <div className="w-full mt-6 space-y-4">
        <AnimatePresence>
          {isFlipped ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {ratingButtons.map((btn) => (
                  <button
                    key={btn.rating}
                    onClick={() => handleRate(btn.rating)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border ${btn.border} ${btn.color} ${btn.hoverColor} transition-all active:scale-95 shadow-xs group`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold">{btn.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-black/10 dark:bg-white/10 font-mono">
                        {btn.key}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium opacity-75 mt-0.5">
                      {btn.interval}
                    </span>
                  </button>
                ))}
              </div>

              {/* On-Demand AI Overview Button for Flashcards (Save Tokens) */}
              {!aiExplanation && !isLoadingAi && (
                <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] min-w-0">
                    <Sparkles className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                    <span className="truncate">Clinical AI Breakdown</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchAiExplanation}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface-subtle)] hover:bg-[var(--primary)]/10 border border-[var(--border-color)] hover:border-[var(--primary)]/30 text-xs font-bold text-[var(--text-main)] hover:text-[var(--primary)] transition-all shadow-xs flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0" />
                    <span>AI Overview</span>
                  </button>
                </div>
              )}

              {/* Google-Style AI Overview with Citations */}
              {(aiExplanation || isLoadingAi) && (
                <GoogleAiOverview
                  explanation={aiExplanation}
                  isLoading={isLoadingAi}
                  onRetry={fetchAiExplanation}
                  correctAnswer={card.back}
                />
              )}

              {/* Personal Self-Notes & Card Correction */}
              <SelfNoteInput
                cardId={card.id}
                deckId={card.deckId}
                card={card}
                initialNote={card.userNotes || ''}
              />
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleFlip}
              className="w-full py-3.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-semibold shadow-xs transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>Flip Card to See Answer (or Press Space)</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
