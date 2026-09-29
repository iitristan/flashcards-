"use client";

import React, { useState } from "react";
import { X, Delete } from "lucide-react";

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalculatorModal({ isOpen, onClose }: CalculatorModalProps) {
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [resetNext, setResetNext] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (display === "0" || resetNext) {
      setDisplay(digit);
      setResetNext(false);
    } else {
      setDisplay(display + digit);
    }
  };

  const handleDecimal = () => {
    if (resetNext) {
      setDisplay("0.");
      setResetNext(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleOperator = (op: string) => {
    setEquation(`${display} ${op} `);
    setResetNext(true);
  };

  const handleClear = () => {
    setDisplay("0");
    setEquation("");
    setResetNext(false);
  };

  const handleBackspace = () => {
    if (display.length === 1 || (display.length === 2 && display.startsWith("-"))) {
      setDisplay("0");
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handleSqrt = () => {
    const val = parseFloat(display);
    if (val < 0) {
      setDisplay("Error");
    } else {
      setDisplay(String(Math.sqrt(val)));
    }
    setResetNext(true);
  };

  const handlePercentage = () => {
    const val = parseFloat(display);
    setDisplay(String(val / 100));
    setResetNext(true);
  };

  const handleEquals = () => {
    if (!equation) return;
    const fullExpr = equation + display;
    try {
      // Safe arithmetic evaluator
      const parts = equation.trim().split(" ");
      const prev = parseFloat(parts[0]);
      const op = parts[1];
      const curr = parseFloat(display);
      let res = 0;
      if (op === "+") res = prev + curr;
      else if (op === "-") res = prev - curr;
      else if (op === "×" || op === "*") res = prev * curr;
      else if (op === "÷" || op === "/") {
        if (curr === 0) {
          setDisplay("Error");
          setEquation("");
          return;
        }
        res = prev / curr;
      }
      // round to 8 decimals to prevent float precision issues
      const rounded = Math.round(res * 100000000) / 100000000;
      setEquation(`${fullExpr} =`);
      setDisplay(String(rounded));
      setResetNext(true);
    } catch {
      setDisplay("Error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xs overflow-hidden rounded-lg border border-slate-300 bg-slate-100 shadow-2xl">
        {/* Header bar matching CBLE theme */}
        <div className="flex items-center justify-between bg-[#2e3b44] px-4 py-2.5 text-white">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-wide">CBLE Exam Calculator</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            title="Close Calculator"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Calculator Display */}
        <div className="border-b border-slate-300 bg-slate-900 p-4 text-right">
          <div className="h-4 text-xs font-mono text-slate-400 truncate">
            {equation || "\u00A0"}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-white select-all overflow-x-auto">
            {display}
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-1.5 p-3 bg-slate-200">
          <button
            onClick={handleClear}
            className="rounded bg-rose-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-700 active:scale-95 transition-all"
          >
            C
          </button>
          <button
            onClick={handleBackspace}
            className="rounded bg-slate-300 px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-400 active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete className="h-4 w-4" />
          </button>
          <button
            onClick={handlePercentage}
            className="rounded bg-slate-300 px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-400 active:scale-95 transition-all"
          >
            %
          </button>
          <button
            onClick={() => handleOperator("÷")}
            className="rounded bg-sky-600 px-3 py-2.5 text-base font-bold text-white shadow-sm hover:bg-sky-700 active:scale-95 transition-all"
          >
            ÷
          </button>

          <button
            onClick={() => handleDigit("7")}
            className="rounded bg-white px-3 py-2.5 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            7
          </button>
          <button
            onClick={() => handleDigit("8")}
            className="rounded bg-white px-3 py-2.5 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            8
          </button>
          <button
            onClick={() => handleDigit("9")}
            className="rounded bg-white px-3 py-2.5 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            9
          </button>
          <button
            onClick={() => handleOperator("×")}
            className="rounded bg-sky-600 px-3 py-2.5 text-base font-bold text-white shadow-sm hover:bg-sky-700 active:scale-95 transition-all"
          >
            ×
          </button>

          <button
            onClick={() => handleDigit("4")}
            className="rounded bg-white px-3 py-2.5 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            4
          </button>
          <button
            onClick={() => handleDigit("5")}
            className="rounded bg-white px-3 py-2.5 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            5
          </button>
          <button
            onClick={() => handleDigit("6")}
            className="rounded bg-white px-3 py-2.5 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            6
          </button>
          <button
            onClick={() => handleOperator("-")}
            className="rounded bg-sky-600 px-3 py-2.5 text-base font-bold text-white shadow-sm hover:bg-sky-700 active:scale-95 transition-all"
          >
            -
          </button>

          <button
            onClick={() => handleDigit("1")}
            className="rounded bg-white px-3 py-2.5 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            1
          </button>
          <button
            onClick={() => handleDigit("2")}
            className="rounded bg-white px-3 py-2.5 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            2
          </button>
          <button
            onClick={() => handleDigit("3")}
            className="rounded bg-white px-3 py-2.5 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            3
          </button>
          <button
            onClick={() => handleOperator("+")}
            className="rounded bg-sky-600 px-3 py-2.5 text-base font-bold text-white shadow-sm hover:bg-sky-700 active:scale-95 transition-all"
          >
            +
          </button>

          <button
            onClick={handleSqrt}
            className="rounded bg-slate-300 px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-400 active:scale-95 transition-all"
          >
            √
          </button>
          <button
            onClick={() => handleDigit("0")}
            className="rounded bg-white px-3 py-2.5 text-base font-semibold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={handleDecimal}
            className="rounded bg-white px-3 py-2.5 text-base font-bold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            .
          </button>
          <button
            onClick={handleEquals}
            className="rounded bg-emerald-600 px-3 py-2.5 text-base font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
}
