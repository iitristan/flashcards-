'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  ExternalLink
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
  const [elapsedMs, setElapsedMs] = useState(0);

  // Live timer while loading AI explanation
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isLoading) {
      const start = Date.now();
      setElapsedMs(0);
      interval = setInterval(() => {
        setElapsedMs(Date.now() - start);
      }, 100);
    } else {
      setElapsedMs(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  if (isLoading) {
    const seconds = (elapsedMs / 1000).toFixed(1);
    return (
      <div className="w-full p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm space-y-3.5 overflow-hidden relative">
        {/* Animated top Google AI gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 to-amber-500 animate-pulse" />

        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI Overview
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">
                  {seconds}s elapsed
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                <Search className="w-3 h-3 text-[var(--primary)] animate-pulse" /> Querying Gemini 3.5 Flash & Clinical Literature...
              </span>
            </div>
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

  const isUnavailable =
    Boolean(explanation.unavailable) ||
    (!explanation.whyRight && !explanation.searchOverview) ||
    (explanation.isAiPowered === false && !explanation.whyRight);

  if (isUnavailable) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm overflow-hidden relative text-left"
      >
        {/* Amber-to-purple gradient top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500" />

        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 flex-shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                    AI Overview Temporarily Busy
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    High Demand Spike
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Google Gemini encountered a brief load spike or rate limit. Rather than showing a generic placeholder, you can retry generating the full clinical breakdown directly.
                </p>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2.5 pt-0.5">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry with Gemini</span>
              </button>
            )}
          </div>

          {/* Optional Deck Author Note if the card had one */}
          {explanation.authorRationale && (
            <div className="mt-2 p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1 text-left">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-subtle)] uppercase tracking-wider">
                <BookOpen className="w-3 h-3 text-[var(--primary)]" />
                <span>Original Deck Note:</span>
              </div>
              <p className="text-xs text-[var(--text-main)] leading-relaxed">
                {explanation.authorRationale}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  const sources = explanation.sources || [];
  const modelName = explanation.modelUsed || (explanation.isAiPowered !== false ? 'Gemini 3.5 Flash' : 'Clinical Literature Engine');
  const elapsedFormatted = explanation.generationTimeMs !== undefined
    ? `${(explanation.generationTimeMs / 1000).toFixed(1)}s`
    : null;

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
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                AI Overview
              </span>

              {/* Model & Time Elapsed Pill */}
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1">
                <span>{modelName}</span>
                {elapsedFormatted && <span>• {elapsedFormatted}</span>}
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
                      <span>Correct Breakdown</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      <span>Missed Review</span>
                    </>
                  )}
                </span>
              )}
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
            {/* Cited Sources Carousel / Chips (Google Style - Clickable) */}
            {sources.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-wider">
                    <BookOpen className="w-3 h-3 text-[var(--primary)]" />
                    <span>Clinical Sources & Guidelines:</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] italic hidden sm:inline">
                    Click any source to verify reference ↗
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {sources.map((source, sIdx) => {
                    const href = source.url || '';
                    const hasPmid = source.pmid && source.pmid.length >= 6;
                    const hasDoi = source.doi && source.doi.startsWith('10.');
                    const hasLink = !!href;

                    const Tag = hasLink ? 'a' : 'div';
                    const linkProps = hasLink ? {
                      href,
                      target: '_blank' as const,
                      rel: 'noopener noreferrer',
                    } : {};

                    return (
                      <Tag
                        key={sIdx}
                        {...linkProps}
                        title={hasLink ? `Open: ${source.title}` : source.title}
                        className={`flex-shrink-0 max-w-[320px] p-2.5 rounded-xl bg-[var(--bg-surface-subtle)]/70 border border-[var(--border-color)] transition-all text-left group shadow-xs block ${
                          hasLink ? 'hover:bg-blue-500/10 hover:border-blue-500/40 cursor-pointer' : 'opacity-90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-4 h-4 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-[9px] font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              {sIdx + 1}
                            </div>
                            <span className="text-xs font-semibold text-[var(--text-main)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {source.title}
                            </span>
                          </div>
                          {hasLink && (
                            <ExternalLink className="w-3 h-3 text-[var(--text-muted)] group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                          )}
                        </div>
                        {source.relevance && (
                          <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-1 pl-5">
                            {source.relevance}
                          </p>
                        )}
                        {(hasPmid || hasDoi) && (
                          <div className="flex items-center gap-1.5 mt-1 pl-5">
                            {hasPmid && (
                              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15">
                                PMID: {source.pmid}
                              </span>
                            )}
                            {hasDoi && (
                              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/15">
                                DOI: {source.doi}
                              </span>
                            )}
                          </div>
                        )}
                      </Tag>
                    );
                  })}
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
