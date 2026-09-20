'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Check, Edit3, Sparkles, Save, ChevronDown, ChevronUp, ListChecks, CheckCircle2 } from 'lucide-react';
import { useNutriStore } from '@/lib/store/useNutriStore';
import { Flashcard } from '@/types';
import { cleanOptionLabel } from '@/lib/importers/anki/ankiConverter';
import { toast } from 'sonner';

interface SelfNoteInputProps {
  cardId: string;
  deckId: string;
  initialNote?: string;
  card?: Flashcard;
  className?: string;
}

export const SelfNoteInput: React.FC<SelfNoteInputProps> = ({
  cardId,
  deckId,
  initialNote = '',
  card,
  className = ''
}) => {
  const { decks, saveCardNote, updateCard, activeSession } = useNutriStore();

  // Find the live card object
  const currentCard = card || activeSession?.cardsQueue.find(c => c.id === cardId) || decks.flatMap(d => d.cards || []).find(c => c.id === cardId);

  const [activeTab, setActiveTab] = useState<'notes' | 'edit'>('notes');
  const [prevCardId, setPrevCardId] = useState(cardId);
  const [note, setNote] = useState(initialNote);
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(Boolean(initialNote));
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Edit card fields
  const [editFront, setEditFront] = useState(currentCard?.front || '');
  const [editRationale, setEditRationale] = useState(currentCard?.rationale || '');
  const [choices, setChoices] = useState<string[]>(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Helper to initialize choices from card
  const initializeChoices = (targetCard?: Flashcard) => {
    if (!targetCard) return;
    const cleanBack = cleanOptionLabel(targetCard.back || '');
    let initialList: string[] = [];

    if (targetCard.options && targetCard.options.length >= 2) {
      initialList = targetCard.options.map(opt => cleanOptionLabel(opt));
      if (!initialList.some(opt => opt.toLowerCase() === cleanBack.toLowerCase())) {
        initialList[0] = cleanBack;
      }
    } else {
      initialList = [
        cleanBack,
        'Increased dietary sodium intake',
        'Normal metabolic steady-state',
        'Standard clinical recommendation'
      ];
    }

    // Ensure at least 4 items
    while (initialList.length < 4) {
      initialList.push(`Clinical option ${initialList.length + 1}`);
    }
    const finalChoices = initialList.slice(0, 4);
    setChoices(finalChoices);

    // Find index of correct answer in choices
    const foundIdx = finalChoices.findIndex(c => c.trim().toLowerCase() === cleanBack.trim().toLowerCase());
    setCorrectIndex(foundIdx >= 0 ? foundIdx : 0);
  };

  useEffect(() => {
    if (currentCard) {
      setEditFront(currentCard.front || '');
      setEditRationale(currentCard.rationale || '');
      initializeChoices(currentCard);
    }
  }, [currentCard, cardId]);

  if (prevCardId !== cardId) {
    setPrevCardId(cardId);
    setNote(initialNote || '');
    setIsExpanded(Boolean(initialNote));
    if (currentCard) {
      setEditFront(currentCard.front || '');
      setEditRationale(currentCard.rationale || '');
      initializeChoices(currentCard);
    }
  }

  const handleChangeNote = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  const handleBlurNote = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveCardNote(deckId, cardId, note);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleChoiceChange = (idx: number, newVal: string) => {
    const updated = [...choices];
    updated[idx] = newVal;
    setChoices(updated);
  };

  const handleSaveCardCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFront.trim()) {
      toast.error('Question prompt cannot be empty.');
      return;
    }

    const cleanChoices = choices.map(c => c.trim()).filter(Boolean);
    if (cleanChoices.length < 2) {
      toast.error('Please provide at least 2 choices.');
      return;
    }

    const selectedCorrectAnswer = choices[correctIndex]?.trim() || cleanChoices[0];
    if (!selectedCorrectAnswer) {
      toast.error('Please specify the correct answer.');
      return;
    }

    setIsSavingCard(true);
    try {
      await updateCard(deckId, cardId, {
        front: editFront.trim(),
        back: selectedCorrectAnswer,
        options: cleanChoices,
        rationale: editRationale.trim()
      });
      toast.success('Card, choices & correct answer updated!');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      console.error('Failed to update card:', err);
      toast.error('Failed to save card correction.');
    } finally {
      setIsSavingCard(false);
    }
  };

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className={`w-full rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-3.5 sm:p-4.5 shadow-xs space-y-3 transition-all ${className}`}>
      {/* Header & Tabs (Mobile-Optimized Single Row) */}
      <div className="flex items-center justify-between gap-2 w-full min-w-0">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'notes' && isExpanded) {
                setIsExpanded(false);
              } else {
                setActiveTab('notes');
                setIsExpanded(true);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all truncate cursor-pointer ${
              activeTab === 'notes' && isExpanded
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-2xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)]'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="truncate">Notes</span>
            {note.trim() && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" title="Note attached" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeTab === 'edit' && isExpanded) {
                setIsExpanded(false);
              } else {
                setActiveTab('edit');
                setIsExpanded(true);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all truncate cursor-pointer ${
              activeTab === 'edit' && isExpanded
                ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30 shadow-2xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span className="truncate">Edit Card</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isSaved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
            >
              <Check className="w-3 h-3" />
              <span className="hidden xs:inline">Saved</span>
            </motion.span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 rounded-md text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors flex items-center gap-1 cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <>
                <span className="hidden xs:inline">Hide</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span className="hidden xs:inline">Open</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Section */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden pt-1"
          >
            {activeTab === 'notes' ? (
              <div className="space-y-2">
                <textarea
                  value={note}
                  onChange={handleChangeNote}
                  onBlur={handleBlurNote}
                  placeholder="Record your personal notes, memory tricks, or textbook page numbers for this specific item..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs sm:text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] outline-none resize-y transition-colors font-medium leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-subtle)] px-1">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[var(--primary)]" />
                    <span>Auto-saved to your personal card reviewer notes</span>
                  </span>
                  <span>{note.length} chars</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveCardCorrection} className="space-y-3.5 p-3.5 sm:p-4 rounded-xl bg-[var(--bg-surface-subtle)]/70 border border-[var(--border-subtle)] text-left">
                {/* Prompt / Question */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--text-muted)] block">
                    Question / Prompt (Front)
                  </label>
                  <textarea
                    value={editFront}
                    onChange={(e) => setEditFront(e.target.value)}
                    rows={2}
                    placeholder="Question prompt..."
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-blue-500 text-xs sm:text-sm text-[var(--text-main)] outline-none resize-y font-medium transition-colors"
                  />
                </div>

                {/* Choices Inputs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                      <ListChecks className="w-3.5 h-3.5 text-blue-500" />
                      <span>Multiple Choice Options</span>
                    </label>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Edit text for each option below
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {choices.map((choiceVal, cIdx) => {
                      const isSelectedCorrect = correctIndex === cIdx;
                      return (
                        <div
                          key={cIdx}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all ${
                            isSelectedCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              isSelectedCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]'
                            }`}
                          >
                            {letters[cIdx] || cIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={choiceVal}
                            onChange={(e) => handleChoiceChange(cIdx, e.target.value)}
                            placeholder={`Choice ${letters[cIdx] || cIdx + 1}...`}
                            className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-[var(--text-main)] outline-none font-medium"
                          />
                          {isSelectedCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mr-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Correct Answer Dropdown */}
                <div className="space-y-1.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/25">
                  <label htmlFor="correct-choice-select" className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Correct Answer (Select from Dropdown):</span>
                  </label>

                  <select
                    id="correct-choice-select"
                    value={correctIndex}
                    onChange={(e) => setCorrectIndex(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-surface)] border border-emerald-500/40 focus:border-emerald-500 text-xs sm:text-sm font-bold text-[var(--text-main)] outline-none cursor-pointer transition-colors"
                  >
                    {choices.map((choiceVal, cIdx) => (
                      <option key={cIdx} value={cIdx}>
                        {letters[cIdx] || cIdx + 1}: {choiceVal.trim() || `(Empty choice ${letters[cIdx] || cIdx + 1})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clinical Rationale */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--text-muted)] block">
                    Clinical / Exam Rationale
                  </label>
                  <textarea
                    value={editRationale}
                    onChange={(e) => setEditRationale(e.target.value)}
                    rows={2}
                    placeholder="Explanation why this is correct..."
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-blue-500 text-xs sm:text-sm text-[var(--text-main)] outline-none resize-y font-normal transition-colors"
                  />
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSavingCard}
                    className="px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingCard ? 'Saving Changes...' : 'Save Card & Choices'}</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
