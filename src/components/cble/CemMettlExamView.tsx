'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Settings,
  X,
  HelpCircle,
  LayoutGrid,
  RotateCcw,
  Wifi,
  BatteryCharging,
  Power,
  Calculator as CalcIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Award,
  ChevronDown
} from 'lucide-react';
import { CBLEQuestion } from '@/data/cble-mock-data';
import { DEFAULT_NMAT_EXAMINEE, MOCK_NMAT_QUESTIONS } from '@/data/nmat-mock-data';
import { CalculatorModal } from '@/components/cble/calculator-modal';

interface CemMettlExamViewProps {
  initialQuestions?: CBLEQuestion[];
  initialItemCount?: number;
  testTitle?: string;
  onExit?: () => void;
}

export function CemMettlExamView({
  initialQuestions,
  initialItemCount = 100,
  testTitle = "Sample Test-copy / NMAT Mock Examination",
  onExit
}: CemMettlExamViewProps) {
  const [questions, setQuestions] = useState<CBLEQuestion[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) return initialQuestions;
    return MOCK_NMAT_QUESTIONS;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  // Timers: Section Time & Total Test Time
  const [totalTestTimeSeconds, setTotalTestTimeSeconds] = useState(4 * 3600); // 4 hours
  const [sectionTimeSeconds, setSectionTimeSeconds] = useState(0); // Section timer counts up or counts down
  const [lastSavedSecondsAgo, setLastSavedSecondsAgo] = useState(12);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  // Modals & UI States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  const currentQ = questions[currentIndex] || questions[0];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(userAnswers).length;

  // Autosave ticker simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSavedSecondsAgo((prev) => (prev >= 60 ? 5 : prev + 5));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (showResults) return;
    const interval = setInterval(() => {
      setTotalTestTimeSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setSectionTimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [showResults]);

  // Format seconds to HH:MM:SS
  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const handleSelectOption = (key: "A" | "B" | "C" | "D") => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: key,
    }));
    setLastSavedSecondsAgo(2);
  };

  const handleClearResponse = () => {
    setUserAnswers((prev) => {
      const next = { ...prev };
      delete next[currentIndex];
      return next;
    });
  };

  const handleToggleFlag = () => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Calculate results
  const scoreResults = useMemo(() => {
    let correct = 0;
    const details = questions.map((q, idx) => {
      const selected = userAnswers[idx];
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) correct++;
      return {
        question: q,
        selected,
        isCorrect,
      };
    });
    const percentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const percentile = Math.min(99, Math.max(10, Math.round(percentage * 0.95 + 5))); // Simulated NMAT Percentile Rank
    return {
      correct,
      total: totalQuestions,
      percentage,
      percentile,
      details,
    };
  }, [questions, userAnswers, totalQuestions]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-800 antialiased font-sans select-none">
      {/* 1. CEM / METTL TOP NAV HEADER (Dark Navy) */}
      <header className="flex h-14 shrink-0 items-center justify-between bg-[#091E42] px-4 text-white shadow-md z-30">
        {/* Left: CEM Official Logo Badge & Test Metadata */}
        <div className="flex items-center gap-3">
          <div className="bg-white rounded px-2.5 py-1 flex items-center gap-1.5 shadow-xs border border-slate-300">
            <div className="w-5 h-5 rounded-full bg-blue-700 flex items-center justify-center text-white text-[10px] font-black">
              CEM
            </div>
            <div className="leading-tight">
              <div className="text-[10px] font-black text-slate-900 tracking-tight">Center for Educational</div>
              <div className="text-[9px] font-semibold text-slate-600">Measurement, Inc.</div>
            </div>
          </div>

          <div className="hidden md:flex flex-col text-xs leading-tight">
            <div className="font-bold text-slate-100 flex items-center gap-1.5">
              <span>{DEFAULT_NMAT_EXAMINEE.name}</span>
              <span className="text-slate-400">/</span>
              <span className="truncate max-w-[260px] text-slate-300">{testTitle}</span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>☁️ Saved:</span>
              <span>{lastSavedSecondsAgo <= 5 ? "just now" : `${lastSavedSecondsAgo} seconds ago`}</span>
            </div>
          </div>
        </div>

        {/* Right: Section Time, Fullscreen, Settings, Finish Test Button */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Section Time with Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTimeDropdown(!showTimeDropdown)}
              className="flex items-center gap-1.5 bg-[#172B4D] hover:bg-[#253858] px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer border border-slate-700 transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Section Time: {formatTimer(sectionTimeSeconds)}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showTimeDropdown && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-md bg-[#091E42] border border-slate-700 p-3 shadow-2xl text-xs z-50 text-slate-200 space-y-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Section Time:</span>
                  <span className="font-mono font-bold text-blue-300">{formatTimer(sectionTimeSeconds)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Test Time left:</span>
                  <span className="font-mono font-bold text-amber-300">{formatTimer(totalTestTimeSeconds)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Calculator Shortcut */}
          <button
            type="button"
            onClick={() => setShowCalculator(true)}
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Open Scratchpad Calculator"
          >
            <CalcIcon className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer hidden sm:inline-flex"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setShowInstructionsModal(true)}
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Exam Instructions & Shortcuts"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Finish Test Button (White Outlined) */}
          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="rounded-md border border-white/80 hover:bg-white hover:text-[#091E42] px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 text-white"
          >
            Finish Test
          </button>
        </div>
      </header>

      {/* 2. SUB-HEADER BAR (Pagination, Section Selector, Attempted Counter) */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 shadow-xs z-20">
        {/* Left: Section Selector Dropdown & Info Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded border border-slate-300 cursor-pointer text-xs font-semibold max-w-[260px] sm:max-w-md truncate">
            <span className="truncate">{currentQ.subject || "TEST C. QUANTITATIVE"} {currentQ.category && `• ${currentQ.category}`}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </div>

          <button
            type="button"
            onClick={() => setShowInstructionsModal(true)}
            className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center font-bold text-xs cursor-pointer border border-blue-200"
            title="View Section Instructions"
          >
            i
          </button>
        </div>

        {/* Center: Pagination Controls (< 1 2 >) and Question Palette Button */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Previous Question"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Question pagination pills */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalQuestions, 7) }).map((_, idx) => {
              const isActive = idx === currentIndex;
              const isAnswered = userAnswers[idx] !== undefined;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-7 h-7 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? "bg-[#0b63c5] text-white shadow-xs"
                      : isAnswered
                      ? "bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex >= totalQuestions - 1}
            className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Next Question"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Question Palette Icon (⊞) */}
          <button
            type="button"
            onClick={() => setShowPalette(true)}
            className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 ml-1 cursor-pointer border border-slate-200"
            title="Open Question Palette / Roadmap"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Attempted Counter & Blue Next Button */}
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-semibold hidden sm:inline">
            Attempted: <strong className="text-slate-800">{answeredCount}/{totalQuestions}</strong>
          </span>

          <button
            type="button"
            onClick={handleNext}
            className="rounded-md bg-[#0b63c5] hover:bg-[#095594] text-white px-5 py-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1"
          >
            <span>{currentIndex < totalQuestions - 1 ? "Next" : "Review"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. MAIN SPLIT EXAM CANVAS (Exact 2-Column Split from Screenshot) */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Column: Question Stem & Section Heading */}
        <div className="w-full md:w-1/2 flex flex-col overflow-y-auto border-r border-slate-200 bg-white p-6 lg:p-8 space-y-5">
          {/* Top Row: Question Number and "Revisit Later" Bookmark Flag */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Question {currentIndex + 1}
            </h2>

            <button
              type="button"
              onClick={handleToggleFlag}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                flaggedQuestions.has(currentIndex)
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${flaggedQuestions.has(currentIndex) ? "fill-amber-600 text-amber-600" : ""}`} />
              <span>{flaggedQuestions.has(currentIndex) ? "Bookmarked" : "Revisit Later"}</span>
            </button>
          </div>

          {/* Section Heading & Category Title */}
          <div className="space-y-0.5">
            <div className="text-xs font-extrabold uppercase tracking-wide text-[#0b63c5]">
              {currentQ.subject || "TEST C. QUANTITATIVE"}
            </div>
            {currentQ.category && (
              <div className="text-sm font-bold text-[#0b63c5] underline underline-offset-4">
                {currentQ.category}
              </div>
            )}
          </div>

          {/* Instructions Stem & Highlighted Red Scratchpad Notice */}
          <div className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <p>
              For each item, select your answer from the four choices at the right by clicking the circle beside the letter of your chosen answer.{" "}
              <span className="inline-block bg-[#ef4444] text-white px-2 py-0.5 rounded font-medium text-xs mt-1 sm:mt-0 shadow-xs">
                In answering this test, you may use your authorized physical writing materials for scratch work.
              </span>
            </p>
          </div>

          {/* Question Equation / Stem */}
          <div className="pt-4 text-base sm:text-xl font-medium text-slate-900 leading-relaxed">
            <p>{currentQ.question}</p>
          </div>
        </div>

        {/* Right Column: Answer Options & Clear Response */}
        <div className="w-full md:w-1/2 flex flex-col justify-between overflow-y-auto bg-slate-50/50 p-6 lg:p-8 relative">
          <div className="space-y-4">
            {/* Top row: Choose Option instruction & Clear Response button */}
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs sm:text-sm font-bold text-slate-700">
                Choose the best option(s)
              </span>

              {userAnswers[currentIndex] && (
                <button
                  type="button"
                  onClick={handleClearResponse}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Response</span>
                </button>
              )}
            </div>

            {/* Radio Choice Cards */}
            <div className="space-y-3">
              {currentQ.options.map((opt) => {
                const isSelected = userAnswers[currentIndex] === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => handleSelectOption(opt.key)}
                    className={`flex items-center gap-3.5 p-3.5 rounded-lg border text-sm transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#0b63c5] bg-blue-50/70 text-slate-900 shadow-xs ring-1 ring-[#0b63c5]/30 font-semibold"
                        : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50/20"
                    }`}
                  >
                    {/* Radio Circle */}
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? "border-[#0b63c5] bg-[#0b63c5]"
                          : "border-slate-400 bg-white"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-slate-500 text-xs">({opt.key})</span>
                      <span className="text-xs sm:text-sm">{opt.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating advance arrow on the right edge */}
          <div className="pt-6 flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              className="w-10 h-10 rounded-full bg-[#0b63c5] hover:bg-[#095594] text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
              title="Next Item"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      {/* 4. FOOTER STATUS BAR (Mettl Assessment Footer) */}
      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 text-[11px] text-slate-500">
        {/* Left: Watermark & Wifi Signal */}
        <div className="flex items-center gap-2">
          <span>Mettl Online Assessment © 2021-2031</span>
          <span title="Network Online & Synced">
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          </span>
        </div>

        {/* Center: Help Desk / Contact Info */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span>Need Help? Contact us:</span>
          <span className="font-semibold text-slate-700">🇵🇭 +639 1234-56789</span>
        </div>

        {/* Right: Mercer Mettl Powered By, Battery, and Power Icon */}
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
            <span>Powered By</span>
            <span className="text-slate-800 font-black">Mercer | mettl</span>
          </div>

          <div className="flex items-center gap-1 text-emerald-600" title="Battery 100% (AC Connected)">
            <BatteryCharging className="w-4 h-4" />
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
            title="Exit / Finish Exam"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* Calculator Modal */}
      <CalculatorModal isOpen={showCalculator} onClose={() => setShowCalculator(false)} />

      {/* Question Palette / Roadmap Modal */}
      {showPalette && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Question Palette</h3>
              <button
                type="button"
                onClick={() => setShowPalette(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#0b63c5]" />
                <span className="text-slate-600">Current</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-600">Attempted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span className="text-slate-600">Revisit Later</span>
              </div>
            </div>

            {/* Question Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-60 overflow-y-auto p-1">
              {questions.map((_, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = userAnswers[idx] !== undefined;
                const isFlagged = flaggedQuestions.has(idx);

                let bgClass = "bg-slate-100 text-slate-700 hover:bg-slate-200";
                if (isCurrent) bgClass = "bg-[#0b63c5] text-white font-black ring-2 ring-blue-300";
                else if (isFlagged) bgClass = "bg-amber-100 text-amber-800 border border-amber-400 font-bold";
                else if (isAnswered) bgClass = "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold";

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowPalette(false);
                    }}
                    className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer transition-all ${bgClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPalette(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Close Palette
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-xs text-slate-700">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">CEM NMAT Assessment Guidelines</h3>
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-2 list-disc list-inside">
              <li>Each question presents 4 alternatives (A, B, C, D) with one best answer.</li>
              <li>You may use physical scratch paper and authorized writing materials for computation.</li>
              <li>Use the <strong>Revisit Later</strong> button to bookmark questions you want to review.</li>
              <li>Your answers are automatically saved to the cloud every few seconds.</li>
              <li>The digital test timer counts down your remaining time.</li>
            </ul>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="px-4 py-2 rounded-lg bg-[#0b63c5] text-white font-bold cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finish Test Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0b63c5] flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Finish Examination?</h3>
                <p className="text-xs text-slate-500">You are about to submit your assessment answers.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">Total Items:</span>
                <span className="font-bold text-slate-800">{totalQuestions} Questions</span>
              </div>
              <div>
                <span className="text-slate-500 block">Answered:</span>
                <span className="font-bold text-emerald-600">{answeredCount} of {totalQuestions}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Unanswered:</span>
                <span className="font-bold text-rose-600">{totalQuestions - answeredCount}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Bookmarked:</span>
                <span className="font-bold text-amber-600">{flaggedQuestions.size}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Return to Test
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(false);
                  setShowResults(true);
                }}
                className="px-5 py-2 rounded-lg bg-[#0b63c5] hover:bg-[#095594] text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95"
              >
                Submit & View Score
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results / Score Sheet Modal */}
      {showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                <Award className="w-4 h-4" />
                <span>CEM NMAT Online Assessment Evaluation</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Examination Summary
              </h2>
              <p className="text-xs text-slate-500">{testTitle}</p>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <span className="text-2xl sm:text-3xl font-black text-blue-700 block">
                  {scoreResults.percentile}
                </span>
                <span className="text-[11px] font-bold text-blue-600 uppercase">Percentile Rank</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 block">
                  {scoreResults.percentage}%
                </span>
                <span className="text-[11px] font-bold text-emerald-600 uppercase">Accuracy</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-2xl sm:text-3xl font-black text-slate-800 block">
                  {scoreResults.correct}/{scoreResults.total}
                </span>
                <span className="text-[11px] font-bold text-slate-500 uppercase">Raw Score</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-2xl sm:text-3xl font-black text-slate-800 block">
                  {formatTimer(sectionTimeSeconds)}
                </span>
                <span className="text-[11px] font-bold text-slate-500 uppercase">Time Spent</span>
              </div>
            </div>

            {/* Detailed Item Review with Rationales */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wide">Item Breakdown & Rationales</h4>
              {scoreResults.details.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">Q{idx + 1}. {item.question.subject}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                      {item.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium">{item.question.question}</p>
                  <div className="flex gap-4 text-[11px]">
                    <span className="text-slate-500">Your Answer: <strong className="text-slate-800">{item.selected || "None"}</strong></span>
                    <span className="text-slate-500">Correct: <strong className="text-emerald-700">{item.question.correctAnswer}</strong></span>
                  </div>
                  <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                    <strong className="text-blue-700 font-semibold">Rationale: </strong>{item.question.explanation}
                  </p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Link
                href="/"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
