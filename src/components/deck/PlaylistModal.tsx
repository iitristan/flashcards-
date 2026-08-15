'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ListMusic,
  Check,
  CheckSquare,
  Square,
  Search
} from 'lucide-react';
import { Deck, DeckPlaylist } from '@/types';
import { toast } from 'sonner';

interface PlaylistModalProps {
  initialPlaylist?: DeckPlaylist | null;
  decks: Deck[];
  onSave: (playlist: Omit<DeckPlaylist, 'id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>;
  onUpdate?: (id: string, updates: Partial<Omit<DeckPlaylist, 'id' | 'createdAt'>>) => Promise<unknown>;
  onClose: () => void;
}

const PLAYLIST_COLORS = [
  '#38704B', // Matcha Green
  '#B04761', // Strawberry Milk
  '#D48344', // Warm Ochre
  '#3B82F6', // Cobalt Blue
  '#8B5CF6', // Soft Violet
  '#059669', // Emerald
  '#DB2777', // Rose Pink
];

const PLAYLIST_ICONS = ['🎧', '📚', '⚡', '🥑', '🎯', '🔥', '🧠', '🌟', '📖', '🧪'];

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  initialPlaylist,
  decks,
  onSave,
  onUpdate,
  onClose
}) => {
  const [title, setTitle] = useState(initialPlaylist?.title || '');
  const [description, setDescription] = useState(initialPlaylist?.description || '');
  const [color, setColor] = useState(initialPlaylist?.color || PLAYLIST_COLORS[0]);
  const [icon, setIcon] = useState(initialPlaylist?.icon || PLAYLIST_ICONS[0]);
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>(initialPlaylist?.deckIds || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDeck = (deckId: string) => {
    setSelectedDeckIds(prev => 
      prev.includes(deckId) 
        ? prev.filter(id => id !== deckId)
        : [...prev, deckId]
    );
  };

  const selectAll = () => {
    setSelectedDeckIds(decks.map(d => d.id));
  };

  const deselectAll = () => {
    setSelectedDeckIds([]);
  };

  const filteredDecks = decks.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSelectedCards = decks
    .filter(d => selectedDeckIds.includes(d.id))
    .reduce((sum, d) => sum + (d.cards?.length || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a playlist title');
      return;
    }
    if (selectedDeckIds.length === 0) {
      toast.error('Please select at least 1 deck to include in the playlist');
      return;
    }

    setIsSubmitting(true);
    try {
      if (initialPlaylist && onUpdate) {
        await onUpdate(initialPlaylist.id, {
          title: title.trim(),
          description: description.trim(),
          color,
          icon,
          deckIds: selectedDeckIds
        });
        toast.success('Playlist updated successfully!');
      } else {
        await onSave({
          title: title.trim(),
          description: description.trim(),
          color,
          icon,
          deckIds: selectedDeckIds
        });
        toast.success(`Created playlist "${title.trim()}" with ${totalSelectedCards} cards! 🎧`);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save playlist';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="playlist-modal-title"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xl rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-[var(--modal-shadow)] overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-xs"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {icon}
            </div>
            <div>
              <h2 id="playlist-modal-title" className="text-lg font-black text-[var(--text-main)]">
                {initialPlaylist ? `Edit: ${initialPlaylist.title}` : 'Create Study Playlist'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Combine multiple decks into a unified study queue
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close playlist modal"
            className="p-2 rounded-2xl text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title & Icon */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
              Playlist Title & Icon
            </label>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  aria-label="Select playlist icon emoji"
                  className="w-14 h-12 rounded-2xl bg-[var(--bg-surface-subtle)] border-2 border-[var(--border-color)] text-xl flex items-center justify-center text-center cursor-pointer outline-none focus:border-[var(--primary)] transition-all appearance-none"
                >
                  {PLAYLIST_ICONS.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Board Exam Marathon, Clinical Combo..."
                aria-label="Playlist title"
                className="flex-1 px-4 py-3 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] focus:border-[var(--primary)] outline-none text-sm font-bold text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--text-muted)]">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Comprehensive multi-subject review for weekend prep"
              aria-label="Playlist description"
              className="w-full px-4 py-2.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] focus:border-[var(--primary)] outline-none text-xs font-medium text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-colors"
            />
          </div>

          {/* Color Tag */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text-muted)]">
              Theme Accent
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PLAYLIST_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Select color ${c}`}
                  className="w-7 h-7 rounded-full transition-transform flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: c, transform: color === c ? 'scale(1.2)' : 'scale(1)' }}
                >
                  {color === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Deck Multi-Select Section */}
          <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                  Select Decks ({selectedDeckIds.length} of {decks.length} selected)
                </label>
                <span className="text-[11px] font-semibold text-[var(--primary)]">
                  Total: {totalSelectedCards} flashcards in this playlist
                </span>
              </div>

              <div className="flex gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[var(--primary)] hover:underline"
                >
                  Select All
                </button>
                <span className="text-[var(--text-subtle)]">&bull;</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[var(--text-muted)] hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Search filter for decks */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter decks by title or category..."
                aria-label="Filter decks by title or category"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-main)] placeholder:text-[var(--text-subtle)] outline-none"
              />
            </div>

            {/* Deck List Checkboxes */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {filteredDecks.length === 0 ? (
                <p className="text-center py-6 text-xs text-[var(--text-muted)] font-medium">
                  No matching decks found
                </p>
              ) : (
                filteredDecks.map((deck) => {
                  const isChecked = selectedDeckIds.includes(deck.id);
                  return (
                    <div
                      key={deck.id}
                      onClick={() => toggleDeck(deck.id)}
                      className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer select-none ${
                        isChecked
                          ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--text-main)] shadow-xs'
                          : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div className="flex-shrink-0 text-[var(--primary)]">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 fill-[var(--primary)] text-white" />
                          ) : (
                            <Square className="w-4 h-4 text-[var(--text-subtle)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[var(--text-main)] truncate">
                            {deck.title}
                          </p>
                          <span className="text-[10px] text-[var(--text-muted)] block truncate">
                            {deck.category}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-main)] flex-shrink-0">
                        {deck.cards?.length || 0} cards
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)] font-bold text-xs transition-colors active:scale-98"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedDeckIds.length === 0}
              className="flex-1 py-3 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <ListMusic className="w-4 h-4" />
              <span>{initialPlaylist ? 'Save Changes' : 'Create Playlist'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
