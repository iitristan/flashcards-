'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Sparkles,
  Stethoscope,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  X,
  BookOpen,
  Layers,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useNutriStore } from '@/lib/store/useNutriStore';

interface RndCongratulationsBannerProps {
  onSwitchToNmat?: () => void;
  onStayInNdle?: () => void;
}

export function RndCongratulationsBanner({ onSwitchToNmat, onStayInNdle }: RndCongratulationsBannerProps) {
  const { currentTrack, setExamTrack, dismissRndBanner, setDismissRndBanner, decks } = useNutriStore();
  const [isMinimized, setIsMinimized] = useState(false);

  if (dismissRndBanner) {
    return null;
  }

  const handleSelectNmat = () => {
    setExamTrack('NMAT');
    if (onSwitchToNmat) onSwitchToNmat();
  };

  const handleSelectNdle = () => {
    setExamTrack('NDLE');
    if (onStayInNdle) onStayInNdle();
  };

  const ndleDeckCount = decks.filter(d => d.track !== 'NMAT').length;
  const nmatDeckCount = decks.filter(d => d.track === 'NMAT').length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-300/40 dark:border-amber-500/25 bg-gradient-to-br from-amber-50 via-emerald-50/70 to-sky-50/60 dark:from-[#13221c] dark:via-[#162725] dark:to-[#122336] p-4 sm:p-6 shadow-xl mb-6 text-slate-800 dark:text-slate-100"
      >
        {/* Decorative background glow & sparkles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-emerald-400/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Header Row: Badges & Dismiss */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-black tracking-wide uppercase bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs">
                <Award className="w-3.5 h-3.5 text-amber-100" />
                <span>PRC Official Milestone</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-600/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Licensed Nutritionist-Dietitian (RND)</span>
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-xs flex items-center gap-1"
                title={isMinimized ? "Expand Announcement" : "Collapse Announcement"}
              >
                <span className="text-[11px] font-semibold hidden sm:inline">{isMinimized ? "Expand" : "Minimize"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMinimized ? '-rotate-90' : 'rotate-0'}`} />
              </button>
              <button
                type="button"
                onClick={() => setDismissRndBanner(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Dismiss Banner"
                aria-label="Dismiss Banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Main Headline & Milestone Description */}
              <div className="space-y-1.5 max-w-3xl">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Congratulations on passing the NDLE!</span>
                  <span className="text-xl sm:text-2xl">🎉🩺</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  You are now officially a <strong className="font-bold text-emerald-700 dark:text-emerald-400">Licensed Nutritionist-Dietitian (RND)</strong>.
                  As you embark on your next career milestone, Nutriboard now introduces <strong className="font-bold text-sky-700 dark:text-sky-300">NMAT Preparation Mode</strong> for aspiring physicians taking the National Medical Admission Test.
                </p>
              </div>

              {/* Action Buttons & Exam Track Switcher */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Mode:</span>
                  <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800/80 p-1 border border-slate-300/50 dark:border-slate-700/50">
                    <button
                      type="button"
                      onClick={handleSelectNdle}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${currentTrack === 'NDLE'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      <span>🥗 NDLE Mode</span>
                      <span className="text-[10px] opacity-80 font-normal">({ndleDeckCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectNmat}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${currentTrack === 'NMAT'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      <span>🩺 NMAT Mode</span>
                      <span className="text-[10px] opacity-80 font-normal">({nmatDeckCount})</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {currentTrack === 'NDLE' ? (
                    <button
                      type="button"
                      onClick={handleSelectNmat}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Stethoscope className="w-4 h-4" />
                      <span>Switch to NMAT Preparation Mode</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSelectNdle}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Back to NDLE Practice & Review</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

