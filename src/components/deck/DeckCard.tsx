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
  Layers 
} from 'lucide-react';
import { Deck, StudyMode } from '@/types';

interface DeckCardProps {
  deck: Deck;
  onStudy: (deckId: string, mode: StudyMode) => void;
  onEdit: (deck: Deck) => void;
  onDelete: (deckId: string) => void;
  onExport: (deckId: string) => void;
}

const CategoryIcon: React.FC<{ iconName: string; className?: string }> = ({ iconName, className }) => {
  switch (iconName) {
    case 'Stethoscope': return <Stethoscope className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'Calculator': return <Calculator className={className} />;
    default: return <Layers className={className} />;
  }
};

export const DeckCard: React.FC<DeckCardProps> = ({
  deck,
  onStudy,
  onEdit,
  onDelete,
  onExport
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  const totalCards = deck.cards.length;
  const dueToday = deck.stats?.dueToday ?? totalCards;
  const masteredCards = deck.stats?.masteredCards ?? 0;
  const masteryPercentage = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] p-5 sm:p-6 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-all flex flex-col justify-between group relative"
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
              className="p-1.5 rounded-xl text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-8 z-30 w-40 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xl p-1.5 text-xs font-semibold space-y-0.5">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(deck);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)]"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>Edit Deck</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onExport(deck.id);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)]"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-500" />
                    <span>Export Cards</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(deck.id);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-4 leading-relaxed">
          {deck.description || 'No description provided.'}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {deck.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]"
            >
              <Tag className="w-2.5 h-2.5 text-[var(--primary)]" />
              {tag}
            </span>
          ))}
          {deck.tags.length > 3 && (
            <span className="text-[10px] font-bold text-[var(--text-subtle)] px-1 py-0.5">
              +{deck.tags.length - 3} more
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

        {/* Mastery Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-[var(--text-subtle)]">
            <span>Mastery</span>
            <span>{masteryPercentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--primary)] to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${masteryPercentage}%` }}
            />
          </div>
        </div>

        {/* Study Button */}
        <button
          onClick={() => setShowModeSelector(true)}
          disabled={totalCards === 0}
          className="w-full py-3 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Study Deck</span>
        </button>
      </div>

      {/* Study Mode Selector Modal */}
      {showModeSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-3xl bg-[var(--bg-surface)] p-6 border border-[var(--border-color)] shadow-[var(--modal-shadow)] space-y-4"
          >
            <div className="text-center space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                Select Study Mode
              </span>
              <h3 className="text-lg font-black text-[var(--text-main)]">
                {deck.title}
              </h3>
            </div>

            <div className="space-y-2.5">
              {/* Option 1: Classic Spaced Repetition */}
              <button
                onClick={() => {
                  setShowModeSelector(false);
                  onStudy(deck.id, 'spaced-repetition');
                }}
                className="w-full p-4 rounded-2xl border-2 border-[var(--border-color)] hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all text-left flex items-center gap-3.5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-[var(--text-main)] block">
                    Classic Spaced Repetition (Anki)
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Flip cards & rate with SM-2 intervals (Again, Hard, Good, Easy)
                  </span>
                </div>
              </button>

              {/* Option 2: Multiple Choice Quiz */}
              <button
                onClick={() => {
                  setShowModeSelector(false);
                  onStudy(deck.id, 'multiple-choice');
                }}
                className="w-full p-4 rounded-2xl border-2 border-[var(--border-color)] hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all text-left flex items-center gap-3.5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-[var(--text-main)] block">
                    Multiple Choice Quizlet Style
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    4 options with instant color feedback & clinical rationales
                  </span>
                </div>
              </button>

              {/* Option 3: AI Smart Identification */}
              <button
                onClick={() => {
                  setShowModeSelector(false);
                  onStudy(deck.id, 'identification');
                }}
                className="w-full p-4 rounded-2xl border-2 border-[var(--border-color)] hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all text-left flex items-center gap-3.5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-[var(--text-main)] block">
                    AI Smart Identification (Gizmo)
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Type your answer; Google Gemini checks semantic accuracy
                  </span>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowModeSelector(false)}
              className="w-full py-2.5 rounded-2xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
