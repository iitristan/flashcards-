'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  Zap,
  BookOpen,
  HelpCircle,
  Flame,
  Sparkles,
  Layers
} from 'lucide-react';
import { useNutriStore } from '@/lib/store/useNutriStore';

export const LearningAnalytics: React.FC = () => {
  const { analytics, loadAnalytics, preferences, decks } = useNutriStore();

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const maxCount = Math.max(
    preferences.dailyGoal,
    ...(analytics?.weeklyLogs.map(l => l.count) || [15])
  );

  const totalCardsInDecks = decks.reduce((sum, d) => sum + (d.cards?.length || 0), 0);

  return (
    <div className="w-full space-y-6">
      {/* Overview Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Streak */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)]">Current Streak</span>
            <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">
              {preferences.studyStreak || 1}
            </span>
            <span className="text-xs font-extrabold text-orange-500">Days 🔥</span>
          </div>
        </div>

        {/* Accuracy */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)]">Average Accuracy</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">
              {analytics?.overallAccuracyPercent || 95}%
            </span>
            <span className="text-xs font-extrabold text-emerald-600">Retention</span>
          </div>
        </div>

        {/* Time Studied */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)]">Time Invested</span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">
              {analytics?.totalTimeMinutes || 12}
            </span>
            <span className="text-xs font-extrabold text-blue-600">Minutes</span>
          </div>
        </div>

        {/* Total Deck Cards */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)]">Total Cards</span>
            <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">
              {totalCardsInDecks}
            </span>
            <span className="text-xs font-extrabold text-purple-600">In Review</span>
          </div>
        </div>
      </div>

      {/* Main Graph: 7-Day Study Volume Bar Chart */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
              <h3 className="text-base font-black text-[var(--text-main)]">
                Weekly Study Volume & Active Recall Activity
              </h3>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Daily cards reviewed vs your target daily goal of {preferences.dailyGoal} cards/day
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[var(--primary)]" />
              <span className="text-[var(--text-main)]">Cards Reviewed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-[var(--accent)]" />
              <span className="text-[var(--text-muted)]">Goal Line</span>
            </div>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="relative pt-6 pb-2">
          {/* Target Goal Reference Line */}
          <div
            className="absolute left-0 right-0 border-b-2 border-dashed border-[var(--accent)]/50 z-10 pointer-events-none flex items-center justify-end pr-2 text-[10px] font-bold text-[var(--accent)]"
            style={{
              bottom: `${Math.min(90, Math.max(15, (preferences.dailyGoal / maxCount) * 160))}px`
            }}
          >
            <span>Goal: {preferences.dailyGoal}</span>
          </div>

          {/* 7 Columns */}
          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 border-b border-[var(--border-subtle)] pb-2">
            {(analytics?.weeklyLogs || []).map((day, idx) => {
              const heightPercent = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              const isGoalMet = day.count >= day.goal;

              return (
                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[var(--text-main)] text-[var(--bg-main)] text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap z-20 pointer-events-none">
                    {day.count} cards ({day.date})
                  </div>

                  {/* Count above bar */}
                  <span className="text-[10px] font-bold text-[var(--text-subtle)] group-hover:text-[var(--primary)] transition-colors">
                    {day.count}
                  </span>

                  {/* Animated Bar */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(8, heightPercent)}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.08 }}
                    className={`w-full max-w-[36px] rounded-xl transition-all ${
                      day.dayLabel === 'Today'
                        ? 'bg-gradient-to-t from-[var(--primary)] to-emerald-400 shadow-sm'
                        : isGoalMet
                        ? 'bg-[var(--primary)]/80'
                        : day.count > 0
                        ? 'bg-[var(--primary-light)] border border-[var(--primary)]/30'
                        : 'bg-[var(--bg-surface-subtle)]'
                    }`}
                  />

                  {/* Day Label */}
                  <span className={`text-[11px] font-bold mt-1 ${
                    day.dayLabel === 'Today'
                      ? 'text-[var(--primary)] font-extrabold'
                      : 'text-[var(--text-muted)]'
                  }`}>
                    {day.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ARtLS Leitner Retention Funnel & Game Mode Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ARtLS Spaced Repetition Leitner Stages */}
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[var(--primary)]" />
              <h3 className="text-sm font-black text-[var(--text-main)]">
                ARtLS / Leitner Retention Stages
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              SM-2 Scheduling
            </span>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Card mastery stages based on SuperMemo SM-2 interval algorithms. Cards graduate from Box 1 (New) to Box 5 (Mastered &gt; 21 days).
          </p>

          <div className="space-y-2.5 pt-1">
            {[
              { name: 'Box 1: New / Unseen', count: analytics?.retentionFunnel.box1New || 0, color: 'bg-rose-500', desc: '0 days interval' },
              { name: 'Box 2: Learning Stage', count: analytics?.retentionFunnel.box2Learning || 0, color: 'bg-orange-500', desc: '1 to 3 days interval' },
              { name: 'Box 3: Developing Recall', count: analytics?.retentionFunnel.box3Developing || 0, color: 'bg-amber-500', desc: '4 to 10 days interval' },
              { name: 'Box 4: Proficient Memory', count: analytics?.retentionFunnel.box4Proficient || 0, color: 'bg-blue-500', desc: '11 to 20 days interval' },
              { name: 'Box 5: Mastered / Long-term', count: analytics?.retentionFunnel.box5Mastered || 0, color: 'bg-emerald-500', desc: '21+ days interval' },
            ].map((box, idx) => {
              const percent = totalCardsInDecks > 0 ? Math.round((box.count / totalCardsInDecks) * 100) : 0;

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-[var(--text-main)]">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${box.color}`} />
                      <span>{box.name}</span>
                    </span>
                    <span className="text-[var(--text-muted)]">{box.count} cards ({percent}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.05 }}
                      className={`h-full rounded-full ${box.color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Game Mode Learning Variety */}
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-black text-[var(--text-main)]">
                Game Modes & Variety Distribution
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
              Active Modes
            </span>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Diverse study modes optimize active recall and prevent learning fatigue through variety.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* 1. Basic Flashcard */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <BookOpen className="w-4 h-4" />
                <span>Basic Flashcard</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Classic SM-2 active recall & spaced intervals
              </p>
            </div>

            {/* 2. Blitz Marathon */}
            <div className="p-3.5 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400">
                <Flame className="w-4 h-4" />
                <span>Blitz Marathon</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Timed streak rush with score multipliers
              </p>
            </div>

            {/* 3. Multiple Choice */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                <HelpCircle className="w-4 h-4" />
                <span>Multiple Choice</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Board exam simulator with AI feedback
              </p>
            </div>

            {/* 4. AI Identification */}
            <div className="p-3.5 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400">
                <Sparkles className="w-4 h-4" />
                <span>AI Identification</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Type-in answers with semantic AI grading
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
