"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  X,
  AlertTriangle,
  RotateCcw,
  Award,
  BookOpen,
  Download,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Sparkles,
} from "lucide-react";
import { CBLEQuestion, CBLEExamineeProfile } from "@/data/cble-mock-data";
import {
  openCBLEPrintDialog,
  downloadCBLEHtmlReport,
  downloadCBLECsvReport,
  downloadCBLEMistakesFlashcardsCsv,
} from "@/lib/services/cbleReportExport";

interface SubmitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  questions: CBLEQuestion[];
  userAnswers: Record<number, "A" | "B" | "C" | "D">;
  flaggedQuestions: Set<number>;
  onReviewUnanswered?: () => void;
}

export function SubmitDialog({
  isOpen,
  onClose,
  onConfirmSubmit,
  questions,
  userAnswers,
  flaggedQuestions,
  onReviewUnanswered,
}: SubmitDialogProps) {
  if (!isOpen) return null;

  const total = questions.length;
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = total - answeredCount;
  const flaggedCount = flaggedQuestions.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between bg-[#2e3b44] px-5 py-3 text-white">
          <div className="flex items-center gap-2 font-semibold text-base">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span>Submit Examination Confirmation</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700">
            Are you sure you want to finish and submit your answers for this examination? Once submitted, your responses will be evaluated and your test session will close.
          </p>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Questions:</span>
              <span className="font-bold text-slate-900">{total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-700">Answered Questions:</span>
              <span className="font-bold text-emerald-700">{answeredCount}</span>
            </div>
            {unansweredCount > 0 && (
              <div className="flex justify-between text-rose-700 font-medium">
                <span>Unanswered Questions:</span>
                <span className="font-bold">{unansweredCount}</span>
              </div>
            )}
            {flaggedCount > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Flagged Questions:</span>
                <span className="font-bold">{flaggedCount}</span>
              </div>
            )}
          </div>

          {unansweredCount > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-2">
              <div className="flex gap-2 items-start">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  You still have <strong>{unansweredCount}</strong> unanswered questions. We recommend reviewing them before submitting.
                </span>
              </div>
              {onReviewUnanswered && (
                <button
                  type="button"
                  onClick={onReviewUnanswered}
                  className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Jump to First Unanswered Question</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Return to Exam
          </button>
          <button
            onClick={onConfirmSubmit}
            className="rounded bg-rose-700 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-rose-800 transition-colors cursor-pointer"
          >
            Yes, Finalize & Submit
          </button>
        </div>
      </div>
    </div>
  );
}

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
  questions: CBLEQuestion[];
  userAnswers: Record<number, "A" | "B" | "C" | "D">;
  profile: CBLEExamineeProfile;
  timeSpentSeconds: number;
  onSwitchToExamReview?: () => void;
}

export function ResultsModal({
  isOpen,
  onClose,
  onRestart,
  questions,
  userAnswers,
  profile,
  timeSpentSeconds,
  onSwitchToExamReview,
}: ResultsModalProps) {
  const [filterType, setFilterType] = useState<"all" | "mistakes" | "correct" | "unanswered">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);

  // Stats calculation
  const { correctCount, wrongCount, unansweredCount, categoryStats } = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    const stats: Record<string, { total: number; correct: number; wrong: number }> = {};

    questions.forEach((q, idx) => {
      const userAns = userAnswers[idx];
      const cat = q.category || q.subject || "General Nutrition";
      if (!stats[cat]) {
        stats[cat] = { total: 0, correct: 0, wrong: 0 };
      }
      stats[cat].total++;

      if (userAns === q.correctAnswer) {
        correct++;
        stats[cat].correct++;
      } else if (userAns !== undefined) {
        wrong++;
        stats[cat].wrong++;
      } else {
        unanswered++;
      }
    });

    return { correctCount: correct, wrongCount: wrong, unansweredCount: unanswered, categoryStats: stats };
  }, [questions, userAnswers]);

  const total = questions.length || 1;
  const percentage = Math.round((correctCount / total) * 100);
  const isPassed = percentage >= 80; // Target PRC 80% passing mark

  const formatMinutesSeconds = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
    }
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  const categories = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.category || q.subject || "General Nutrition")));
  }, [questions]);

  // Filtered Questions for Answer Sheet
  const filteredQuestions = useMemo(() => {
    return questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => {
        const userAns = userAnswers[idx];
        const isCorrect = userAns === q.correctAnswer;
        const isMistake = userAns !== undefined && !isCorrect;
        const isUnanswered = userAns === undefined;

        // Filter Type Tab
        if (filterType === "mistakes" && !isMistake) return false;
        if (filterType === "correct" && !isCorrect) return false;
        if (filterType === "unanswered" && !isUnanswered) return false;

        // Category Filter
        const cat = q.category || q.subject || "General Nutrition";
        if (selectedCategory !== "all" && cat !== selectedCategory) return false;

        // Search Query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchQ = q.question.toLowerCase().includes(query);
          const matchExpl = q.explanation?.toLowerCase().includes(query);
          const matchOptions = q.options.some((o) => o.text.toLowerCase().includes(query));
          if (!matchQ && !matchExpl && !matchOptions) return false;
        }

        return true;
      });
  }, [questions, userAnswers, filterType, selectedCategory, searchQuery]);

  const toggleExpandItem = (idx: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIndices = new Set(filteredQuestions.map((item) => item.idx));
    setExpandedItems(allIndices);
  };

  const handleCollapseAll = () => {
    setExpandedItems(new Set());
  };

  const reportData = useMemo(() => ({
    examinee: profile,
    questions,
    userAnswers,
    timeSpentSeconds,
    completedAt: new Date().toISOString(),
    categoryBreakdown: categoryStats,
  }), [profile, questions, userAnswers, timeSpentSeconds, categoryStats]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 md:p-6 backdrop-blur-xs overflow-y-auto">
      <div className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#2e3b44] px-5 py-3.5 sm:px-6 sm:py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg tracking-wide leading-tight">
                PRC-CBLE Mock Board Examination Evaluation & Answer Sheet
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {profile.examinationName} • Examinee: {profile.name} ({profile.examineeNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            title="Close Summary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top Score Banner */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              {/* Score Badge & Status */}
              <div className="flex items-center gap-4 sm:gap-5">
                <div
                  className={`flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-md ${
                    isPassed ? "bg-emerald-600 ring-4 ring-emerald-100" : "bg-rose-600 ring-4 ring-rose-100"
                  }`}
                >
                  <span className="text-2xl sm:text-3xl font-black leading-none">{percentage}%</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider mt-1 opacity-90">
                    {isPassed ? "PASSED" : "FAILED"}
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        isPassed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {isPassed ? "PASSED (PRC Standard ≥ 80%)" : "NEEDS IMPROVEMENT (< 80%)"}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      GWA: {percentage}.00%
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    {correctCount} / {total} Correct Items
                  </h3>
                  <p className="text-xs text-slate-600">
                    School: <strong>{profile.school}</strong> • Center: <strong>{profile.testingCenter}</strong>
                  </p>
                </div>
              </div>

              {/* Stat Counters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto text-xs">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center sm:text-left">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Items</span>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{total}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center sm:text-left">
                  <span className="text-[11px] font-semibold text-emerald-700 block">Correct Items</span>
                  <p className="text-lg font-black text-emerald-700 mt-0.5">{correctCount}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-center sm:text-left">
                  <span className="text-[11px] font-semibold text-rose-700 block">Mistakes (Wrong)</span>
                  <p className="text-lg font-black text-rose-700 mt-0.5">{wrongCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center sm:text-left">
                  <span className="text-[11px] font-semibold text-slate-500 block">Time Spent</span>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{formatMinutesSeconds(timeSpentSeconds)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Download & Export Toolbar */}
          <div className="rounded-xl border border-[#00838f]/30 bg-gradient-to-r from-[#00838f]/5 via-sky-50/40 to-slate-50 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-[#00838f]" /> Downloadable Summary & Full Answer Sheet
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Save your complete exam session with all answered questions, mistakes, and rationales for offline study or review.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Print / Save as PDF */}
                <button
                  type="button"
                  onClick={() => openCBLEPrintDialog(reportData)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg bg-[#00838f] hover:bg-[#006978] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                  title="Print or Save as PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>

                {/* Download Standalone HTML */}
                <button
                  type="button"
                  onClick={() => downloadCBLEHtmlReport(reportData)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors cursor-pointer"
                  title="Download offline-ready HTML report"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Download Summary (.html)</span>
                </button>

                {/* Download CSV Sheet */}
                <button
                  type="button"
                  onClick={() => downloadCBLECsvReport(reportData)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors cursor-pointer"
                  title="Download spreadsheet CSV with questions, options, answers, and rationales"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Answer Sheet (.csv)</span>
                </button>

                {/* Export Mistakes to Flashcards */}
                {wrongCount > 0 && (
                  <button
                    type="button"
                    onClick={() => downloadCBLEMistakesFlashcardsCsv(reportData)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 px-3 py-2 text-xs font-bold text-rose-800 shadow-xs transition-colors cursor-pointer"
                    title="Export only mistakes formatted for Anki/Nutriboard flashcards"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                    <span>Export Mistakes ({wrongCount})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible Competency Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCategoryBreakdown(!showCategoryBreakdown)}
              className="w-full flex items-center justify-between p-3.5 sm:px-5 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900">
                <BookOpen className="w-4 h-4 text-[#00838f]" />
                <span>Competency & Domain Performance Breakdown ({Object.keys(categoryStats).length} Topics)</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                <span>{showCategoryBreakdown ? "Hide Details" : "View Details"}</span>
                {showCategoryBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showCategoryBreakdown && (
              <div className="p-4 sm:p-5 border-t border-slate-200 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(categoryStats).map(([cat, stats]) => {
                    const pct = Math.round((stats.correct / stats.total) * 100);
                    const isProficient = pct >= 80;
                    return (
                      <div key={cat} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 truncate mr-2">{cat}</span>
                          <span className={`font-bold ${isProficient ? "text-emerald-700" : "text-rose-700"}`}>
                            {stats.correct}/{stats.total} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isProficient ? "bg-emerald-600" : pct >= 60 ? "bg-amber-500" : "bg-rose-600"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Filter, Search & Answer Sheet Controls */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Complete Answer Sheet & Mistakes Diagnostic</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                  Showing {filteredQuestions.length} of {total}
                </span>
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                >
                  Expand All Rationales
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    filterType === "all"
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  All Questions ({total})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("mistakes")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    filterType === "mistakes"
                      ? "bg-rose-700 text-white border-rose-700 shadow-xs"
                      : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Mistakes / Wrong ({wrongCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("correct")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    filterType === "correct"
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Correct ({correctCount})</span>
                </button>
                {unansweredCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterType("unanswered")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      filterType === "unanswered"
                        ? "bg-amber-700 text-white border-amber-700 shadow-xs"
                        : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Unanswered ({unansweredCount})</span>
                  </button>
                )}
              </div>

              {/* Category Filter & Search Box */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {categories.length > 1 && (
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full sm:w-auto appearance-none rounded-lg border border-slate-300 bg-white px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#00838f] cursor-pointer"
                    >
                      <option value="all">All Topics ({categories.length})</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <Filter className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search question, keyword..."
                    className="w-full sm:w-56 rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00838f]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question Sheet List */}
          {filteredQuestions.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50 space-y-2">
              <p className="text-sm font-bold text-slate-700">No questions match your current filters.</p>
              <p className="text-xs text-slate-500">
                Try resetting your search query or selecting a different filter tab above.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilterType("all");
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#00838f] hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map(({ q, idx }) => {
                const userAns = userAnswers[idx];
                const isCorrect = userAns === q.correctAnswer;
                const isUnanswered = userAns === undefined;
                const isExpanded = expandedItems.has(idx);

                return (
                  <div
                    key={q.id || idx}
                    className={`rounded-xl border transition-all ${
                      isCorrect
                        ? "border-emerald-200 bg-emerald-50/20"
                        : isUnanswered
                        ? "border-amber-200 bg-amber-50/20"
                        : "border-rose-200 bg-rose-50/20 ring-1 ring-rose-200"
                    } p-4 sm:p-5`}
                  >
                    {/* Item Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
                            isCorrect ? "bg-emerald-600" : isUnanswered ? "bg-amber-600" : "bg-rose-600"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Item #{idx + 1}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {q.category || q.subject}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+1)
                          </span>
                        ) : isUnanswered ? (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                            <HelpCircle className="w-3.5 h-3.5" /> Unanswered (0)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                            <XCircle className="w-3.5 h-3.5" /> Mistake / Wrong (0)
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleExpandItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                          title={isExpanded ? "Collapse item" : "Expand item rationale"}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Question Stem Text */}
                    <p className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                      {q.question}
                    </p>

                    {/* Image / Diagram if question has one */}
                    {q.image && (
                      <div className="my-3 max-w-md mx-auto p-2 bg-white rounded border border-slate-200">
                        {q.image.isSvg && q.image.svgContent ? (
                          <div dangerouslySetInnerHTML={{ __html: q.image.svgContent }} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={q.image.url}
                            alt={q.image.alt || "Question Illustration"}
                            className="max-h-56 object-contain mx-auto"
                          />
                        )}
                        {q.image.caption && (
                          <p className="mt-1 text-center text-xs text-slate-500 italic">{q.image.caption}</p>
                        )}
                      </div>
                    )}

                    {/* Whole Sheet of Options (A, B, C, D) with Right and Wrong applied */}
                    <div className="mt-4 space-y-2">
                      {q.options.map((opt) => {
                        const isSelected = userAns === opt.key;
                        const isTheCorrectOption = q.correctAnswer === opt.key;

                        let optionStyle = "border-slate-200 bg-white text-slate-800";
                        let badge = null;

                        if (isSelected && isTheCorrectOption) {
                          // Correct Choice
                          optionStyle = "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold ring-1 ring-emerald-400";
                          badge = (
                            <span className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Your Choice (Correct)
                            </span>
                          );
                        } else if (isSelected && !isTheCorrectOption) {
                          // Mistake / Wrong Choice
                          optionStyle = "border-rose-400 bg-rose-50/80 text-rose-950 font-semibold ring-1 ring-rose-400";
                          badge = (
                            <span className="flex items-center gap-1 rounded bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white shrink-0">
                              <XCircle className="w-3 h-3" /> Your Choice (Mistake)
                            </span>
                          );
                        } else if (!isSelected && isTheCorrectOption) {
                          // The actual correct answer when user missed it
                          optionStyle = "border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold";
                          badge = (
                            <span className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Correct Answer
                            </span>
                          );
                        }

                        return (
                          <div
                            key={opt.key}
                            className={`flex items-start justify-between gap-3 p-3 rounded-lg border text-xs sm:text-sm transition-all ${optionStyle}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                                  isTheCorrectOption
                                    ? "bg-emerald-600 text-white"
                                    : isSelected
                                    ? "bg-rose-600 text-white"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {opt.key}
                              </span>
                              <span className="leading-snug pt-0.5">{opt.text}</span>
                            </div>
                            {badge}
                          </div>
                        );
                      })}
                    </div>

                    {/* Unanswered Notice if applicable */}
                    {isUnanswered && (
                      <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>You did not answer this question during the exam session.</span>
                      </div>
                    )}

                    {/* Rationalization & Explanation Section */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => toggleExpandItem(idx)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#00838f] hover:text-[#006978] transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{isExpanded ? "Hide Rationalization" : "View Official Rationale & Key Takeaways"}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3.5 rounded-lg border border-slate-200 bg-white/90 text-xs text-slate-700 space-y-2 animate-in fade-in duration-150">
                          <div className="flex flex-wrap items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                            <span className="text-[#00838f]">Correct Answer Key: [{q.correctAnswer}]</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600">Your Selection: [{userAns || "None"}]</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 font-medium">Domain: {q.category || q.subject}</span>
                          </div>
                          <p className="leading-relaxed text-slate-800 font-normal">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6 sm:py-4 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" /> Retake Mock Exam
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 transition-colors"
            >
              Exit to Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToExamReview && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToExamReview();
                }}
                className="flex items-center gap-1.5 rounded-xl border border-[#00838f] bg-[#00838f]/10 text-[#00838f] hover:bg-[#00838f]/20 px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <Eye className="h-4 w-4" /> Review on Simulator Screen
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow hover:bg-black transition-colors cursor-pointer"
            >
              Close Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
