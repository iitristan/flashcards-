'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart } from 'lucide-react';

const ENCOURAGING_QUOTES = [
  "You're doing amazing! One flashcard at a time, future RND! 🥗",
  "Remember: 1g Nitrogen = 6.25g Protein! Keep going! 🧠",
  "Hydration check! Drink some water while studying 💧",
  "Spaced repetition is science-backed memory magic ✨",
  "Every review is one step closer to passing the board exam! 🎓",
  "Be patient with yourself—difficult concepts take repetition! 🥑",
  "Nutritional biochemistry looks good on you! 🍎"
];

interface MascotBuddyProps {
  compact?: boolean;
  messageOverride?: string;
}

export const MascotBuddy: React.FC<MascotBuddyProps> = ({ compact = false, messageOverride }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isWinking, setIsWinking] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % ENCOURAGING_QUOTES.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    setIsWinking(true);
    setTimeout(() => setIsWinking(false), 800);
    setQuoteIndex(prev => (prev + 1) % ENCOURAGING_QUOTES.length);
  };

  const message = messageOverride || ENCOURAGING_QUOTES[quoteIndex];

  if (compact) {
    return (
      <div 
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] cursor-pointer hover:scale-105 transition-all text-xs font-medium text-[var(--text-main)] shadow-sm"
        title="Click me for study motivation!"
      >
        <span className="text-base animate-bounce">🥑</span>
        <span className="truncate max-w-[200px] text-[var(--text-muted)]">{message}</span>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-[var(--card-shadow)] relative overflow-hidden"
    >
      <div 
        onClick={handleClick}
        className="relative cursor-pointer group flex-shrink-0"
        title="Click Bento the Avocado for motivation!"
      >
        <motion.div 
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-200 border-2 border-emerald-300 flex items-center justify-center text-3xl shadow-inner select-none group-hover:scale-110 transition-transform"
        >
          {isWinking ? '😉' : '🥑'}
        </motion.div>
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 items-center justify-center text-[8px] text-white">
            ★
          </span>
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-0.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Bento — Your Study Buddy</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.3 }}
            className="text-sm font-medium text-[var(--text-main)] line-clamp-2"
          >
            &ldquo;{message}&rdquo;
          </motion.p>
        </AnimatePresence>
      </div>

      <button
        onClick={handleClick}
        className="p-2 rounded-xl text-[var(--text-subtle)] hover:text-[var(--primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors flex-shrink-0"
        title="Next tip"
      >
        <Heart className="w-4 h-4 hover:fill-current" />
      </button>
    </motion.div>
  );
};
