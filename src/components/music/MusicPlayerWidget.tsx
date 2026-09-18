'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Music,
  Play,
  RotateCcw,
  Check,
  Disc
} from 'lucide-react';

import { useNutriStore } from '@/lib/store/useNutriStore';
import { parseYouTubeUrl } from '@/lib/music/youtubeUrlHelper';
import { toast } from 'sonner';

interface MusicPlayerWidgetProps {
  variant?: 'container' | 'study-bar' | 'compact';
  className?: string;
}

export const MusicPlayerWidget: React.FC<MusicPlayerWidgetProps> = ({
  variant = 'container',
  className = ''
}) => {
  const { musicSettings, setMusicSettings } = useNutriStore();
  const [inputUrl, setInputUrl] = useState(musicSettings.customUrl || '');
  const [isEditing, setIsEditing] = useState(!musicSettings.customUrl);

  const parsed = useMemo(() => {
    return parseYouTubeUrl(musicSettings.customUrl);
  }, [musicSettings.customUrl]);

  const handleLoadUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      toast.error('Please enter a YouTube link.');
      return;
    }

    const check = parseYouTubeUrl(trimmed);
    if (!check.isValid) {
      toast.error('Please enter a valid YouTube or YouTube Music link.');
      return;
    }

    setMusicSettings({
      customUrl: trimmed,
      isPlaying: true
    });
    setIsEditing(false);
    toast.success('Music loaded & playing in background!');
  };

  const handleClear = () => {
    setMusicSettings({ customUrl: '', isPlaying: false });
    setInputUrl('');
    setIsEditing(true);
  };

  if (variant === 'study-bar') {
    if (!musicSettings.customUrl || !parsed.isValid) return null;
    return (
      <div className={`w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] px-3 py-1.5 shadow-xs flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 flex items-center justify-center flex-shrink-0">
            <Music className="w-3 h-3" />
          </div>
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[var(--text-main)] truncate max-w-[180px] sm:max-w-[300px]">
              Audio Active
            </span>
            <div className="flex items-end gap-0.5 h-2.5">
              <motion.span
                animate={{ height: ['3px', '10px', '3px'] }}
                transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
                className="w-0.5 bg-teal-600 rounded-full"
              />
              <motion.span
                animate={{ height: ['8px', '3px', '8px'] }}
                transition={{ repeat: Infinity, duration: 0.5, ease: 'easeInOut', delay: 0.1 }}
                className="w-0.5 bg-teal-600 rounded-full"
              />
              <motion.span
                animate={{ height: ['5px', '10px', '5px'] }}
                transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut', delay: 0.2 }}
                className="w-0.5 bg-teal-600 rounded-full"
              />
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono text-[var(--text-muted)] truncate max-w-[140px] hidden xs:inline">
          {musicSettings.customUrl}
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`w-full h-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 flex items-center justify-center flex-shrink-0">
              <Music className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-[var(--text-main)] truncate">
                Focus Audio
              </h3>
              <p className="text-[10px] text-[var(--text-muted)] truncate">
                {musicSettings.customUrl && !isEditing ? 'Playing background beats' : 'YouTube study beats'}
              </p>
            </div>
          </div>

          {musicSettings.customUrl && !isEditing && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-2 py-0.5 rounded-md bg-[var(--bg-surface-subtle)] text-[10px] font-semibold text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-rose-600 transition-colors"
                title="Clear Audio"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {isEditing || !musicSettings.customUrl ? (
          <form onSubmit={handleLoadUrl} className="space-y-1.5 mt-auto">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Paste YouTube music link..."
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-xs text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-colors"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Play</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-2.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 flex items-center justify-between gap-2 mt-auto">
            <div className="flex items-center gap-2 min-w-0">
              <Disc className="w-4 h-4 text-[var(--primary)] animate-spin flex-shrink-0" style={{ animationDuration: '4s' }} />
              <span className="text-[11px] font-medium text-[var(--text-main)] truncate max-w-[140px] sm:max-w-[200px]">
                {musicSettings.customUrl}
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  // Fallback Container Variant
  return (
    <div className={`w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 sm:p-5 shadow-xs space-y-3 transition-all ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 flex items-center justify-center flex-shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5">
              <span>Background Study Music</span>
            </h3>
            <p className="text-[10px] text-[var(--text-muted)]">
              Paste any YouTube or YouTube Music link for audio-only study beats
            </p>
          </div>
        </div>

        {musicSettings.customUrl && !isEditing && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface-subtle)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-[11px] font-semibold transition-colors"
            >
              Change Link
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-500 transition-colors"
              title="Clear Music"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {isEditing || !musicSettings.customUrl ? (
        <form onSubmit={handleLoadUrl} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste YouTube or YouTube Music link..."
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-xs text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Music</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Disc className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
                Now Playing
              </span>
              <p className="text-xs font-medium text-[var(--text-main)] truncate max-w-[260px] sm:max-w-md">
                {musicSettings.customUrl}
              </p>
            </div>
          </div>

          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 flex-shrink-0">
            <Check className="w-3.5 h-3.5" />
            <span>Active</span>
          </span>
        </div>
      )}
    </div>
  );
};
