"use client";

import React, { useState } from "react";
import Link from "next/link";
import { X, AlertTriangle, RotateCcw, Award, BookOpen } from "lucide-react";
import { CBLEQuestion, CBLEExamineeProfile } from "@/data/cble-mock-data";

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
}

export function ResultsModal({
  isOpen,
  onClose,
  onRestart,
  questions,
  userAnswers,
  profile,
  timeSpentSeconds,
}: ResultsModalProps) {
  const [selectedReviewIdx, setSelectedReviewIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  let correctCount = 0;
  questions.forEach((q, idx) => {
    if (userAnswers[idx] === q.correctAnswer) {
      correctCount++;
    }
  });

  const total = questions.length;
  const percentage = Math.round((correctCount / total) * 100);
  const isPassed = percentage >= 80; // Target PRC 80% passing mark

  const formatMinutesSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="my-8 w-full max-w-3xl overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#2e3b44] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-amber-400" />
            <div>
              <h2 className="font-bold text-lg tracking-wide">PRC-CBLE Mock Board Examination Result</h2>
              <p className="text-xs text-slate-300">{profile.examinationName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Score Banner */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-black text-white shadow-lg ${
                  isPassed ? "bg-emerald-600 ring-4 ring-emerald-100" : "bg-rose-600 ring-4 ring-rose-100"
                }`}
              >
                {percentage}%
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      isPassed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {isPassed ? "PASSED (PRC Standard ≥ 80%)" : "NEEDS IMPROVEMENT (< 80%)"}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {correctCount} / {total} Correct Items
                </h3>
                <p className="text-xs text-slate-500">Examinee: {profile.name} ({profile.examineeNumber})</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md border border-slate-200 bg-white p-2.5">
                <span className="text-slate-400 font-medium">Time Taken</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{formatMinutesSeconds(timeSpentSeconds)}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-2.5">
                <span className="text-slate-400 font-medium">Passing Rating</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">80.00%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Review List */}
        <div className="p-6 max-h-[45vh] overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-600" /> Item-by-Item Review & Rationale
            </h4>
            <span className="text-xs text-slate-500">Click any item to view rationale</span>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const userAns = userAnswers[idx];
              const isCorrect = userAns === q.correctAnswer;
              const isExpanded = selectedReviewIdx === idx;

              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedReviewIdx(isExpanded ? null : idx)}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    isCorrect
                      ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50"
                      : "border-rose-200 bg-rose-50/40 hover:bg-rose-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                          isCorrect ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                          {q.question}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          <span className="text-slate-500">
                            Your Choice: <strong className={isCorrect ? "text-emerald-700" : "text-rose-700"}>{userAns || "None"}</strong>
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-500">
                            Correct: <strong className="text-emerald-700">{q.correctAnswer}</strong>
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{q.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-700 space-y-2">
                      <div className="font-semibold text-slate-900">Rationalization:</div>
                      <p className="leading-relaxed bg-white/80 p-2.5 rounded border border-slate-200">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onRestart}
              className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" /> Retake Mock Exam
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition-colors"
            >
              Exit to Dashboard
            </Link>
          </div>

          <button
            onClick={onClose}
            className="rounded bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow hover:bg-black transition-colors cursor-pointer"
          >
            Review Here
          </button>
        </div>
      </div>
    </div>
  );
}
