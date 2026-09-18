'use client';

import React, { useState, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Check, Edit3, Sparkles } from 'lucide-react';
import { useNutriStore } from '@/lib/store/useNutriStore';

interface SelfNoteInputProps {
  cardId: string;
  deckId: string;
  initialNote?: string;
  className?: string;
}

export const SelfNoteInput: React.FC<SelfNoteInputProps> = ({
  cardId,
  deckId,
  initialNote = '',
  className = ''
}) => {
  const { saveCardNote } = useNutriStore();
  const [prevCardId, setPrevCardId] = useState(cardId);
  const [note, setNote] = useState(initialNote);
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(Boolean(initialNote));
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (prevCardId !== cardId) {
    setPrevCardId(cardId);
    setNote(initialNote || '');
    setIsExpanded(Boolean(initialNote));
  }


  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    setIsSaved(false);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await saveCardNote(deckId, cardId, val);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }, 800);
  };

  const handleBlur = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveCardNote(deckId, cardId, note);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className={`w-full rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] p-4 sm:p-5 shadow-sm space-y-3 transition-all ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-extrabold text-[var(--text-main)] hover:text-[var(--primary)] transition-colors text-left"
        >
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <StickyNote className="w-3.5 h-3.5" />
          </div>
          <span>My Personal Notes & Mnemonics</span>
          {note.trim() && (
            <span className="w-2 h-2 rounded-full bg-[var(--primary)]" title="Note attached" />
          )}
        </button>

        <div className="flex items-center gap-2">
          {isSaved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
            >
              <Check className="w-3 h-3" /> Saved
            </motion.span>
          )}

          {!isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>{note.trim() ? 'View / Edit' : 'Add Note'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Textarea */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden pt-1"
          >
            <textarea
              value={note}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Record your personal notes, memory tricks, or textbook page numbers for this specific item..."
              rows={3}
              className="w-full p-3 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs sm:text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] outline-none resize-y transition-colors font-medium leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-subtle)] px-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[var(--primary)]" />
                <span>Auto-saved to your personal card reviewer notes</span>
              </span>
              <span>{note.length} chars</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
