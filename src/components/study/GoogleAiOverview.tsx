'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search
} from 'lucide-react';
import { MCExplanationResponse } from '@/types';

interface GoogleAiOverviewProps {
  explanation: MCExplanationResponse | null;
  isLoading: boolean;
  onRetry?: () => void;
  correctAnswer: string;
  userAnswer?: string;
  isCorrect?: boolean;
}

export const GoogleAiOverview: React.FC<GoogleAiOverviewProps> = ({
  explanation,
  isLoading,
  onRetry,
  correctAnswer,
  userAnswer,
  isCorrect
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="w-full p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm space-y-3.5 overflow-hidden relative">
        {/* Animated top Google AI gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 to-amber-500 animate-pulse" />

        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI Overview
            </span>
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <Search className="w-3 h-3" /> Synthesizing evidence from clinical nutrition literature...
            </span>
          </div>
        </div>

        {/* Shimmering placeholders */}
        <div className="space-y-2 pt-1 animate-pulse">
          <div className="h-3.5 bg-[var(--bg-surface-subtle)] rounded-md w-11/12" />
          <div className="h-3.5 bg-[var(--bg-surface-subtle)] rounded-md w-4/5" />
          <div className="h-3.5 bg-[var(--bg-surface-subtle)] rounded-md w-2/3" />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="h-12 rounded-xl bg-[var(--bg-surface-subtle)]/70 animate-pulse" />
          <div className="h-12 rounded-xl bg-[var(--bg-surface-subtle)]/70 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!explanation) return null;

  const sources = explanation.sources || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm overflow-hidden relative transition-all"
    >
      {/* Top Google-style multicolor gradient accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 via-purple-500 via-pink-500 to-amber-500" />

      {/* Header bar */}
      <div className="p-4 sm:p-4.5 pb-2 flex items-center justify-between border-b border-[var(--border-subtle)]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-500/15 to-purple-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                AI Overview
              </span>
              {isCorrect !== undefined && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                  isCorrect
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                }`}>
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Correct Answer Breakdown</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      <span>Missed Answer Review</span>
                    </>
                  )}
                </span>
              )}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)] hidden sm:inline">
                {explanation.isAiPowered !== false ? 'Gemini Clinical Search' : 'Clinical Synthesis'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onRetry && (
            <button
              onClick={onRetry}
              title="Regenerate explanation"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors flex items-center gap-1 text-xs"
          >
            {isExpanded ? (
              <>
                <span className="text-[11px] font-medium hidden sm:inline">Collapse</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span className="text-[11px] font-medium hidden sm:inline">Expand</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 sm:p-5 space-y-4 text-left"
          >
            {/* Cited Sources Carousel / Chips (Google Style) */}
            {sources.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-wider">
                  <BookOpen className="w-3 h-3" />
                  <span>Clinical Sources & Guidelines:</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {sources.map((source, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex-shrink-0 max-w-[260px] p-2.5 rounded-xl bg-[var(--bg-surface-subtle)]/70 hover:bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] transition-all text-left group"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-[9px] font-bold">
                          {sIdx + 1}
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-main)] truncate">
                          {source.title}
                        </span>
                      </div>
                      {source.relevance && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-1 pl-5">
                          {source.relevance}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Core Search Synthesis Overview */}
            {explanation.searchOverview && (
              <div className="p-3.5 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-xs sm:text-sm text-[var(--text-main)] leading-relaxed font-normal">
                {explanation.searchOverview}
              </div>
            )}

            {/* Why This is Right */}
            <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Why &ldquo;{correctAnswer}&rdquo; is correct:</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed pl-6 font-normal">
                {explanation.whyRight}
              </p>
            </div>

            {/* Why Other Choices / User's Choice is Not That */}
            {explanation.whyWrongChoices && (
              <div className="p-3.5 rounded-xl bg-slate-500/5 dark:bg-slate-500/10 border border-[var(--border-color)] space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>
                    {userAnswer && !isCorrect
                      ? `Why your answer ("${userAnswer}") is not that:`
                      : 'Why alternative choices are incorrect (Differential Breakdown):'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed pl-6 font-normal">
                  {explanation.whyWrongChoices}
                </p>
              </div>
            )}

            {/* Contrast / Key Difference (if provided separately) */}
            {explanation.keyDifference && !explanation.whyWrongChoices && (
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]">
                  <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span>Key Distinction:</span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed pl-6 font-normal">
                  {explanation.keyDifference}
                </p>
              </div>
            )}

            {/* High-Yield Board / Recall Tip */}
            {explanation.boardTip && (
              <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/25 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span>High-Yield Board Takeaway:</span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed pl-6 font-normal">
                  {explanation.boardTip}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
