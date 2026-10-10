"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Play,
  X,
  RotateCcw,
  AlertCircle,
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  Tag,
  Check,
  Info
} from "lucide-react";
import { useBoardReadiness } from "@/lib/hooks/useBoardReadiness";
import { useNutriStore } from "@/lib/store/useNutriStore";
import {
  NDLESubject,
  NDLE_SUBJECT_LIST,
  NDLE_SUBJECT_CONFIGS,
} from "@/types/ndle";

import { CardFilterOption, CardSortOption, DEFAULT_CARD_GROUP_FILTERS } from "@/types";

interface BoardReadinessViewProps {
  onStartSubjectPractice?: (
    subject: NDLESubject,
    searchQuery?: string,
    filter?: CardFilterOption,
    sort?: CardSortOption,
    options?: {
      resume?: boolean;
      startFresh?: boolean;
      missedOnly?: boolean;
    }
  ) => void;
  initialSearchQuery?: string;
  onOpenFilterManager?: () => void;
}

export const BoardReadinessView: React.FC<BoardReadinessViewProps> = ({
  onStartSubjectPractice,
  initialSearchQuery = "",
  onOpenFilterManager,
}) => {
  const {
    report,
    reviewLogs,
    isLoadingLogs,
    isCategorizing,
    categorizeProgress,
    autoClassifyAllCards,
    unclassifiedCardsCount,
    refresh,
  } = useBoardReadiness();

  const {
    startPracticeAreaSession,
    preferences,
    deckCheckpoints,
    getDeckCheckpoint,
    clearDeckCheckpoint,
    cardGroupFilters,
    updateGroupFilterConfig,
    toggleGroupFilterItem
  } = useNutriStore();
  const isDark = preferences.theme === "dark";

  const [activeMetricView, setActiveMetricView] = useState<"probability" | "gwa">(
    "probability"
  );
  const [showCategorizeModal, setShowCategorizeModal] = useState(false);
  const [categorizeMessage, setCategorizeMessage] = useState<string | null>(null);
  const [selectedSubjectModal, setSelectedSubjectModal] = useState<NDLESubject | null>(null);
  const [expandedFilterSubject, setExpandedFilterSubject] = useState<NDLESubject | null>(null);

  const getSubjectCheckpoint = (subjectName: NDLESubject) => {
    const cfg = NDLE_SUBJECT_CONFIGS[subjectName];
    const pDeckId = `practice-area-${cfg.code}`;
    return deckCheckpoints[pDeckId] || getDeckCheckpoint(pDeckId);
  };

  const getSubjectWrongCount = (subjectName: NDLESubject) => {
    const cfg = NDLE_SUBJECT_CONFIGS[subjectName];
    const pDeckId = `practice-area-${cfg.code}`;
    const cp = deckCheckpoints[pDeckId] || getDeckCheckpoint(pDeckId);
    const cpMissed = (cp?.results || []).filter(r => !r.isCorrect || r.rating === 'again' || r.rating === 'hard').length;

    let historicalMissed = 0;
    if (reviewLogs && reviewLogs.length > 0) {
      const missedCardIds = new Set<string>();
      for (const log of reviewLogs) {
        if (!log.isCorrect || log.rating === 'again' || log.rating === 'hard') {
          missedCardIds.add(log.cardId);
        }
      }
      historicalMissed = missedCardIds.size;
    }
    return Math.max(cpMissed, historicalMissed);
  };

  // Handle starting targeted practice for an NDLE subject with its own independent filters
  const handlePracticeSubject = (
    subject: NDLESubject,
    options?: {
      resume?: boolean;
      startFresh?: boolean;
      missedOnly?: boolean;
    }
  ) => {
    const cfg = NDLE_SUBJECT_CONFIGS[subject];
    const groupKey = cfg?.code === 'NBCD' ? 'nbcd' : cfg?.code === 'CPHN' ? 'cphn' : 'ffss';
    const group = cardGroupFilters[groupKey] || DEFAULT_CARD_GROUP_FILTERS[groupKey];

    const sort = group?.activeSort || 'default';
    const filter = options?.missedOnly ? 'wrong' : (group?.stageFilter || 'all');
    const search = (group?.searchQuery || '').trim();

    if (onStartSubjectPractice) {
      onStartSubjectPractice(subject, search, filter, sort, options);
      return;
    }

    startPracticeAreaSession(subject, {
      searchQuery: search,
      filter,
      sort,
      resume: options?.resume,
      startFresh: options?.startFresh,
      missedOnly: options?.missedOnly,
    });
  };

  const handleRunAutoClassify = async () => {
    setCategorizeMessage("Inspecting cards with NDLE AI pipeline...");
    const res = await autoClassifyAllCards();
    if (res && res.updatedCount > 0) {
      setCategorizeMessage(
        `Successfully auto-categorized ${res.updatedCount} cards into official NDLE subjects!`
      );
      setTimeout(() => {
        setShowCategorizeModal(false);
        setCategorizeMessage(null);
      }, 1500);
    } else {
      setCategorizeMessage("All cards are already tagged with NDLE subjects!");
      setTimeout(() => {
        setShowCategorizeModal(false);
        setCategorizeMessage(null);
      }, 1500);
    }
  };

  // Responsive circular gauge metrics
  const displayScore =
    activeMetricView === "probability"
      ? report.passingProbability
      : Math.round(report.gwa);

  // SVG dimensions for smooth responsiveness
  const size = 180;
  const stroke = 15;
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, displayScore)) / 100) * circumference;

  // Curated, theme-resilient color palette matching inspiration reference
  let arcHexColor = "#F97316"; // warm orange
  let centerTextColor = isDark ? "text-orange-400" : "text-orange-600";
  let pillClasses = isDark
    ? "bg-[#351C12] text-[#FDBA74] border-[#542813]"
    : "bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]";
  let emoji = "😐";
  let statusText = "Needs reinforcement";

  if (report.status === "ready") {
    arcHexColor = "#10B981"; // emerald green
    centerTextColor = isDark ? "text-emerald-400" : "text-emerald-600";
    pillClasses = isDark
      ? "bg-[#093325] text-[#6EE7B7] border-[#0D4A36]"
      : "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]";
    emoji = "🎉";
    statusText = "Board Ready";
  } else if (report.status === "conditioned_alert") {
    arcHexColor = "#EF4444"; // crimson red
    centerTextColor = isDark ? "text-red-400" : "text-red-600";
    pillClasses = isDark
      ? "bg-[#351518] text-[#FCA5A5] border-[#591C24]"
      : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]";
    emoji = "⚠️";
    statusText = report.hasConditionedSubject
      ? `Needs reinforcement (${report.conditionedSubjectNames[0]?.split(" ")[0]} <50%)`
      : "Needs reinforcement";
  } else if (report.status === "gathering_data") {
    arcHexColor = isDark ? "#64748B" : "#94A3B8";
    centerTextColor = isDark ? "text-slate-400" : "text-slate-600";
    pillClasses = isDark
      ? "bg-[#1E293B] text-[#CBD5E1] border-[#334155]"
      : "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]";
    emoji = "📊";
    statusText = "Gathering exam data";
  }

  return (
    <div className="w-full max-w-xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-6 sm:space-y-7 animate-in fade-in duration-300">
      {/* ------------------------------------------------------------- */}
      {/* HERO SECTION: CIRCULAR DONUT GAUGE (Exact match to reference) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col items-center justify-center text-center space-y-3.5 pt-1 sm:pt-2">
        {/* Donut Chart Container */}
        <div className="relative flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90"
          >
            {/* Background Track - Never pitch black */}
            <circle
              fill="none"
              strokeWidth={stroke}
              r={radius}
              cx={size / 2}
              cy={size / 2}
              style={{ stroke: isDark ? "#242C3D" : "#EEF2F6" }}
            />
            {/* Active Colored Value Arc */}
            <circle
              fill="none"
              strokeWidth={stroke}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{ strokeDashoffset, stroke: arcHexColor }}
              strokeLinecap="round"
              r={radius}
              cx={size / 2}
              cy={size / 2}
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Centered Large Percentage & Subtext */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <span
              className={`text-4xl sm:text-5xl font-black tracking-tight leading-none ${centerTextColor}`}
            >
              {displayScore}%
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
              {report.totalAttempts > 0
                ? `${report.totalCorrect} of ${report.totalAttempts} correct`
                : "No attempts yet"}
            </span>
          </div>
        </div>

        {/* Status Pill Badge (Exact matching aesthetic from inspiration reference) */}
        <div
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-bold shadow-2xs transition-all ${pillClasses}`}
        >
          <span className="text-base leading-none">{emoji}</span>
          <span>{statusText}</span>
        </div>

        {/* Minimal Metric Switcher (Segmented Control) */}
        <div className="flex items-center gap-1.5 pt-1">
          <div className="flex items-center p-0.5 rounded-xl bg-muted/80 border border-border/50 text-[11px] font-bold">
            <button
              onClick={() => setActiveMetricView("probability")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeMetricView === "probability"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Passing Probability
            </button>
            <button
              onClick={() => setActiveMetricView("gwa")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeMetricView === "gwa"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              NDLE GWA
            </button>
          </div>

          <button
            onClick={() => refresh()}
            aria-label="Refresh calculations"
            title="Refresh metrics"
            className="p-1.5 rounded-xl border border-border/50 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingLogs ? "animate-spin text-primary" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TASTEFUL CONDITIONED ALERT CALLOUT (Clean & High Contrast)    */}
      {/* ------------------------------------------------------------- */}
      {report.hasConditionedSubject && (
        <div
          className={`rounded-2xl border p-4 text-xs flex items-start gap-3 shadow-xs animate-in fade-in ${
            isDark
              ? "bg-[#251215] border-[#4A1A22] text-[#FCA5A5]"
              : "bg-[#FFF5F5] border-[#FED7D7] text-[#9B2C2C]"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isDark
                ? "bg-[#3B171D] text-[#F87171]"
                : "bg-[#FEE2E2] text-[#DC2626]"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1 leading-relaxed">
            <p
              className={`font-bold text-sm ${
                isDark ? "text-[#FECACA]" : "text-[#7F1D1D]"
              }`}
            >
              Official PRC NDLE Conditioned Alert (&le; 50% Cut-off)
            </p>
            <p
              className={`text-xs font-medium ${
                isDark ? "text-[#FCA5A5]/90" : "text-[#991B1B]"
              }`}
            >
              Under Philippine Republic Act No. 10862, an examinee who receives a grade below 50% in any subject is <strong>Conditioned</strong> or <strong>Fails</strong>, regardless of overall GWA.
            </p>
            <p
              className={`text-[11px] font-bold pt-0.5 ${
                isDark ? "text-[#F87171]" : "text-[#DC2626]"
              }`}
            >
              Priority action needed in:{" "}
              <span className="underline font-extrabold">
                {report.conditionedSubjectNames.join(", ")}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION: BY PRACTICE AREA (Faithful to inspiration screenshot) */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] sm:text-xs font-bold tracking-widest text-muted-foreground uppercase">
            BY PRACTICE AREA
          </h3>

          <div className="flex items-center gap-3">
            {onOpenFilterManager && (
              <button
                type="button"
                onClick={onOpenFilterManager}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Manage Filters & Sorting</span>
              </button>
            )}

            {unclassifiedCardsCount > 0 && (
              <button
                onClick={() => setShowCategorizeModal(true)}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Tag ({unclassifiedCardsCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Practice Area Segregation Notice Bar */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
            <span className="text-[11px] text-[var(--text-muted)]">
              <strong>Independent Filters Active:</strong> Each practice area uses its own filter tags and sorting. Modifying <em>Clinical Nutrition</em> will not alter <em>Community</em> or <em>Food Service</em>.
            </span>
          </div>
        </div>

        {/* Practice Area Card Container */}
        <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] p-4 sm:p-6 shadow-[var(--card-shadow)] space-y-6">
          {NDLE_SUBJECT_LIST.map((subjectName) => {
            const perf = report.subjectBreakdown[subjectName];
            const config = NDLE_SUBJECT_CONFIGS[subjectName];
            const groupKey = config.code === 'NBCD' ? 'nbcd' : config.code === 'CPHN' ? 'cphn' : 'ffss';
            const groupConfig = cardGroupFilters[groupKey] || DEFAULT_CARD_GROUP_FILTERS[groupKey];
            const isDrawerOpen = expandedFilterSubject === subjectName;

            const checkpoint = getSubjectCheckpoint(subjectName);
            const hasCheckpoint = Boolean(
              checkpoint &&
              !checkpoint.isCompleted &&
              (checkpoint.currentIndex > 0 || (checkpoint.results || []).length > 0)
            );
            const wrongCount = getSubjectWrongCount(subjectName);

            // Color coding according to score (High-contrast & theme resilient)
            let barColor = "#10B981";
            let textColorClass = isDark ? "text-emerald-400" : "text-emerald-600";

            if (perf.accuracy >= 75) {
              barColor = "#10B981";
              textColorClass = isDark ? "text-emerald-400" : "text-emerald-600";
            } else if (perf.accuracy >= 60) {
              barColor = "#F97316";
              textColorClass = isDark ? "text-orange-400" : "text-orange-600";
            } else {
              barColor = "#EF4444";
              textColorClass = isDark ? "text-red-400" : "text-red-600";
            }

            const activeFilterCount = (groupConfig?.filters || []).filter(f => f.enabled).length;
            const totalFilterCount = (groupConfig?.filters || []).length;

            return (
              <div key={subjectName} className="space-y-2.5 pb-4 border-b border-[var(--border-subtle)] last:border-b-0 last:pb-0">
                {/* Title & Score Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-xs sm:text-sm text-foreground leading-snug block">
                      {subjectName}
                    </span>
                  </div>

                  <span
                    className={`text-sm sm:text-base font-black tabular-nums shrink-0 ${textColorClass}`}
                  >
                    {Math.round(perf.accuracy)}%
                  </span>
                </div>

                {/* Thick Rounded Progress Bar (Exact match to reference) */}
                <div
                  className="w-full h-3 sm:h-3.5 rounded-full overflow-hidden p-0.5"
                  style={{ backgroundColor: isDark ? "#242C3D" : "#EEF2F6" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      backgroundColor: barColor,
                      width: `${Math.min(100, Math.max(3, perf.accuracy))}%`,
                    }}
                  />
                </div>

                {/* Meta details & Targeted Practice button */}
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground pt-0.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--bg-surface-subtle)] text-[var(--text-main)] font-bold border border-[var(--border-color)]">
                      {config.weightPercentage}% Weight
                    </span>
                    <span>•</span>
                    <span className="font-medium text-foreground">
                      {perf.totalAttempts} / 30 volume target
                    </span>

                    {/* In-progress checkpoint badge */}
                    {hasCheckpoint && checkpoint && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/30 text-[10px]">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--primary)]"></span>
                          </span>
                          <span>Paused at Q{checkpoint.currentIndex + 1}/{checkpoint.cardsQueue?.length || 30}</span>
                        </span>
                      </>
                    )}

                    {/* Missed questions badge */}
                    {wrongCount > 0 && (
                      <>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedSubjectModal(subjectName)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:scale-105 transition-transform cursor-pointer text-[10px]"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>{wrongCount} Missed Questions</span>
                        </button>
                      </>
                    )}

                    {perf.isConditionedRisk && (
                      <>
                        <span>•</span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold border ${
                            isDark
                              ? "bg-[#351518] text-[#FCA5A5] border-[#591C24]"
                              : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                          }`}
                        >
                          &le; 50% Cut-off Alert
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    {/* Toggle Independent Filter & Sort Settings for this Subject */}
                    <button
                      type="button"
                      onClick={() => setExpandedFilterSubject(isDrawerOpen ? null : subjectName)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isDrawerOpen
                          ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                          : 'border-[var(--border-color)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
                      }`}
                      title={`Configure independent filters and sorting for ${subjectName}`}
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Filters ({activeFilterCount}/{totalFilterCount})</span>
                    </button>

                    <button
                      onClick={() => {
                        if (hasCheckpoint || wrongCount > 0) {
                          setSelectedSubjectModal(subjectName);
                        } else {
                          handlePracticeSubject(subjectName, { startFresh: true });
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 font-bold transition-all cursor-pointer px-3 py-1 rounded-xl text-xs ${
                        hasCheckpoint
                          ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-xs'
                          : 'text-primary hover:opacity-80 bg-[var(--primary-light)]/40 hover:bg-[var(--primary-light)]'
                      }`}
                    >
                      <span>{hasCheckpoint ? `Continue (Q${checkpoint ? checkpoint.currentIndex + 1 : 1})` : 'Practice'}</span>
                      <Play className="w-2.5 h-2.5 fill-current" />
                    </button>
                  </div>
                </div>

                {/* INLINE INDEPENDENT FILTER DRAWER FOR THIS SUBJECT */}
                {isDrawerOpen && groupConfig && (
                  <div className="mt-2.5 p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-[var(--text-main)] flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[var(--primary)]" />
                        <span>Independent Filter & Sort for {config.shortTitle}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedFilterSubject(null)}
                        className="text-[var(--text-subtle)] hover:text-[var(--text-main)] text-xs"
                      >
                        ✕ Close
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      {/* Sort control */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                          Practice Sort Order
                        </label>
                        <select
                          value={groupConfig.activeSort}
                          onChange={(e) => updateGroupFilterConfig(groupKey, { activeSort: e.target.value as CardSortOption })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] outline-none"
                        >
                          <option value="default">Shuffled (Exam Order)</option>
                          <option value="progress-asc">Unseen / In Learning First</option>
                          <option value="progress-desc">Mastered First</option>
                          <option value="difficulty">By Difficulty (Hard First)</option>
                          <option value="most-reviewed">Most Reviewed First</option>
                          <option value="alphabetical">Alphabetical (A-Z)</option>
                        </select>
                      </div>

                      {/* Stage filter control */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                          Card Learning Stage
                        </label>
                        <select
                          value={groupConfig.stageFilter}
                          onChange={(e) => updateGroupFilterConfig(groupKey, { stageFilter: e.target.value as CardFilterOption })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] outline-none"
                        >
                          <option value="all">All Stages (Full Pool)</option>
                          <option value="unseen">🆕 Unseen / New Cards</option>
                          <option value="learning">🔄 Learning Stage</option>
                          <option value="developing">📈 Developing Recall</option>
                          <option value="mastered">🏆 Mastered Cards</option>
                          <option value="due">⏰ Due Today</option>
                          <option value="wrong">❌ Wrong Answers</option>
                        </select>
                      </div>
                    </div>

                    {/* Filter Tags Pills */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Included Topics & Tags (click to toggle):
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {groupConfig.filters.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => toggleGroupFilterItem(groupKey, f.id)}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                              f.enabled
                                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-2xs'
                                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] opacity-60 hover:opacity-100'
                            }`}
                          >
                            {f.enabled && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            <span>{f.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                      <span>Only affects {config.shortTitle}. Does not change other practice areas.</span>
                      {onOpenFilterManager && (
                        <button
                          type="button"
                          onClick={onOpenFilterManager}
                          className="font-bold text-[var(--primary)] hover:underline"
                        >
                          Advanced Filter Editor →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Practice Area Resume & Wrong Answers Modal */}
      {selectedSubjectModal && (() => {
        const modalConfig = NDLE_SUBJECT_CONFIGS[selectedSubjectModal];
        const modalCheckpoint = getSubjectCheckpoint(selectedSubjectModal);
        const modalHasCheckpoint = Boolean(
          modalCheckpoint &&
          !modalCheckpoint.isCompleted &&
          (modalCheckpoint.currentIndex > 0 || (modalCheckpoint.results || []).length > 0)
        );
        const modalWrongCount = getSubjectWrongCount(selectedSubjectModal);
        const modalAnsweredCount = modalCheckpoint?.results?.length || modalCheckpoint?.currentIndex || 0;
        const totalQ = modalCheckpoint?.cardsQueue?.length || 30;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
                      NDLE Official Practice
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-surface-subtle)] text-[var(--text-main)] border border-[var(--border-color)]">
                      {modalConfig?.weightPercentage}% Weight
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[var(--text-main)]">
                    {modalConfig?.shortTitle || selectedSubjectModal}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubjectModal(null)}
                  className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalHasCheckpoint && modalCheckpoint && (
                <div className="p-3 rounded-2xl bg-[var(--primary-light)]/40 border border-[var(--primary)]/30 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-[var(--primary)]">
                    <span>Saved In-Progress Practice</span>
                    <span>Q{modalCheckpoint.currentIndex + 1} of {totalQ}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    You have answered {modalAnsweredCount} questions so far. Pick up where you left off or target wrong answers.
                  </p>
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                {/* Option 1: Resume where stopped */}
                {modalHasCheckpoint && modalCheckpoint && (
                  <button
                    type="button"
                    onClick={() => {
                      const subj = selectedSubjectModal;
                      setSelectedSubjectModal(null);
                      handlePracticeSubject(subj, { resume: true });
                    }}
                    className="w-full p-3.5 rounded-2xl border-2 border-[var(--primary)] bg-[var(--primary-light)]/30 hover:bg-[var(--primary-light)]/60 text-left flex items-center gap-3 transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[var(--text-main)]">
                          Resume at Question {modalCheckpoint.currentIndex + 1}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--primary)] text-white">
                          Resume
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                        Pick up right where you paused with your score & timer intact
                      </span>
                    </div>
                  </button>
                )}

                {/* Option 2: Get Back to Wrong Answers */}
                {modalWrongCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const subj = selectedSubjectModal;
                      setSelectedSubjectModal(null);
                      handlePracticeSubject(subj, { missedOnly: true, startFresh: true });
                    }}
                    className="w-full p-3.5 rounded-2xl border-2 border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100/60 dark:hover:bg-rose-950/60 text-left flex items-center gap-3 transition-all cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[var(--text-main)] flex items-center gap-1.5">
                          <span>Practice Wrong Answers Only</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500 text-white">
                            {modalWrongCount} Missed
                          </span>
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                        Target & re-attempt questions you answered incorrectly to turn weak points into strengths
                      </span>
                    </div>
                  </button>
                )}

                {/* Option 3: Start Fresh / Comprehensive Session */}
                <button
                  type="button"
                  onClick={() => {
                    const subj = selectedSubjectModal;
                    const pDeckId = `practice-area-${modalConfig.code}`;
                    clearDeckCheckpoint(pDeckId);
                    setSelectedSubjectModal(null);
                    handlePracticeSubject(subj, { startFresh: true });
                  }}
                  className="w-full p-3.5 rounded-2xl border border-[var(--border-color)] hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 text-left flex items-center gap-3 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sm text-[var(--text-main)] block">
                      {modalHasCheckpoint ? 'Start Fresh (Question 1)' : 'Start Full Practice Set'}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                      {modalHasCheckpoint
                        ? 'Reset current practice progress and begin a new 30-question set'
                        : '30 randomized board questions aligned with NDLE standards'}
                    </span>
                  </div>
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setSelectedSubjectModal(null)}
                  className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM SUMMARY STATS (Theme-aligned executive summary)        */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-3 sm:p-4 text-center space-y-0.5 shadow-[var(--card-shadow)]">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            NDLE GWA
          </div>
          <div className="text-lg sm:text-2xl font-black text-foreground tabular-nums">
            {report.gwa}%
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
            Target &ge; 75.0%
          </p>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-3 sm:p-4 text-center space-y-0.5 shadow-[var(--card-shadow)]">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Passing Prob.
          </div>
          <div className="text-lg sm:text-2xl font-black text-primary tabular-nums">
            {report.passingProbability}%
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
            {Math.round(report.overallConfidenceIndex * 100)}% Conf.
          </p>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-3 sm:p-4 text-center space-y-0.5 shadow-[var(--card-shadow)]">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Questions
          </div>
          <div className="text-lg sm:text-2xl font-black text-foreground tabular-nums">
            {report.totalAttempts}
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
            {report.totalCorrect} correct
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* AUTO-CATEGORIZATION MODAL                                     */}
      {/* ------------------------------------------------------------- */}
      {showCategorizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card rounded-3xl border border-border shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm sm:text-base text-foreground">
                  AI NDLE Auto-Categorization
                </h3>
              </div>
              <button
                onClick={() => setShowCategorizeModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Nutriboard uses an AI and medical terms classifier to inspect
              every flashcard, tagging each item into exactly one of the three
              official Philippine NDLE board exam subjects.
            </p>

            <div className="space-y-2 py-1">
              {NDLE_SUBJECT_LIST.map((sub) => {
                const cfg = NDLE_SUBJECT_CONFIGS[sub];
                return (
                  <div
                    key={sub}
                    className="p-2.5 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-foreground text-[11px] sm:text-xs">
                      {sub}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground shrink-0">
                      {cfg.weightPercentage}%
                    </span>
                  </div>
                );
              })}
            </div>

            {isCategorizing && (
              <div className="space-y-1.5 py-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Classifying cards...</span>
                  <span>
                    {categorizeProgress.current} / {categorizeProgress.total}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${
                        categorizeProgress.total > 0
                          ? Math.round(
                              (categorizeProgress.current /
                                categorizeProgress.total) *
                                100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {categorizeMessage && (
              <p className="text-xs font-semibold text-primary text-center">
                {categorizeMessage}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowCategorizeModal(false)}
                disabled={isCategorizing}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleRunAutoClassify}
                disabled={isCategorizing}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isCategorizing
                    ? "Classifying..."
                    : `Classify ${unclassifiedCardsCount} Unclassified Cards`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
