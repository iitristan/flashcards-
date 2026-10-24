"use client";

import React, { useState, useMemo } from "react";
import { X, CheckCircle2, Bookmark, HelpCircle, ListFilter, XCircle } from "lucide-react";
import { CBLEQuestion } from "@/data/cble-mock-data";

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: CBLEQuestion[];
  currentIndex: number;
  userAnswers: Record<number, "A" | "B" | "C" | "D">;
  flaggedQuestions: Set<number>;
  onSelectQuestion: (index: number) => void;
  isReviewMode?: boolean;
}

export function RoadmapModal({
  isOpen,
  onClose,
  questions,
  currentIndex,
  userAnswers,
  flaggedQuestions,
  onSelectQuestion,
  isReviewMode = false,
}: RoadmapModalProps) {
  const [filter, setFilter] = useState<"all" | "answered" | "flagged" | "unanswered" | "mistakes" | "correct">("all");

  const total = questions.length;
  const answeredCount = Object.keys(userAnswers).length;
  const flaggedCount = flaggedQuestions.size;
  const unansweredCount = total - answeredCount;

  const correctCount = useMemo(() => {
    return questions.filter((q, idx) => userAnswers[idx] === q.correctAnswer).length;
  }, [questions, userAnswers]);

  const wrongCount = useMemo(() => {
    return questions.filter((q, idx) => userAnswers[idx] !== undefined && userAnswers[idx] !== q.correctAnswer).length;
  }, [questions, userAnswers]);

  const itemsWithIndex = useMemo(() => {
    return questions.map((q, idx) => {
      const isCurrent = idx === currentIndex;
      const userAns = userAnswers[idx];
      const isAnswered = userAns !== undefined;
      const isFlagged = flaggedQuestions.has(idx);
      const isCorrect = userAns === q.correctAnswer;
      const isMistake = isAnswered && !isCorrect;
      return { q, idx, isCurrent, isAnswered, isFlagged, isCorrect, isMistake, userAns };
    });
  }, [questions, currentIndex, userAnswers, flaggedQuestions]);

  const displayedItems = useMemo(() => {
    if (filter === "answered") return itemsWithIndex.filter((item) => item.isAnswered);
    if (filter === "flagged") return itemsWithIndex.filter((item) => item.isFlagged);
    if (filter === "unanswered") return itemsWithIndex.filter((item) => !item.isAnswered);
    if (filter === "mistakes") return itemsWithIndex.filter((item) => item.isMistake);
    if (filter === "correct") return itemsWithIndex.filter((item) => item.isCorrect);
    return itemsWithIndex;
  }, [itemsWithIndex, filter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex w-full max-w-2xl flex-col max-h-[85vh] rounded-lg border border-slate-300 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className={`flex items-center justify-between px-5 py-3 text-white ${isReviewMode ? "bg-slate-900" : "bg-[#a16207]"}`}>
          <div className="flex items-center gap-2 font-semibold">
            <ListFilter className="h-5 w-5" />
            <span className="text-base tracking-wide">
              {isReviewMode ? "Question Roadmap & Diagnostic Navigator" : "Question Roadmap & Progress"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Counters Bar */}
        <div className="grid grid-cols-4 gap-2 border-b border-slate-200 bg-slate-50 p-3 text-xs sm:text-sm">
          <button
            onClick={() => setFilter("all")}
            className={`flex flex-col items-center justify-center rounded border p-2 font-medium transition-all cursor-pointer ${
              filter === "all"
                ? "border-slate-800 bg-slate-800 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="text-[11px] uppercase text-slate-400">Total</span>
            <span className="text-base font-bold">{total}</span>
          </button>

          {isReviewMode ? (
            <>
              <button
                onClick={() => setFilter("mistakes")}
                className={`flex flex-col items-center justify-center rounded border p-2 font-medium transition-all cursor-pointer ${
                  filter === "mistakes"
                    ? "border-rose-700 bg-rose-700 text-white shadow-sm"
                    : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                }`}
              >
                <span className="text-[11px] uppercase opacity-90 flex items-center gap-1 font-bold">
                  <XCircle className="h-3 w-3" /> Mistakes
                </span>
                <span className="text-base font-bold">{wrongCount}</span>
              </button>

              <button
                onClick={() => setFilter("correct")}
                className={`flex flex-col items-center justify-center rounded border p-2 font-medium transition-all cursor-pointer ${
                  filter === "correct"
                    ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                <span className="text-[11px] uppercase opacity-90 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="h-3 w-3" /> Correct
                </span>
                <span className="text-base font-bold">{correctCount}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setFilter("answered")}
                className={`flex flex-col items-center justify-center rounded border p-2 font-medium transition-all cursor-pointer ${
                  filter === "answered"
                    ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                <span className="text-xs uppercase opacity-80 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Answered
                </span>
                <span className="text-base font-bold">{answeredCount}</span>
              </button>

              <button
                onClick={() => setFilter("flagged")}
                className={`flex flex-col items-center justify-center rounded border p-2 font-medium transition-all cursor-pointer ${
                  filter === "flagged"
                    ? "border-amber-700 bg-amber-700 text-white shadow-sm"
                    : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                <span className="text-xs uppercase opacity-80 flex items-center gap-1">
                  <Bookmark className="h-3 w-3" /> Flagged
                </span>
                <span className="text-base font-bold">{flaggedCount}</span>
              </button>
            </>
          )}

          <button
            onClick={() => setFilter("unanswered")}
            className={`flex flex-col items-center justify-center rounded border p-2 font-medium transition-all cursor-pointer ${
              filter === "unanswered"
                ? "border-slate-600 bg-slate-600 text-white shadow-sm"
                : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span className="text-[11px] uppercase opacity-80 flex items-center gap-1 font-bold">
              <HelpCircle className="h-3 w-3" /> {isReviewMode ? "Omitted" : "Remaining"}
            </span>
            <span className="text-base font-bold">{unansweredCount}</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 bg-slate-100 px-4 py-2 text-xs text-slate-600 border-b border-slate-200">
          {isReviewMode ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded bg-emerald-600"></span>
                <span>Correct Answer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded bg-rose-600"></span>
                <span>Mistake / Wrong Choice</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded bg-slate-200 border border-slate-400"></span>
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border-2 border-blue-600 bg-white"></span>
                <span>Current Item</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded bg-emerald-600"></span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded bg-amber-500"></span>
                <span>Flagged for Review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded bg-slate-200 border border-slate-400"></span>
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border-2 border-blue-600 bg-white"></span>
                <span>Current</span>
              </div>
            </>
          )}
        </div>

        {/* Question Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {displayedItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No questions found under &quot;{filter}&quot; filter.
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
              {displayedItems.map(({ q, idx, isCurrent, isAnswered, isFlagged, isCorrect, isMistake, userAns }) => {
                let buttonStyle = "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200";

                if (isReviewMode) {
                  if (isCorrect) {
                    buttonStyle = "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700";
                  } else if (isMistake) {
                    buttonStyle = "bg-rose-600 text-white border-rose-700 hover:bg-rose-700";
                  } else {
                    buttonStyle = "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200";
                  }
                } else {
                  if (isFlagged) {
                    buttonStyle = "bg-amber-500 text-white border-amber-600 hover:bg-amber-600";
                  } else if (isAnswered) {
                    buttonStyle = "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700";
                  }
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      onSelectQuestion(idx);
                      onClose();
                    }}
                    className={`relative flex h-11 flex-col items-center justify-center rounded-md border text-sm font-bold shadow-xs transition-all cursor-pointer ${buttonStyle} ${
                      isCurrent ? "ring-3 ring-blue-600 ring-offset-2 scale-105 z-10" : ""
                    }`}
                    title={`Question ${idx + 1}: ${
                      isReviewMode
                        ? isCorrect
                          ? `Correct (${userAns})`
                          : isMistake
                          ? `Mistake: You chose ${userAns}, correct is ${q.correctAnswer}`
                          : "Unanswered"
                        : isAnswered
                        ? `Answered (${userAns})`
                        : "Unanswered"
                    }${isFlagged ? " - Flagged" : ""}`}
                  >
                    <span>{idx + 1}</span>
                    {isAnswered && (
                      <span className="text-[10px] font-medium opacity-90 leading-none">
                        [{userAns}]
                      </span>
                    )}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-800 text-[9px] text-white">
                        ★
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
          <p className="text-xs text-slate-500">
            Click any question number to instantly navigate.
          </p>
          <button
            onClick={onClose}
            className="rounded bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-slate-900 transition-colors cursor-pointer"
          >
            Close Roadmap
          </button>
        </div>
      </div>
    </div>
  );
}
