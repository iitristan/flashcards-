"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  ChevronDown,
  Calculator as CalcIcon,
  ListOrdered,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Home,
} from "lucide-react";

import { DEFAULT_EXAMINEE, CBLEQuestion, MOCK_CBLE_QUESTIONS } from "@/data/cble-mock-data";
import { getCBLEExamQuestions, saveCBLEExamResult } from "@/actions/cble";
import { CalculatorModal } from "@/components/cble/calculator-modal";
import { RoadmapModal } from "@/components/cble/roadmap-modal";
import { ProfileModal } from "@/components/cble/profile-modal";
import { SubmitDialog, ResultsModal } from "@/components/cble/submit-dialog";

interface CBLEExamViewProps {
  initialQuestions: CBLEQuestion[];
  initialItemCount?: number;
}

export function CBLEExamView({ initialQuestions, initialItemCount = 100 }: CBLEExamViewProps) {
  const CBLE_ACTIVE_EXAM_STORAGE_KEY = "cble_active_exam_v1";

  const [questions, setQuestions] = useState<CBLEQuestion[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) return initialQuestions;
    return MOCK_CBLE_QUESTIONS;
  });
  const [selectedItemCount, setSelectedItemCount] = useState<100 | 200>(() => {
    return initialItemCount === 200 || (initialQuestions && initialQuestions.length > 100) ? 200 : 100;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  
  // Mobile-responsive sidebar state (open by default on desktop)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [examineeDropdownOpen, setExamineeDropdownOpen] = useState(false);

  // Close sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Timer tracking (Default: 120 mins for 100 items, 240 mins for 200 items)
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(() => {
    const is200 = initialItemCount === 200 || (initialQuestions && initialQuestions.length > 100);
    return (is200 ? 240 : 120) * 60;
  });
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<number, number>>({});
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(0);

  // Modals
  const [showCalculator, setShowCalculator] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Load saved in-progress exam session on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(CBLE_ACTIVE_EXAM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0 && !parsed.isCompleted) {
          setQuestions(parsed.questions);
          setCurrentIndex(parsed.currentIndex || 0);
          setUserAnswers(parsed.userAnswers || {});
          setFlaggedQuestions(new Set(Array.isArray(parsed.flaggedQuestions) ? parsed.flaggedQuestions : []));
          if (typeof parsed.timeRemainingSeconds === "number" && parsed.timeRemainingSeconds > 0) {
            setTimeRemainingSeconds(parsed.timeRemainingSeconds);
          }
          if (typeof parsed.totalTimeElapsed === "number") {
            setTotalTimeElapsed(parsed.totalTimeElapsed);
          }
          if (parsed.questionTimeSpent) {
            setQuestionTimeSpent(parsed.questionTimeSpent);
          }
          setIsExamStarted(true);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to load saved CBLE exam session:", e);
    }

    if (questions.length === 0) {
      setQuestions(initialQuestions && initialQuestions.length > 0 ? initialQuestions : MOCK_CBLE_QUESTIONS);
    }
  }, []);

  // Ensure questions array is never empty
  useEffect(() => {
    if (questions.length === 0) {
      setQuestions(initialQuestions && initialQuestions.length > 0 ? initialQuestions : MOCK_CBLE_QUESTIONS);
    }
  }, [questions.length, initialQuestions]);

  // Optimization: Save heavy exam state (questions, answers, flags) on interaction, not every second tick
  const timeRemainingRef = useRef(timeRemainingSeconds);
  const totalTimeElapsedRef = useRef(totalTimeElapsed);
  const questionTimeSpentRef = useRef(questionTimeSpent);

  useEffect(() => {
    timeRemainingRef.current = timeRemainingSeconds;
    totalTimeElapsedRef.current = totalTimeElapsed;
    questionTimeSpentRef.current = questionTimeSpent;
  }, [timeRemainingSeconds, totalTimeElapsed, questionTimeSpent]);

  useEffect(() => {
    if (typeof window === "undefined" || !isExamStarted || showResults || questions.length === 0) return;
    try {
      const payload = {
        questions,
        currentIndex,
        userAnswers,
        flaggedQuestions: Array.from(flaggedQuestions),
        timeRemainingSeconds: timeRemainingRef.current,
        totalTimeElapsed: totalTimeElapsedRef.current,
        questionTimeSpent: questionTimeSpentRef.current,
        isCompleted: false,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(CBLE_ACTIVE_EXAM_STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [questions, currentIndex, userAnswers, flaggedQuestions, isExamStarted, showResults]);

  // Periodic lightweight timer checkpoint every 10 seconds to avoid data loss on unexpected refresh
  useEffect(() => {
    if (!isExamStarted || showResults || totalTimeElapsed === 0 || totalTimeElapsed % 10 !== 0) return;
    try {
      const existing = localStorage.getItem(CBLE_ACTIVE_EXAM_STORAGE_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        parsed.timeRemainingSeconds = timeRemainingSeconds;
        parsed.totalTimeElapsed = totalTimeElapsed;
        localStorage.setItem(CBLE_ACTIVE_EXAM_STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch {}
  }, [totalTimeElapsed, isExamStarted, showResults, timeRemainingSeconds]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExamineeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Timer Countdown
  useEffect(() => {
    if (!isExamStarted || showResults) return;

    const interval = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });

      setTotalTimeElapsed((prev) => prev + 1);

      setQuestionTimeSpent((prev) => ({
        ...prev,
        [currentIndex]: (prev[currentIndex] || 0) + 1,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isExamStarted, showResults, currentIndex]);

  // Derived Best Time & Worst Time tracking (pure calculation, no setState inside useEffect)
  const { bestTime, worstTime } = useMemo(() => {
    const answeredTimes = Object.entries(userAnswers)
      .map(([idx]) => questionTimeSpent[Number(idx)] || 0)
      .filter((t) => t > 0);

    if (answeredTimes.length > 0) {
      const min = Math.min(...answeredTimes);
      const max = Math.max(...answeredTimes);
      return {
        bestTime: min > 0 ? min : 1,
        worstTime: max > 0 ? max : 31,
      };
    }
    return { bestTime: 1, worstTime: 31 };
  }, [userAnswers, questionTimeSpent]);

  // Format digital timer string: "00:00:13"
  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  };

  const handleSelectOption = useCallback((key: "A" | "B" | "C" | "D") => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: key,
    }));
  }, [currentIndex]);

  const handleToggleFlag = useCallback(() => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowSubmitDialog(true);
    }
  }, [currentIndex, questions.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleReviewUnanswered = useCallback(() => {
    setShowSubmitDialog(false);
    const firstUnansweredIdx = questions.findIndex((_, idx) => userAnswers[idx] === undefined);
    if (firstUnansweredIdx !== -1) {
      setCurrentIndex(firstUnansweredIdx);
    }
  }, [questions, userAnswers]);

  // Global Keyboard Navigation for CBLE Exam:
  // A, B, C, D or 1, 2, 3, 4: Select Option
  // ArrowRight / Enter: Next
  // ArrowLeft: Prev
  // F: Flag
  // R: Toggle Roadmap
  useEffect(() => {
    if (!isExamStarted || showResults) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target?.tagName)) return;
      if (showCalculator || showRoadmap || showProfile || showSubmitDialog) return;

      const key = e.key.toUpperCase();

      if (key === 'A' || key === '1') {
        e.preventDefault();
        handleSelectOption('A');
      } else if (key === 'B' || key === '2') {
        e.preventDefault();
        handleSelectOption('B');
      } else if (key === 'C' && !e.ctrlKey && !e.metaKey) {
        if (questions[currentIndex]?.options?.some(o => o.key === 'C')) {
          e.preventDefault();
          handleSelectOption('C');
        }
      } else if (key === 'D' || key === '4') {
        e.preventDefault();
        handleSelectOption('D');
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (key === 'F') {
        e.preventDefault();
        handleToggleFlag();
      } else if (key === 'R') {
        e.preventDefault();
        setShowRoadmap(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExamStarted, showResults, showCalculator, showRoadmap, showProfile, showSubmitDialog, questions, currentIndex, handleSelectOption, handleToggleFlag, handleNext, handlePrev]);

  const handleFinalizeSubmission = useCallback(async () => {
    setShowSubmitDialog(false);
    setShowResults(true);

    let correctCount = 0;
    const categoryStats: Record<string, { total: number; correct: number }> = {};

    questions.forEach((q, idx) => {
      const cat = q.category || "General Nutrition";
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, correct: 0 };
      }
      categoryStats[cat].total += 1;

      if (userAnswers[idx] === q.correctAnswer) {
        correctCount += 1;
        categoryStats[cat].correct += 1;
      }
    });

    const total = questions.length || 1;
    const scorePercentage = Math.round((correctCount / total) * 100);
    const isPassed = scorePercentage >= 80;

    // 1. Save locally to localStorage
    try {
      const historyItem = {
        id: `cble-local-${Date.now()}`,
        examineeName: DEFAULT_EXAMINEE.name,
        examinationName: DEFAULT_EXAMINEE.examinationName,
        subject: DEFAULT_EXAMINEE.subject,
        totalQuestions: total,
        correctCount,
        scorePercentage,
        isPassed,
        timeSpentSeconds: totalTimeElapsed,
        categoryBreakdown: categoryStats,
        completedAt: new Date().toISOString(),
      };
      const existingHistory = JSON.parse(localStorage.getItem("cble_exam_history") || "[]");
      existingHistory.unshift(historyItem);
      localStorage.setItem("cble_exam_history", JSON.stringify(existingHistory.slice(0, 30)));
      localStorage.removeItem(CBLE_ACTIVE_EXAM_STORAGE_KEY);
    } catch {
      // localStorage may fail in private mode
    }

    // 2. Persist to Database via Server Action
    await saveCBLEExamResult({
      examineeName: DEFAULT_EXAMINEE.name,
      examinationName: DEFAULT_EXAMINEE.examinationName,
      subject: DEFAULT_EXAMINEE.subject,
      totalQuestions: total,
      correctCount,
      scorePercentage,
      isPassed,
      timeSpentSeconds: totalTimeElapsed,
      userAnswers,
      categoryBreakdown: categoryStats,
    });
  }, [questions, userAnswers, totalTimeElapsed]);

  const handleSelectCount = async (count: 100 | 200) => {
    setSelectedItemCount(count);
    const durationMins = count === 200 ? 240 : 120;
    setTimeRemainingSeconds(durationMins * 60);

    if (count === 200 && questions.length < 200) {
      try {
        const moreQuestions = await getCBLEExamQuestions(200);
        if (moreQuestions && moreQuestions.length > 0) {
          setQuestions(moreQuestions);
        }
      } catch (e) {
        console.warn("Failed to load 200 questions:", e);
      }
    } else if (count === 100 && questions.length > 100) {
      setQuestions(questions.slice(0, 100));
    }
  };

  const handleRestartExam = async () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(CBLE_ACTIVE_EXAM_STORAGE_KEY);
      } catch {}
    }
    setUserAnswers({});
    setFlaggedQuestions(new Set());
    setCurrentIndex(0);
    const durationMins = selectedItemCount === 200 ? 240 : 120;
    setTimeRemainingSeconds(durationMins * 60);
    setTotalTimeElapsed(0);
    setQuestionTimeSpent({});
    setShowResults(false);
    try {
      const freshQuestions = await getCBLEExamQuestions(selectedItemCount);
      setQuestions(freshQuestions && freshQuestions.length > 0 ? freshQuestions : MOCK_CBLE_QUESTIONS);
    } catch {
      setQuestions(MOCK_CBLE_QUESTIONS);
    }
    setIsExamStarted(true);
  };

  const totalQuestions = questions.length;
  const currentQ = questions[currentIndex] || questions[0];
  const currentAnswer = userAnswers[currentIndex];
  const isCurrentFlagged = flaggedQuestions.has(currentIndex);

  if (totalQuestions === 0) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#eef1f4] p-4 text-center">
        <div className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-6 shadow-md">
          <h2 className="text-lg font-bold text-slate-900">Preparing CBLE Examination Bank</h2>
          <p className="mt-2 text-xs text-slate-600">
            Loading examination questions from database and high-yield question pools...
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={handleRestartExam}
              className="rounded bg-[#00838f] px-4 py-2 text-xs font-bold text-white hover:bg-[#006978]"
            >
              Reload Exam
            </button>
            <Link
              href="/"
              className="rounded border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden bg-[#eef1f4] text-slate-900 antialiased font-sans select-none"
      style={{ fontFamily: 'Arial, Helvetica, "Segoe UI", Tahoma, sans-serif' }}
    >
      {/* Top Navigation Bar (Authentic PH Gov CBLE style) */}
      <header className="flex h-11 shrink-0 items-center justify-between bg-[#d9e2ec] px-3 sm:px-4 border-b border-[#bcccdc]">
        {/* Left: Mobile & Desktop Hamburger Toggle & Title */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
            title="Toggle Navigation Menu"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-xs font-bold tracking-wide text-slate-700 hidden sm:inline-block">
            PRC COMPUTER-BASED LICENSURE EXAMINATION
          </span>
        </div>

        {/* Right-aligned Examinee Profile Dropdown (Exact match: 'BRIGETTE - Examinee v') */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setExamineeDropdownOpen(!examineeDropdownOpen)}
            className="flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-slate-950 transition-colors cursor-pointer py-1 px-1.5"
          >
            <span>
              {DEFAULT_EXAMINEE.name} - {DEFAULT_EXAMINEE.role}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-700" />
          </button>

          {examineeDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-60 rounded-[2px] border border-slate-400 bg-white py-1 shadow-lg z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-50">
                <p className="font-bold text-slate-900">{DEFAULT_EXAMINEE.name}</p>
                <p className="text-[11px] text-slate-600">{DEFAULT_EXAMINEE.school}</p>
                <p className="text-[10px] text-slate-500">{DEFAULT_EXAMINEE.testingCenter}</p>
              </div>
              <button
                onClick={() => {
                  setShowProfile(true);
                  setExamineeDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                <span>Examinee Profile</span>
              </button>
              <button
                onClick={() => {
                  setShowRoadmap(true);
                  setExamineeDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <ListOrdered className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  Question Roadmap ({Object.keys(userAnswers).length}/{totalQuestions})
                </span>
              </button>
              <button
                onClick={() => {
                  setShowCalculator(true);
                  setExamineeDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <CalcIcon className="h-3.5 w-3.5 text-slate-500" />
                <span>Calculator</span>
              </button>
              <Link
                href="/"
                className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 border-t border-slate-200"
              >
                <Home className="h-3.5 w-3.5 text-slate-500" />
                <span>Exit to Nutriboard Dashboard</span>
              </Link>
              <div className="border-t border-slate-200 mt-1 pt-1">
                <button
                  onClick={() => {
                    setShowSubmitDialog(true);
                    setExamineeDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-rose-700 hover:bg-rose-50 font-bold cursor-pointer"
                >
                  <span>Submit Examination</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Mobile Backdrop Overlay when sidebar is open */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 md:hidden backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />
        )}

        {/* Left Dark Sidebar (Exact PH Gov CBLE replica - Responsive Drawer on Mobile) */}
        {sidebarOpen && (
          <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-[#2e3b44] text-slate-100 shadow-2xl transition-all duration-150 md:relative md:z-0 md:shadow-none border-r border-[#1f2933]">
            {/* Top Brand Text with mobile close button */}
            <div className="flex h-12 items-center justify-between px-4 border-b border-slate-700/50">
              <span className="text-base font-bold tracking-wider text-white">
                PRC-CBLE
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-slate-400 hover:text-white md:hidden cursor-pointer"
                title="Close Sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Examinee Profile Section */}
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#38a169] text-white shadow-xs">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white tracking-wide leading-tight">
                    {DEFAULT_EXAMINEE.name}
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium">
                    {DEFAULT_EXAMINEE.role}
                  </div>
                </div>
              </div>

              {/* Menu link: Examinee Profile */}
              <div className="mt-5 border-t border-slate-700/40 pt-3 space-y-1">
                <button
                  onClick={() => {
                    setShowProfile(true);
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer w-full text-left py-1"
                >
                  <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>Examinee Profile</span>
                </button>
                <Link
                  href="/"
                  className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer w-full text-left py-1"
                >
                  <Home className="h-3.5 w-3.5 text-slate-400" />
                  <span>Nutriboard Dashboard</span>
                </Link>
              </div>

              {/* Quick shortcut to Roadmap on mobile */}
              <div className="mt-2 md:hidden">
                <button
                  onClick={() => {
                    setShowRoadmap(true);
                    setSidebarOpen(false);
                  }}
                  className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer w-full text-left py-1"
                >
                  <ListOrdered className="h-3.5 w-3.5 text-slate-400" />
                  <span>Question Roadmap</span>
                </button>
              </div>

              {/* Quick shortcut to Calculator on mobile */}
              <div className="mt-1 md:hidden">
                <button
                  onClick={() => {
                    setShowCalculator(true);
                    setSidebarOpen(false);
                  }}
                  className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer w-full text-left py-1"
                >
                  <CalcIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>Calculator</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area (Broad, Light-Colored, 100% Full Width Edge-to-Edge) */}
        <main className="flex flex-1 flex-col overflow-y-auto bg-white">
          <div className="flex w-full flex-1 flex-col">
            {/* Header Box (Split Layout - Spanning 100% Full Width, Clean Gov Look) */}
            <div className="border-b border-[#bcccdc] bg-[#edf2f6] px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-12 items-center">
                {/* Left Side: Structured Text Block */}
                <div className="md:col-span-8 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-800">
                  <div className="grid grid-cols-12 gap-1 sm:gap-2 items-baseline">
                    <span className="col-span-5 sm:col-span-4 lg:col-span-3 font-bold text-slate-700">
                      Examinee&apos;s Name:
                    </span>
                    <span className="col-span-7 sm:col-span-8 lg:col-span-9 font-bold text-slate-900 tracking-wide">
                      {DEFAULT_EXAMINEE.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-1 sm:gap-2 items-baseline">
                    <span className="col-span-5 sm:col-span-4 lg:col-span-3 font-bold text-slate-700">
                      Examination Name:
                    </span>
                    <span className="col-span-7 sm:col-span-8 lg:col-span-9 font-semibold text-slate-800">
                      {DEFAULT_EXAMINEE.examinationName}
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-1 sm:gap-2 items-baseline">
                    <span className="col-span-5 sm:col-span-4 lg:col-span-3 font-bold text-slate-700">
                      Subject:
                    </span>
                    <span className="col-span-7 sm:col-span-8 lg:col-span-9 font-semibold text-slate-800">
                      {currentQ.category || DEFAULT_EXAMINEE.subject}
                    </span>
                  </div>
                </div>

                {/* Right Side: Timer Panel */}
                <div className="md:col-span-4 flex flex-col items-center md:items-end justify-center pt-2 sm:pt-0 border-t border-slate-300 md:border-t-0">
                  <div className="text-center md:text-right">
                    <span className="text-xs font-semibold text-slate-700 block">
                      Time Remaining:
                    </span>

                    {/* Bold Digital Countdown Timer in Red (Classic Gov Monospace Font) */}
                    <div className="mt-0.5 font-mono text-3xl sm:text-4xl font-bold tracking-wider text-[#cc0000]">
                      {formatTimer(timeRemainingSeconds)}
                    </div>

                    {/* Best Time & Worst Time Subtext */}
                    <div className="mt-0.5 flex items-center justify-center md:justify-end gap-3 sm:gap-4 text-[11px] sm:text-xs text-slate-600 font-medium">
                      <span>
                        Best Time: <strong className="text-slate-800">{bestTime}s</strong>
                      </span>
                      <span>
                        Worst Time: <strong className="text-slate-800">{worstTime}s</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Toolbar (Full Width Strip Below Header, Right-aligned Utility Buttons) */}
            <div className="flex min-h-10 w-full items-center justify-between sm:justify-end gap-2 border-b border-[#bcccdc] bg-[#dfe6ed] px-3 sm:px-6 lg:px-8 py-1.5 sm:py-0">
              <span className="text-[11px] sm:hidden font-bold text-slate-600 uppercase">
                Item {currentIndex + 1} of {totalQuestions}
              </span>

              <div className="flex items-center gap-2">
                {/* Button 0: Flag / Bookmark Question for review */}
                <button
                  onClick={handleToggleFlag}
                  className={`flex items-center gap-1.5 rounded-[2px] px-3 py-1 text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                    isCurrentFlagged
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                  }`}
                  title={isCurrentFlagged ? "Unflag this question" : "Flag this question for review"}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${isCurrentFlagged ? "fill-white" : ""}`} />
                  <span>{isCurrentFlagged ? "Flagged ★" : "Flag Question"}</span>
                </button>

                {/* Button 1: Light blue Calculator button */}
                <button
                  onClick={() => setShowCalculator(true)}
                  className="flex items-center gap-1.5 rounded-[2px] bg-[#0097a7] hover:bg-[#00838f] px-3 py-1 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  <CalcIcon className="h-3.5 w-3.5" />
                  <span>Calculator</span>
                </button>

                {/* Button 2: Orange/Brown Question Roadmap button */}
                <button
                  onClick={() => setShowRoadmap(true)}
                  className="flex items-center gap-1.5 rounded-[2px] bg-[#b45309] hover:bg-[#9a3412] px-3 py-1 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                  <span>Question Roadmap</span>
                </button>
              </div>
            </div>

            {/* Question Area Container (Full Width Edge-to-Edge) */}
            {currentQ && (
              <div className="flex flex-1 w-full flex-col justify-between bg-white px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                <div className="space-y-4 max-w-5xl">
                  {/* Question Counter (e.g. Question 1 of 100) */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                      Question {currentIndex + 1} of {totalQuestions}
                    </span>
                    {isCurrentFlagged && (
                      <span className="rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-bold">
                        ★ Marked for Review
                      </span>
                    )}
                  </div>

                  {/* Primary Question Text */}
                  <div className="text-sm sm:text-base leading-relaxed text-slate-900 font-normal">
                    {currentQ.question}
                  </div>

                  {/* Embedded Multimedia / Image Support */}
                  {currentQ.image && (
                    <div className="my-3 flex flex-col items-center justify-center p-2 max-w-xl mx-auto">
                      {currentQ.image.isSvg && currentQ.image.svgContent ? (
                        <div
                          className="flex justify-center max-w-full overflow-x-auto"
                          dangerouslySetInnerHTML={{ __html: currentQ.image.svgContent }}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentQ.image.url}
                          alt={currentQ.image.alt || "Question Illustration"}
                          className="max-h-64 sm:max-h-72 border border-slate-300 object-contain w-auto shadow-xs"
                        />
                      )}
                      {currentQ.image.caption && (
                        <p className="mt-1 text-xs text-slate-500 italic text-center">
                          {currentQ.image.caption}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Multiple Choice Options (Classic Clean Radio Buttons, Touch-Friendly) */}
                  <div className="space-y-2 pt-2 sm:pt-3">
                    {currentQ.options.map((option) => {
                      const isSelected = currentAnswer === option.key;

                      return (
                        <label
                          key={option.key}
                          onClick={() => handleSelectOption(option.key)}
                          className={`flex items-start gap-3 p-2.5 sm:p-2 text-xs sm:text-sm cursor-pointer transition-colors min-h-[44px] ${
                            isSelected
                              ? "bg-[#e0f2fe] text-slate-950 font-medium"
                              : "text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`cble-q-${currentQ.id}`}
                            value={option.key}
                            checked={isSelected}
                            onChange={() => handleSelectOption(option.key)}
                            className="mt-0.5 h-4 w-4 text-sky-600 focus:ring-0 cursor-pointer"
                          />
                          <div className="leading-snug">
                            <span className="font-bold mr-1.5">{option.key}.</span>
                            <span>{option.text}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Pagination / Next Button (Mobile Friendly & Responsive) */}
                <div className="mt-8 pt-4 border-t border-slate-200">
                  <div className="flex flex-row items-center justify-between gap-2 sm:gap-4">
                    {/* Previous Button (Left) */}
                    <button
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className="flex items-center gap-1 rounded-[2px] border border-slate-400 bg-white px-3 sm:px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[38px]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </button>

                    {/* Prominent Wide 'Next' Button Positioned at Bottom Center */}
                    <button
                      onClick={handleNext}
                      className="flex flex-1 sm:flex-initial sm:w-56 items-center justify-center gap-1 rounded-[2px] bg-[#00838f] hover:bg-[#006978] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-colors cursor-pointer min-h-[38px]"
                    >
                      <span>{currentIndex === totalQuestions - 1 ? "Submit Exam" : "Next"}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Finish Test (Right) */}
                    <button
                      onClick={() => setShowSubmitDialog(true)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-950 underline cursor-pointer px-1 py-2 min-h-[38px] flex items-center"
                    >
                      Finish Test
                    </button>
                  </div>

                  {/* Hotkeys Quick Reference Bar */}
                  <div className="hidden sm:flex items-center justify-center gap-4 pt-3 text-[11px] text-slate-600 border-t border-slate-100 mt-2">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">A</kbd>-<kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">D</kbd> Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">→</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">Enter</kbd> Next
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">←</kbd> Prev
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">F</kbd> Flag
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">R</kbd> Roadmap
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Utility Modals */}
      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />

      <RoadmapModal
        isOpen={showRoadmap}
        onClose={() => setShowRoadmap(false)}
        questions={questions}
        currentIndex={currentIndex}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        onSelectQuestion={(idx) => setCurrentIndex(idx)}
      />

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        profile={DEFAULT_EXAMINEE}
      />

      <SubmitDialog
        isOpen={showSubmitDialog}
        onClose={() => setShowSubmitDialog(false)}
        onConfirmSubmit={handleFinalizeSubmission}
        onReviewUnanswered={handleReviewUnanswered}
        questions={questions}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
      />

      <ResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        onRestart={handleRestartExam}
        questions={questions}
        userAnswers={userAnswers}
        profile={DEFAULT_EXAMINEE}
        timeSpentSeconds={totalTimeElapsed}
      />

      {/* Initial Examination Briefing & Confirmation Modal */}
      {!isExamStarted && !showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 text-slate-800">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="w-11 h-11 rounded-xl bg-[#00838f]/10 text-[#00838f] flex items-center justify-center font-bold shrink-0">
                <CalcIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 leading-tight">
                  PRC-CBLE Mock Board Examination
                </h3>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Philippine NDLE Computer-Based Licensure Simulation
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs leading-relaxed">
              {/* Item Count Selector */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                  Select Exam Length:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectCount(100)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedItemCount === 100
                        ? "border-[#00838f] bg-[#00838f]/10 text-[#00838f] font-bold ring-2 ring-[#00838f]/20"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block text-xs font-black">100 Questions</span>
                    <span className="block text-[10px] text-slate-500 font-medium">120 Mins (2.0 Hrs)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectCount(200)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedItemCount === 200
                        ? "border-[#00838f] bg-[#00838f]/10 text-[#00838f] font-bold ring-2 ring-[#00838f]/20"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block text-xs font-black">200 Questions</span>
                    <span className="block text-[10px] text-slate-500 font-medium">240 Mins (4.0 Hrs)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Examinee</span>
                  <span className="font-bold text-sm text-slate-900">{DEFAULT_EXAMINEE.name}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Time Allowed</span>
                  <span className="font-bold text-sm text-slate-900">
                    {selectedItemCount === 200 ? "240 Minutes (4.0 Hrs)" : "120 Minutes (2.0 Hrs)"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-amber-900 space-y-1.5">
                <p className="font-bold text-xs">Official Examination Instructions:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
                  <li>Total of {selectedItemCount} questions representing official Philippine NDLE board exam standards.</li>
                  <li>The {selectedItemCount === 200 ? "4-hour" : "2-hour"} digital countdown timer begins immediately once you click Start.</li>
                  <li>You may use the on-screen scientific calculator and navigate questions freely.</li>
                  <li>Passing threshold is &ge; 80.0% GWA with no subject below 50.0%.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <Link
                href="/"
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Return to Hub
              </Link>
              <button
                type="button"
                onClick={() => setIsExamStarted(true)}
                className="px-5 py-2.5 bg-[#00838f] hover:bg-[#006978] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Start Examination Now</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
