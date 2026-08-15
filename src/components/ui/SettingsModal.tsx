'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Palette, Volume2, VolumeX, Clock, RotateCcw, Sparkles } from 'lucide-react';
import { ThemeType, UserPreferences } from '@/types';
import { soundEffects } from '@/lib/soundEffects';
import { toast } from 'sonner';

interface SettingsModalProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  onResetDecks: () => Promise<void>;
  onClose: () => void;
}

const THEMES: { id: ThemeType; label: string; emoji: string; color: string; desc: string }[] = [
  { id: 'matcha', label: 'Matcha Calm', emoji: '🍵', color: '#7FA98B', desc: 'Sage greens & cream' },
  { id: 'strawberry', label: 'Strawberry Milk', emoji: '🍓', color: '#C8627C', desc: 'Dusky rose & creamy milk' },
  { id: 'dark', label: 'Cozy Night', emoji: '🌙', color: '#2D323F', desc: 'Dark slate & pastel glow' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  preferences,
  onUpdatePreferences,
  onResetDecks,
  onClose
}) => {
  const handleThemeChange = (theme: ThemeType) => {
    onUpdatePreferences({ theme });
    soundEffects.playFlip();
  };

  const handleTimerChange = (seconds: number) => {
    onUpdatePreferences({ timerDuration: seconds });
    soundEffects.playFlip();
  };

  const handleToggleSound = () => {
    const nextVal = !preferences.soundEnabled;
    onUpdatePreferences({ soundEnabled: nextVal });
    if (nextVal) {
      setTimeout(() => soundEffects.playCorrect(), 50);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all decks back to the original sample Nutrition & Dietetics board reviewer cards?')) {
      await onResetDecks();
      toast.success('Decks reset to original sample sets!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-[var(--modal-shadow)] overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-lg">
              ⚙️
            </div>
            <div>
              <h2 id="settings-title" className="text-lg font-black text-[var(--text-main)]">
                Preferences & Themes
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Customize your cozy NutriAnki study space
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close preferences modal"
            className="p-2 rounded-2xl text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Theme Switcher */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
              <Palette className="w-4 h-4 text-[var(--primary)]" />
              <span>Aesthetic Theme Palette</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {THEMES.map((th) => {
                const isSelected = preferences.theme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => handleThemeChange(th.id)}
                    aria-pressed={isSelected}
                    aria-label={`Select ${th.label} theme`}
                    className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 text-left ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--bg-surface-subtle)] ring-2 ring-[var(--primary)]/20 shadow-xs'
                        : 'border-[var(--border-color)] hover:border-[var(--primary)]/50'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-base shadow-xs flex-shrink-0"
                      style={{ backgroundColor: th.color, color: '#fff' }}
                    >
                      {th.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-extrabold text-xs text-[var(--text-main)] block truncate">
                        {th.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] block truncate">
                        {th.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timer Duration */}
          <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                <Clock className="w-4 h-4 text-[var(--primary)]" />
                <span>Time-Pressure Countdown</span>
              </div>
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                {preferences.timerDuration === 0 ? 'Disabled' : `${preferences.timerDuration}s per card`}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: 'Off', val: 0 },
                { label: '10s', val: 10 },
                { label: '15s', val: 15 },
                { label: '20s', val: 20 },
                { label: '25s', val: 25 },
                { label: '30s', val: 30 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => handleTimerChange(opt.val)}
                  className={`py-2.5 rounded-2xl border-2 text-xs font-bold transition-all ${
                    preferences.timerDuration === opt.val
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound Effects */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] text-[var(--primary)] flex items-center justify-center">
                {preferences.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <span className="font-bold text-xs text-[var(--text-main)] block">
                  Sound Effects
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Chimes, card swooshes, and victory audio
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleSound}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                preferences.soundEnabled ? 'bg-[var(--primary)]' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  preferences.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Daily Goal */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-[var(--text-main)]">
              <span>Daily Study Goal</span>
              <span className="text-[var(--primary)]">{preferences.dailyGoal} cards / day</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={preferences.dailyGoal}
              onChange={(e) => onUpdatePreferences({ dailyGoal: Number(e.target.value) })}
              className="w-full accent-[var(--primary)]"
            />
          </div>

          {/* Reset sample decks */}
          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <button
              onClick={handleReset}
              className="w-full py-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default Board Exam Decks</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/30">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-subtle)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>NutriAnki v1.0.0</span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
