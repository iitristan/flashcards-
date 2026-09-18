'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertCircle } from 'lucide-react';
import { soundEffects } from '@/lib/soundEffects';

interface StudyTimerProps {
  initialSeconds: number; // e.g. 15, 30, 60
  onExpire?: () => void;
  isPaused?: boolean;
  cardIndex: number; // resets when card index changes
}

export const StudyTimer: React.FC<StudyTimerProps> = ({
  initialSeconds,
  onExpire,
  isPaused = false,
  cardIndex
}) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(initialSeconds);
    }, 0);
    return () => clearTimeout(timer);
  }, [cardIndex, initialSeconds]);

  useEffect(() => {
    if (initialSeconds <= 0 || isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => {
            if (onExpireRef.current) {
              onExpireRef.current();
            }
          }, 0);
          return 0;
        }


        // Soft tick sound when time is under 5 seconds
        if (prev <= 5) {
          soundEffects.playTick();
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [initialSeconds, isPaused, cardIndex]);

  if (initialSeconds <= 0) return null;

  const percentage = Math.max(0, (timeLeft / initialSeconds) * 100);
  const isUrgent = timeLeft <= 5 && timeLeft > 0;
  const isExpired = timeLeft === 0;

  return (
    <div className="flex items-center gap-2">
      <motion.div
        role="timer"
        aria-live="polite"
        aria-label={`Time remaining: ${timeLeft} seconds`}
        animate={isUrgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ repeat: Infinity, duration: 0.6 }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
          isExpired
            ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
            : isUrgent
            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
            : 'bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border-color)]'
        }`}
      >
        {isExpired ? (
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
        ) : (
          <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-amber-600 animate-spin' : 'text-[var(--primary)]'}`} />
        )}
        <span>{timeLeft}s</span>

        {/* Mini progress bar */}
        <div className="w-12 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden ml-1">
          <motion.div
            className={`h-full rounded-full transition-all duration-300 ${
              isUrgent ? 'bg-amber-500' : isExpired ? 'bg-rose-500' : 'bg-[var(--primary)]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </motion.div>
    </div>
  );
};
