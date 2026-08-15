'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ListMusic,
  Layers,
  Sparkles,
  HelpCircle,
  PenTool,
  Edit2,
  Trash2
} from 'lucide-react';
import { Deck, DeckPlaylist, StudyMode } from '@/types';

interface PlaylistCardProps {
  playlist: DeckPlaylist;
  allDecks: Deck[];
  onStartStudy: (playlistId: string, mode: StudyMode) => void;
  onEdit: (playlist: DeckPlaylist) => void;
  onDelete: (playlistId: string) => void;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  allDecks,
  onStartStudy,
  onEdit,
  onDelete
}) => {
  const includedDecks = allDecks.filter(d => playlist.deckIds.includes(d.id));
  const totalCards = includedDecks.reduce((sum, d) => sum + (d.cards?.length || 0), 0);

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] p-5 sm:p-6 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-all flex flex-col justify-between relative overflow-hidden group"
    >
      {/* Top Accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 opacity-80"
        style={{ backgroundColor: playlist.color }}
      />

      <div className="space-y-4">
        {/* Header: Icon, Title, Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs flex-shrink-0"
              style={{ backgroundColor: `${playlist.color}20`, color: playlist.color }}
            >
              {playlist.icon || '🎧'}
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--primary)]">
                <ListMusic className="w-3 h-3" /> Deck Playlist
              </span>
              <h3 className="text-base font-extrabold text-[var(--text-main)] truncate leading-tight">
                {playlist.title}
              </h3>
            </div>
          </div>

          {/* Edit / Delete Buttons */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(playlist)}
              aria-label={`Edit playlist ${playlist.title}`}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
              title="Edit Playlist"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete playlist "${playlist.title}"? Your individual decks and cards will not be deleted.`)) {
                  onDelete(playlist.id);
                }
              }}
              aria-label={`Delete playlist ${playlist.title}`}
              className="p-1.5 rounded-xl text-[var(--text-subtle)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Delete Playlist"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Description if available */}
        {playlist.description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
            {playlist.description}
          </p>
        )}

        {/* Included Decks Pill List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-[var(--primary)]" />
              <span>{includedDecks.length} Decks Combined</span>
            </span>
            <span className="text-[var(--text-main)] font-black">
              {totalCards} Total Cards
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
            {includedDecks.slice(0, 3).map((deck) => (
              <span
                key={deck.id}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-surface-subtle)] text-[var(--text-main)] border border-[var(--border-subtle)] truncate max-w-[160px]"
              >
                {deck.title}
              </span>
            ))}
            {includedDecks.length > 3 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--primary-light)] text-[var(--primary)]">
                +{includedDecks.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Study Launchers */}
      <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] space-y-2">
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
          Study Playlist In:
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onStartStudy(playlist.id, 'spaced-repetition')}
            aria-label={`Study ${playlist.title} in Flashcards mode`}
            className="py-2.5 px-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>

          <button
            onClick={() => onStartStudy(playlist.id, 'multiple-choice')}
            aria-label={`Study ${playlist.title} in Multiple Choice mode`}
            className="py-2.5 px-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] hover:border-[var(--primary)] text-[var(--text-main)] text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Quiz</span>
          </button>

          <button
            onClick={() => onStartStudy(playlist.id, 'identification')}
            aria-label={`Study ${playlist.title} in Identification mode`}
            className="py-2.5 px-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] hover:border-[var(--primary)] text-[var(--text-main)] text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95"
          >
            <PenTool className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Type-In</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
