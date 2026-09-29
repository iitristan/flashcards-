"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Play,
  X,
} from "lucide-react";
import { useBoardReadiness } from "@/lib/hooks/useBoardReadiness";
import { useNutriStore } from "@/lib/store/useNutriStore";
import {
  NDLESubject,
  NDLE_SUBJECT_LIST,
  NDLE_SUBJECT_CONFIGS,
} from "@/types/ndle";

interface BoardReadinessViewProps {
  onStartSubjectPractice?: (subject: NDLESubject) => void;
}

export const BoardReadinessView: React.FC<BoardReadinessViewProps> = ({
  onStartSubjectPractice,
}) => {
  const {
    report,
    isLoadingLogs,
    isCategorizing,
    categorizeProgress,
    unclassifiedCardsCount,
    autoClassifyAllCards,
    refresh,
  } = useBoardReadiness();

  const { startStudySession, decks, preferences } = useNutriStore();
  const isDark = preferences.theme === "dark";

  const [activeMetricView, setActiveMetricView] = useState<"probability" | "gwa">(
    "probability"
  );
  const [showCategorizeModal, setShowCategorizeModal] = useState(false);
  const [categorizeMessage, setCategorizeMessage] = useState<string | null>(null);

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

  // Handle starting targeted practice for an NDLE subject
  const handlePracticeSubject = (subject: NDLESubject) => {
    if (onStartSubjectPractice) {
      onStartSubjectPractice(subject);
      return;
    }

    // Find cards in any deck that belong to this subject
    const matchingCards: typeof decks[0]["cards"] = [];
    for (const deck of decks) {
      for (const card of deck.cards || []) {
        const sub =
          card.ndleSubject ||
          ((card.tags || []).some((t) => t.toLowerCase() === "nbcd")
            ? "Nutritional Biochemistry and Clinical Dietetics"
            : (card.tags || []).some((t) => t.toLowerCase() === "cphn")
            ? "Community and Public Health Nutrition"
            : (card.tags || []).some((t) => t.toLowerCase() === "ffss")
            ? "Foods and Food Service Systems"
            : null);
        if (sub === subject) {
          matchingCards.push(card);
        }
      }
    }

    if (matchingCards.length > 0) {
      const targetDeck =
        decks.find((d) =>
          d.cards?.some((c) => matchingCards.some((mc) => mc.id === c.id))
        ) || decks[0];
      if (targetDeck) {
        startStudySession(targetDeck.id, "multiple-choice");
      }
    } else if (decks.length > 0) {
      startStudySession(decks[0].id, "multiple-choice");
    }
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
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] sm:text-xs font-bold tracking-widest text-muted-foreground uppercase">
            BY PRACTICE AREA
          </h3>

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

        {/* Practice Area Card Container */}
        <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] p-4 sm:p-6 shadow-[var(--card-shadow)] space-y-5 sm:space-y-6">
          {NDLE_SUBJECT_LIST.map((subjectName) => {
            const perf = report.subjectBreakdown[subjectName];
            const config = NDLE_SUBJECT_CONFIGS[subjectName];

            // Color coding according to score (High-contrast & theme resilient)
            // >= 75%: Emerald Green
            // 60% - 74%: Vivid Amber/Orange
            // < 60%: Bold Crimson Red
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

            return (
              <div key={subjectName} className="space-y-2">
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
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground pt-0.5 flex-wrap gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--bg-surface-subtle)] text-[var(--text-main)] font-bold border border-[var(--border-color)]">
                      {config.weightPercentage}% Weight
                    </span>
                    <span>•</span>
                    <span className="font-medium text-foreground">
                      {perf.totalAttempts} / 30 volume target
                    </span>
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

                  <button
                    onClick={() => handlePracticeSubject(subjectName)}
                    className="inline-flex items-center gap-1 font-bold text-primary hover:opacity-80 transition-colors cursor-pointer ml-auto"
                  >
                    <span>Practice</span>
                    <Play className="w-2.5 h-2.5 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
