'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Download, 
  Play, 
  Tag, 
  Clock, 
  Stethoscope, 
  Calculator, 
  Layers,
  Flame,
  Check,
  FolderInput,
  Heart,
  Apple,
  RotateCcw,
  X
} from 'lucide-react';

import { useNutriStore } from '@/lib/store/useNutriStore';
import { Deck, StudyMode, DeckCategory, DECK_CATEGORIES, CATEGORY_CONFIG } from '@/types';

interface DeckCardProps {
  deck: Deck;
  onStudy: (deckId: string, mode: StudyMode, resume?: boolean) => void;
  onEdit: (deck: Deck) => void;
  onDelete: (deckId: string) => void;
  onExport: (deckId: string) => void;
  onUpdateCategory?: (deckId: string, category: DeckCategory) => void;
}

const CategoryIcon: React.FC<{ iconName: string; className?: string }> = ({ iconName, className }) => {
  switch (iconName) {
    case 'Stethoscope': return <Stethoscope className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'Calculator': return <Calculator className={className} />;
    case 'Heart': return <Heart className={className} />;
    case 'BookOpen': return <BookOpen className={className} />;
    case 'Apple': return <Apple className={className} />;
    default: return <Layers className={className} />;
  }
};

const getModeLabel = (mode: StudyMode) => {
  switch (mode) {
    case 'spaced-repetition': return 'Spaced Repetition';
    case 'blitz-marathon': return 'Blitz Marathon';
    case 'multiple-choice': return 'Multiple Choice';
    case 'identification': return 'AI Smart Identification';
    default: return 'Study';
  }
};

export const DeckCard: React.FC<DeckCardProps> = ({
  deck,
  onStudy,
  onEdit,
  onDelete,
  onExport,
  onUpdateCategory
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);

  const { deckCheckpoints, getDeckCheckpoint, clearDeckCheckpoint } = useNutriStore();
  const checkpoint = deckCheckpoints[deck.id] || getDeckCheckpoint(deck.id);
  const hasActiveCheckpoint = Boolean(
    checkpoint &&
    !checkpoint.isCompleted &&
    (checkpoint.currentIndex > 0 || (checkpoint.results || []).length > 0)
  );

  const cards = deck.cards || [];
  const totalCards = cards.length;
  const dueToday = deck.stats?.dueToday ?? totalCards;

  // Track comprehensive learning progress
  const practicedCards = cards.filter(c => Boolean(c.lastReviewedAt || (c.sm2?.repetitions || 0) > 0)).length;
  const unseenCards = Math.max(0, totalCards - practicedCards);
  const learningCards = cards.filter(c => (c.sm2?.repetitions || 0) > 0 && (c.sm2?.interval || 0) < 4).length;
  const developingCards = cards.filter(c => (c.sm2?.interval || 0) >= 4 && (c.sm2?.interval || 0) < 21).length;
  const inProgressCards = learningCards + developingCards;
  const masteredCards = deck.stats?.masteredCards ?? cards.filter(c => (c.sm2?.interval || 0) >= 21 || (c.sm2?.repetitions || 0) >= 4).length;

  const practicedPercentage = totalCards > 0 ? Math.round((practicedCards / totalCards) * 100) : 0;
  const masteryPercentage = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;
  const inProgressPercentage = totalCards > 0 ? Math.round((inProgressCards / totalCards) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 shadow-xs hover:shadow-sm hover:border-[var(--border-color-strong)] transition-all flex flex-col justify-between group relative"
    >
      {/* Top Bar: Icon, Category & Actions */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-xs flex-shrink-0"
              style={{ backgroundColor: `${deck.color}20`, color: deck.color }}
            >
              <CategoryIcon iconName={deck.icon} className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-wider block">
                {deck.category}
              </span>
              <h3 className="font-extrabold text-base sm:text-lg text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">
                {deck.title}
              </h3>
            </div>
          </div>

          {/* More options dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-xl text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-8 z-30 w-52 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xl p-1.5 text-xs font-semibold space-y-0.5">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(deck);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)] cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>Edit Deck</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onExport(deck.id);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-500" />
                    <span>Export Cards</span>
                  </button>

                  {/* Move to Category submenu in dropdown */}
                  <div className="pt-1 mt-1 border-t border-[var(--border-subtle)]">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] flex items-center gap-1">
                      <FolderInput className="w-3 h-3 text-[var(--primary)]" />
                      <span>Move to Category</span>
                    </div>
                    {DECK_CATEGORIES.map((cat) => {
                      const config = CATEGORY_CONFIG[cat];
                      const isCurrent = deck.category === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setShowMenu(false);
                            if (!isCurrent) {
                              onUpdateCategory?.(deck.id, cat);
                            }
                          }}
                          className={`w-full px-3 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-[var(--primary-light)] text-[var(--primary)] font-bold'
                              : 'hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span>{config?.emoji || '📚'}</span>
                            <span className="truncate">{cat}</span>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 flex-shrink-0 text-[var(--primary)]" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1 mt-1 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(deck.id);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Deck</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-4 leading-relaxed">
          {totalCards === 0 && /with \d+ cards/i.test(deck.description || '')
            ? 'No flashcards added to this deck yet.'
            : deck.description || 'No description provided.'}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(deck.tags || []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]"
            >
              <Tag className="w-2.5 h-2.5 text-[var(--primary)]" />
              {tag}
            </span>
          ))}
          {(deck.tags || []).length > 3 && (
            <span className="text-[10px] font-bold text-[var(--text-subtle)] px-1 py-0.5">
              +{(deck.tags || []).length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Bottom Progress & Study Button */}
      <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
        {/* Card stats */}
        <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[var(--primary)]" />
            {totalCards} {totalCards === 1 ? 'Card' : 'Cards'}
          </span>

          {dueToday > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Clock className="w-3 h-3" /> {dueToday} Due
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Up to date
            </span>
          )}
        </div>

        {/* Comprehensive Progress Tracking */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-[var(--text-subtle)]">
              Reviewed: <strong className="text-[var(--text-main)]">{practicedCards}/{totalCards}</strong> ({practicedPercentage}%)
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
              {masteryPercentage}% Mastered
            </span>
          </div>

          {/* Multi-stage Progress Bar: Mastered (green), In-Progress (teal), Unseen (subtle) */}
          <div className="w-full h-1.5 bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden flex border border-[var(--border-subtle)]">
            <div
              className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
              style={{ width: `${masteryPercentage}%` }}
              title={`Mastered: ${masteredCards} cards (${masteryPercentage}%)`}
            />
            <div
              className="h-full bg-teal-400 transition-all duration-500"
              style={{ width: `${inProgressPercentage}%` }}
              title={`In Progress: ${inProgressCards} cards (${inProgressPercentage}%)`}
            />
          </div>

          {/* Stage Breakdown Badges */}
          <div className="flex items-center justify-between text-[10px] text-[var(--text-subtle)]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{masteredCards} Mastered</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
              <span>{inProgressCards} Learning</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
              <span>{unseenCards} Unseen</span>
            </span>
          </div>
        </div>

        {/* In-Progress Checkpoint indicator */}
        {hasActiveCheckpoint && checkpoint && (
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--primary-light)]/40 border border-[var(--primary)]/20 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-[var(--primary)] text-[11px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary)]"></span>
              </span>
              In Progress · Card {checkpoint.currentIndex + 1} of {checkpoint.cardsQueue?.length || totalCards}
            </span>
            <span className="text-[10px] font-semibold text-[var(--text-muted)]">
              {getModeLabel(checkpoint.mode)}
            </span>
          </div>
        )}

        {/* Study Button */}
        <button
          onClick={() => {
            if (hasActiveCheckpoint) {
              setShowResumeModal(true);
            } else {
              setShowModeSelector(true);
            }
          }}
          disabled={totalCards === 0}
          className="w-full py-2.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 active:scale-98 shadow-xs cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>
            {hasActiveCheckpoint && checkpoint
              ? `Continue Study (Card ${checkpoint.currentIndex + 1})`
              : 'Study Deck'}
          </span>
        </button>
      </div>

      {/* Resume Mid-Way or Start Fresh Choice Modal */}
      {showResumeModal && checkpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] p-6 border border-[var(--border-color)] shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
                    Saved Session Progress
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
                    Card {checkpoint.currentIndex + 1} of {checkpoint.cardsQueue?.length || totalCards}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-[var(--text-main)]">
                  {deck.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResumeModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              You left mid-way at <span className="font-semibold text-[var(--text-main)]">Card {checkpoint.currentIndex + 1}</span> in <span className="font-semibold text-[var(--text-main)]">{getModeLabel(checkpoint.mode)}</span> mode with <span className="font-semibold text-[var(--text-main)]">{checkpoint.results?.length || checkpoint.currentIndex} answers</span> recorded.
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Resume where stopped */}
              <button
                type="button"
                onClick={() => {
                  setShowResumeModal(false);
                  onStudy(deck.id, checkpoint.mode, true);
                }}
                className="w-full p-3.5 rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-light)]/30 hover:bg-[var(--primary-light)]/60 text-left flex items-center gap-3 transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[var(--text-main)]">
                      Resume at Card {checkpoint.currentIndex + 1}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--primary)] text-white">
                      Resume
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                    Pick up right where you exited with answers and stats intact
                  </span>
                </div>
              </button>

              {/* Option 2: Start from the start */}
              <button
                type="button"
                onClick={() => {
                  clearDeckCheckpoint(deck.id);
                  setShowResumeModal(false);
                  onStudy(deck.id, checkpoint.mode, false);
                }}
                className="w-full p-3.5 rounded-xl border border-[var(--border-color)] hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 text-left flex items-center gap-3 transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-[var(--text-main)] block">
                    Start from the Start (Card 1)
                  </span>
                  <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                    Reset this session checkpoint and begin afresh from Card 1
                  </span>
                </div>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowResumeModal(false);
                  setShowModeSelector(true);
                }}
                className="text-[var(--primary)] font-semibold hover:underline cursor-pointer"
              >
                Change Study Mode
              </button>
              <button
                type="button"
                onClick={() => setShowResumeModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Study Mode Selector Modal */}
      {showModeSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] p-6 border border-[var(--border-color)] shadow-xl space-y-4"
          >
            <div className="text-center space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                Select Study Mode
              </span>
              <h3 className="text-lg font-black text-[var(--text-main)]">
                {deck.title}
              </h3>
            </div>

            {/* Quick Resume banner inside mode selector if checkpoint exists */}
            {hasActiveCheckpoint && checkpoint && (
              <div className="p-3 rounded-xl bg-[var(--primary-light)]/40 border border-[var(--primary)]/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--primary)] text-[11px]">
                    Saved session at Card {checkpoint.currentIndex + 1} of {checkpoint.cardsQueue?.length || totalCards}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
                    {getModeLabel(checkpoint.mode)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModeSelector(false);
                      onStudy(deck.id, checkpoint.mode, true);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                    <span>Resume Card {checkpoint.currentIndex + 1}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearDeckCheckpoint(deck.id);
                      setShowModeSelector(false);
                      onStudy(deck.id, checkpoint.mode, false);
                    }}
                    className="py-1.5 px-3 rounded-lg border border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restart</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {/* Option 1: Classic Spaced Repetition */}
              <button
                type="button"
                onClick={() => {
                  if (hasActiveCheckpoint) clearDeckCheckpoint(deck.id);
                  setShowModeSelector(false);
                  onStudy(deck.id, 'spaced-repetition', false);
                }}
                className="w-full p-3.5 rounded-xl border border-[var(--border-color)] hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all text-left flex items-center gap-3 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-[var(--text-main)] block">
                    Classic Spaced Repetition (Anki)
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Flip cards & rate with SM-2 intervals (Again, Hard, Good, Easy)
                  </span>
                </div>
              </button>

              {/* Option 2: Blitz Marathon */}
              <button
                type="button"
                onClick={() => {
                  if (hasActiveCheckpoint) clearDeckCheckpoint(deck.id);
                  setShowModeSelector(false);
                  onStudy(deck.id, 'blitz-marathon', false);
                }}
                className="w-full p-3.5 rounded-xl border border-[var(--border-color)] hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-950/30 transition-all text-left flex items-center gap-3 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-300 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-[var(--text-main)] block flex items-center gap-1.5">
                    <span>Blitz Marathon</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500 text-white uppercase tracking-wider">Fast-Paced</span>
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Timed sprint (12s/card) with combo multipliers & speed scoring
                  </span>
                </div>
              </button>

              {/* Option 3: Multiple Choice Quiz */}
              <button
                type="button"
                onClick={() => {
                  if (hasActiveCheckpoint) clearDeckCheckpoint(deck.id);
                  setShowModeSelector(false);
                  onStudy(deck.id, 'multiple-choice', false);
                }}
                className="w-full p-3.5 rounded-xl border border-[var(--border-color)] hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition-all text-left flex items-center gap-3 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-[var(--text-main)] block">
                    Multiple Choice (Board Exam)
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    4 options with color feedback, optional AI explanation & self-notes
                  </span>
                </div>
              </button>

              {/* Option 4: AI Smart Identification */}
              <button
                type="button"
                onClick={() => {
                  if (hasActiveCheckpoint) clearDeckCheckpoint(deck.id);
                  setShowModeSelector(false);
                  onStudy(deck.id, 'identification', false);
                }}
                className="w-full p-3.5 rounded-xl border border-[var(--border-color)] hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all text-left flex items-center gap-3 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-[var(--text-main)] block">
                    AI Smart Identification
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Type your answer; Google Gemini checks semantic accuracy
                  </span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowModeSelector(false)}
              className="w-full py-2.5 rounded-lg border border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
