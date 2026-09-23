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

  const [options, setOptions] = useState<string[]>([]);

  // Dynamically randomize and interchange option slots (A, B, C, D) whenever card is presented/updated
  useEffect(() => {
    const cleanBack = cleanOptionLabel(card.back || '');
    let pool: string[] = [];

    if (card.options && card.options.length >= 2) {
      const cleaned = card.options.map(opt => cleanOptionLabel(opt));
      pool = Array.from(new Set([...cleaned, cleanBack]));
    } else {
      pool = [cleanBack];
    }

    // Ensure 4 distinct options by pulling from other cards in the same deck first
    if (pool.length < 4) {
      const allDecks = useNutriStore.getState().decks;
      const currentDeck = allDecks.find(d => d.cards?.some(c => c.id === card.id));
      
      const sameDeckAnswers = (currentDeck?.cards || [])
        .filter(c => c.id !== card.id && c.back)
        .map(c => cleanOptionLabel(c.back))
        .filter(ans => ans && ans.toLowerCase() !== cleanBack.toLowerCase());
      
      const shuffledSame = shuffleArray(Array.from(new Set(sameDeckAnswers)));
      pool = Array.from(new Set([...pool, ...shuffledSame.slice(0, 4 - pool.length)]));
    }

    // If still under 4, pull from other decks in the user's collection
    if (pool.length < 4) {
      const allDecks = useNutriStore.getState().decks;
      const otherAnswers = allDecks.flatMap(d => d.cards || [])
        .filter(c => c.id !== card.id && c.back)
        .map(c => cleanOptionLabel(c.back || ''))
        .filter(ans => ans && ans.toLowerCase() !== cleanBack.toLowerCase());
      
      const shuffledOther = shuffleArray(Array.from(new Set(otherAnswers)));
      pool = Array.from(new Set([...pool, ...shuffledOther.slice(0, 4 - pool.length)]));
    }

    // Only if the entire collection has fewer than 4 cards total, add neutral educational distractors
    if (pool.length < 4) {
      const contextualFallbacks = [
        'None of the above',
        'Insufficient clinical criteria provided',
        'Requires additional diagnostic markers'
      ];
      for (const fallback of contextualFallbacks) {
        if (pool.length >= 4) break;
        if (!pool.includes(fallback) && fallback.toLowerCase() !== cleanBack.toLowerCase()) {
          pool.push(fallback);
        }
      }
    }

    // Thoroughly shuffle so placement of correct answer changes (e.g. from 4th to 1st/A)
    setOptions(shuffleArray(pool.slice(0, 4)));
    setSelectedOption(null);
    setHasSubmitted(false);
    setAiExplanation(null);
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
    } catch (e: any) {
      console.warn('Failed to fetch AI explanation:', e);
      setAiExplanation({
        whyRight: '',
        isAiPowered: false,
        unavailable: true,
        error: e?.message || 'Network error',
        authorRationale: card.rationale || undefined
      });
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
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isExpired, hasSubmitted]);

  const handleSelectOption = (option: string) => {
    if (hasSubmitted) return;

    setSelectedOption(option);
    setHasSubmitted(true);
    const isCorrect = normalizeForComparison(option) === normalizeForComparison(card.back);

    if (isCorrect) {
      soundEffects.playCorrect();
    } else {
      soundEffects.playIncorrect();
    }
  };

  const handleNext = useCallback(() => {
    const isCorrect = selectedOption ? normalizeForComparison(selectedOption) === normalizeForComparison(card.back) : false;
    const rating: ReviewRating = isCorrect ? 'good' : 'again';
    onAnswer({
      rating,
      isCorrect,
      selectedOption: selectedOption || 'Time Expired'
    });
  }, [selectedOption, normalizeForComparison, card.back, onAnswer]);

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
  }, [hasSubmitted, handleNext]);

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center space-y-6">
      {/* Question Card */}
      <div className="w-full rounded-xl p-6 sm:p-7 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3">
        {/* Tags & Mode Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
              >
                <Tag className="w-3 h-3 text-[var(--primary)]" />
                {tag}
              </span>
            ))}
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-subtle)]">
            <HelpCircle className="w-3.5 h-3.5" /> Multiple Choice
          </span>
        </div>

        {/* Question Text */}
        <div className="py-2">
          <div className="text-lg sm:text-xl font-bold text-[var(--text-main)] leading-relaxed">
            <FormattedCardText content={displayQuestion} />
          </div>
        </div>
      </div>

      {/* Options Grid */}
      <div
        role="radiogroup"
        aria-label="Multiple choice answer options"
        className="w-full grid grid-cols-1 gap-2.5"
      >
        {options.map((option, idx) => {
          const isTarget = normalizeForComparison(option) === normalizeForComparison(card.back);
          const isSelected = selectedOption === option;

          let containerStyle = 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--primary)] hover:bg-[var(--bg-surface-subtle)]';
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
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : hasSubmitted && isSelected && !isTarget
                      ? 'bg-rose-600 text-white shadow-xs'
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

      {/* Rationale & Optional Gemini Explanation Drawer */}
      <AnimatePresence>
        {hasSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4 pt-2"
          >
            {/* Standard Clinical / Board Exam Rationale */}
            {card.rationale && (
              <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                  <BookOpen className="w-4 h-4" />
                  <span>Clinical / Board Exam Rationale</span>
                </div>
                <div className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed pl-6 font-medium">
                  <FormattedCardText content={card.rationale} />
                </div>
              </div>
            )}

            {/* On-Demand AI Overview Button (Save Tokens - Only Fetches When Clicked) */}
            {!aiExplanation && !isLoadingAi && (
              <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] min-w-0">
                  <Sparkles className={`w-4 h-4 flex-shrink-0 ${selectedOption && normalizeForComparison(selectedOption) === normalizeForComparison(card.back) ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`} />
                  <span className="truncate">Clinical AI Breakdown</span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchAiExplanation(selectedOption || card.back)}
                  className={`px-3 py-1.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] transition-all shadow-xs flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap active:scale-95 cursor-pointer ${
                    selectedOption && normalizeForComparison(selectedOption) === normalizeForComparison(card.back)
                      ? 'hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-700 dark:hover:text-emerald-300'
                      : 'hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-700 dark:hover:text-amber-300'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 ${selectedOption && normalizeForComparison(selectedOption) === normalizeForComparison(card.back) ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`} />
                  <span>AI Overview</span>
                </button>
              </div>
            )}

            {/* Google-Style AI Overview & Clinical Literature Breakdown */}
            {(aiExplanation || isLoadingAi) && (
              <GoogleAiOverview
                explanation={aiExplanation}
                isLoading={isLoadingAi}
                onRetry={() => fetchAiExplanation(selectedOption || card.back)}
                correctAnswer={cleanOptionLabel(card.back)}
                userAnswer={selectedOption ? cleanOptionLabel(selectedOption) : undefined}
                isCorrect={selectedOption ? normalizeForComparison(selectedOption) === normalizeForComparison(card.back) : false}
              />
            )}

            {/* Self-Notes & Card Correction Per Item */}
            <SelfNoteInput
              cardId={card.id}
              deckId={card.deckId}
              card={card}
              initialNote={card.userNotes || ''}
            />

            {/* Continue / Next Question Button */}
            <button
              onClick={handleNext}
              className="w-full py-3.5 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-[0.99] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue</span>
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


