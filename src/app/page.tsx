'use client';

import Link from 'next/link';
import React, { useEffect, useState, useMemo, useRef, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Settings, 
  UploadCloud, 
  Search, 
  Layers, 
  Filter, 
  TrendingUp, 
  BookOpen,
  ArrowRight,
  Play,
  Award,
  Brain,
  Clock,
  X
} from 'lucide-react';

import { useNutriStore } from '@/lib/store/useNutriStore';
import { Deck, StudyMode } from '@/types';
import { DeckCard } from '@/components/deck/DeckCard';
import { DeckManager } from '@/components/deck/DeckManager';
import { ImportExportModal } from '@/components/deck/ImportExportModal';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { StudyHeader } from '@/components/study/StudyHeader';
import { SpacedRepetitionCard } from '@/components/study/SpacedRepetitionCard';
import { MultipleChoiceView } from '@/components/study/MultipleChoiceView';
import { IdentificationView } from '@/components/study/IdentificationView';
import { BlitzMarathonView } from '@/components/study/BlitzMarathonView';
import { LearningAnalytics } from '@/components/study/LearningAnalytics';
import { BoardReadinessView } from '@/components/study/BoardReadinessView';
import { StudySessionSummary } from '@/components/study/StudySessionSummary';
import { AuthModal } from '@/components/auth/AuthModal';
import { toast } from 'sonner';



export default function NutriboardApp() {
  const {
    decks,
    isLoadingDecks,
    activeSession,
    preferences,
    user,
    syncStatus,
    saveStatus,
    resumeAvailableSession,
    resumeSession,
    dismissResumeSession,
    isAuthModalOpen,
    setIsAuthModalOpen,
    syncWithCloud,
    applyThisDeviceToCloudAndAllDevices,
    resetLocalAndPullFromCloud,
    loadDecks,
    startStudySession,
    recordAnswer,
    restartCurrentSession,
    endStudySession,
    createDeck,
    updateDeck,
    deleteDeck,
    resetDecks,
    addCard,
    updateCard,
    deleteCard,
    updatePreferences
  } = useNutriStore();

  // Local UI states
  const [activeTab, setActiveTab] = useState<'decks' | 'readiness' | 'analytics'>('decks');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [selectedExportDeckId, setSelectedExportDeckId] = useState<string | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTimerExpired, setIsTimerExpired] = useState(false);
  const [isConfirmCBLEOpen, setIsConfirmCBLEOpen] = useState(false);
  const [cbleItemCount, setCbleItemCount] = useState<100 | 200>(100);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Global search hotkey (/ or Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target?.tagName)) {
        if (e.key === 'Escape' && target === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
        return;
      }

      if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) && !activeSession) {
        e.preventDefault();
        setActiveTab('decks');
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSession]);

  // Initialize on mount; sync only when user returns to tab (not polling)
  useEffect(() => {
    const store = useNutriStore.getState();
    store.initPreferences();
    store.loadDecks().catch(() => {});
    store.initAuth().catch(() => {});

    // Optimization #8: Replace 30-second polling with visibility-based sync.
    // Only sync when user returns to the tab after being away 10+ seconds.
    let lastVisibleAt = Date.now();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastVisibleAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        const awaySeconds = (Date.now() - lastVisibleAt) / 1000;
        if (awaySeconds >= 10) {
          useNutriStore.getState().syncWithCloud().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Apply theme to document on preference change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', preferences.theme);
      if (preferences.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [preferences.theme]);

  // Filtered decks calculation: empty decks (no cards) are automatically excluded by default
  const filteredDecks = useMemo(() => {
    const q = (deferredSearchQuery || '').trim().toLowerCase();
    return decks.filter((deck) => {
      // Exclude decks with no cards by default
      if ((deck.cards?.length || 0) === 0) {
        return false;
      }

      const title = (deck.title || '').toLowerCase();
      const desc = (deck.description || '').toLowerCase();
      const tags = Array.isArray(deck.tags) ? deck.tags : [];
      const matchesSearch =
        !q ||
        title.includes(q) ||
        desc.includes(q) ||
        tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'All' || deck.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [decks, deferredSearchQuery, selectedCategory]);


  // Categories list (only derived from decks that contain cards)
  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    decks
      .filter((d) => (d.cards?.length || 0) > 0)
      .forEach((d) => {
        if (d.category) set.add(d.category);
      });
    return Array.from(set);
  }, [decks]);

  // Overview metrics
  const totalCardsCount = useMemo(() => {
    return decks.reduce((acc, deck) => acc + (deck.cards?.length || 0), 0);
  }, [decks]);

  const totalDueToday = useMemo(() => {
    return decks.reduce((acc, deck) => acc + (deck.stats?.dueToday || 0), 0);
  }, [decks]);

  const totalMastered = useMemo(() => {
    return decks.reduce((acc, deck) => acc + (deck.stats?.masteredCards || 0), 0);
  }, [decks]);

  // Handlers
  const handleStartStudy = (deckId: string, mode: StudyMode, dueOnly = false) => {
    try {
      setIsTimerExpired(false);
      startStudySession(deckId, mode, dueOnly);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Could not start study session';
      toast.error(errorMsg);
    }
  };


  const handleTimerExpire = () => {
    setIsTimerExpired(true);
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (window.confirm('Are you sure you want to delete this deck? This action cannot be undone.')) {
      await deleteDeck(deckId);
      toast.success('Deck deleted successfully');
    }
  };

  const handleExportDeck = (deckId: string) => {
    setSelectedExportDeckId(deckId);
    setIsImportExportOpen(true);
  };

  // --------------------------------------------------------------------------
  // ACTIVE STUDY SESSION VIEW
  // --------------------------------------------------------------------------
  if (activeSession) {
    const queue = Array.isArray(activeSession.cardsQueue) ? activeSession.cardsQueue : [];
    const isCompleted = activeSession.isCompleted || (queue.length > 0 && activeSession.currentIndex >= queue.length);
    const currentCard = queue[activeSession.currentIndex];

    return (
      <main className="min-h-screen bg-[var(--bg-main)] px-4 py-6 sm:py-10 flex flex-col justify-between">
        <div className="w-full max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <StudyHeader
            deckTitle={activeSession.deckTitle || 'Study Session'}
            mode={activeSession.mode || 'spaced-repetition'}
            currentIndex={activeSession.currentIndex || 0}
            totalCards={queue.length}
            timerDuration={activeSession.timerDurationSeconds || 0}
            soundEnabled={preferences.soundEnabled}
            saveStatus={saveStatus}
            onToggleSound={() =>
              updatePreferences({ soundEnabled: !preferences.soundEnabled })
            }
            onExit={endStudySession}
            onTimerExpire={handleTimerExpire}
            isPaused={isCompleted}
          />

          {/* Body: Summary or Card View */}
          <AnimatePresence mode="wait">
            {isCompleted || !currentCard ? (
              <StudySessionSummary
                key="summary"
                deckTitle={activeSession.deckTitle || 'Study Session'}
                results={activeSession.results || []}
                startTime={activeSession.startTime || Date.now()}
                streak={preferences.studyStreak || 1}
                onRestart={(missedOnly) => restartCurrentSession(missedOnly)}
                onReturnHome={endStudySession}
              />
            ) : (
              <motion.div
                key={currentCard.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {activeSession.mode === 'spaced-repetition' && (
                  <SpacedRepetitionCard
                    card={currentCard}
                    onRate={(rating) => recordAnswer({ rating, isCorrect: rating === 'good' || rating === 'easy' })}
                    isExpired={isTimerExpired}
                  />
                )}

                {activeSession.mode === 'blitz-marathon' && (
                  <BlitzMarathonView
                    card={currentCard}
                    currentIndex={activeSession.currentIndex}
                    totalCards={activeSession.cardsQueue.length}
                    onAnswer={(res) =>
                      recordAnswer({
                        rating: res.rating,
                        isCorrect: res.isCorrect,
                        userAnswer: res.selectedOption,
                        timeSpentSeconds: res.timeSpentSeconds
                      })
                    }
                  />
                )}

                {activeSession.mode === 'multiple-choice' && (
                  <MultipleChoiceView
                    card={currentCard}
                    onAnswer={(res) =>
                      recordAnswer({
                        rating: res.rating,
                        isCorrect: res.isCorrect,
                        userAnswer: res.selectedOption
                      })
                    }
                    isExpired={isTimerExpired}
                  />
                )}

                {activeSession.mode === 'identification' && (
                  <IdentificationView
                    card={currentCard}
                    onAnswer={(res) =>
                      recordAnswer({
                        rating: res.rating,
                        isCorrect: res.isCorrect,
                        userAnswer: res.userAnswer,
                        verdict: res.verdict,
                        feedback: res.feedback
                      })
                    }
                    isExpired={isTimerExpired}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>


      </main>
    );
  }


  // --------------------------------------------------------------------------
  // MAIN DASHBOARD VIEW
  // --------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300 pb-16">
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-30 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & App Title */}
          <div className="flex flex-col justify-center flex-shrink-0">
            <h1 className="font-extrabold text-xl tracking-tight text-[var(--text-main)] leading-none">
              Nutriboard
            </h1>
            <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1 hidden xs:block">
              Board Examination & Dietetics Reviewer
            </p>
          </div>

          {/* Right Action Icons & Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Live Auto-Sync Status Indicator & Modal Opener */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              aria-label="Open cloud synchronization settings"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] hover:bg-[var(--border-color)] text-xs font-medium text-[var(--text-muted)] transition-all cursor-pointer shadow-xs active:scale-95"
              title="Click to manage multi-device sync & push master data"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                  syncStatus === 'syncing'
                    ? 'bg-amber-400 animate-pulse'
                    : syncStatus === 'error'
                    ? 'bg-rose-500'
                    : 'bg-emerald-500'
                }`}
              />
              <span className="text-[11px] font-semibold text-[var(--text-subtle)] hidden sm:inline">
                {syncStatus === 'syncing'
                  ? 'Auto-Syncing...'
                  : syncStatus === 'error'
                  ? 'Sync error'
                  : 'Auto-Synced'}
              </span>
            </button>

            {/* Import / Export Tool */}
            <button
              onClick={() => setIsImportExportOpen(true)}
              aria-label="Open import or export flashcard tool"
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)] text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer"
              title="Import / Export Cards"
            >
              <UploadCloud className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[var(--text-muted)]" />
              <span className="hidden md:inline">Import/Export</span>
            </button>

            {/* Settings Modal */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open preferences and themes settings"
              className="px-2.5 py-1.5 sm:px-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)] text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer"
              title="Settings & Themes"
            >
              <Settings className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="hidden md:inline">Settings</span>
            </button>

            {/* Create Deck Button */}
            <button
              onClick={() => {
                setEditingDeck(null);
                setIsCreatingDeck(true);
              }}
              aria-label="Create new reviewer flashcard deck"
              className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 active:scale-95 flex-shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Deck</span>
              <span className="sm:hidden">Deck</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-5">
        {/* RESUME IN-PROGRESS STUDY CHECKPOINT BANNER */}
        {resumeAvailableSession && !activeSession && (
          <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[var(--card-shadow)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-bold flex-shrink-0">
                <Play className="w-4 h-4 ml-0.5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
                    Active Session Saved
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] font-semibold">
                    Card {resumeAvailableSession.currentIndex + 1} of {resumeAvailableSession.cardsQueue.length}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[var(--text-main)] mt-0.5">
                  {resumeAvailableSession.deckTitle} <span className="text-[var(--text-subtle)] font-normal">· {resumeAvailableSession.mode.replace('-', ' ')}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={dismissResumeSession}
                className="px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-surface-subtle)] transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={resumeSession}
                className="px-4 py-1.5 text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Resume Session</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW TABS & SEARCH BAR */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('decks')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'decks'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Decks ({filteredDecks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('readiness')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'readiness'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)]'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Board Readiness</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)]'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Analytics & Graphs</span>
              </button>
            </div>

            {/* Search Input (when in decks) */}
            {activeTab === 'decks' && (
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search flashcards or decks"
                  placeholder="Search cards, formulas, diets, tags... (Press /)"
                  className="w-full pl-9 pr-14 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] focus:border-[var(--primary)] outline-none text-xs font-medium text-[var(--text-main)] placeholder:text-[var(--text-subtle)] shadow-xs transition-colors"
                />
                {!searchQuery && (
                  <span className="hidden sm:inline-flex items-center absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-subtle)] pointer-events-none">
                    /
                  </span>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search input"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Category Filter Pills (when Decks tab is active) */}
          {activeTab === 'decks' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-medium text-[var(--text-subtle)] flex items-center gap-1 pl-1 flex-shrink-0">
                <Filter className="w-3 h-3" />
              </span>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--primary)] text-white shadow-xs'
                        : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] hover:bg-[var(--bg-surface-subtle)]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* TAB CONTENT: DECKS TAB */}
        {activeTab === 'decks' && (
          <div className="space-y-4 sm:space-y-5">
            {/* PRC-CBLE MOCK BOARD EXAMINATION ACCESS CARD */}
            <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-[#263238] p-4 sm:p-5 text-white shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
                      Official Simulation
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                      PRC-CBLE Interface
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                    NDLE PRC Computer-Based Licensure Examination
                  </h2>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    Take the full 100-question timed mock board exam with digital countdown timer, on-screen calculator, question roadmap, and immediate scoring.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmCBLEOpen(true)}
                  className="shrink-0 rounded-lg bg-[#00a2d9] hover:bg-[#0284c7] px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <span>Launch Mock Board (CBLE)</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* HERO SECTION: Review Metrics */}
            <div className="w-full p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
                  <BookOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
                  Review Overview
                </span>
                <span className="text-[11px] font-medium text-[var(--text-muted)] lowercase first-letter:uppercase">
                  Target: {Math.min(totalMastered, preferences.dailyGoal)} / {preferences.dailyGoal} cards
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center py-2">
                <div>
                  <span className="text-xl sm:text-2xl font-bold text-[var(--text-main)] block">
                    {totalCardsCount}
                  </span>
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">
                    Total Cards
                  </span>
                </div>
                <div className="border-x border-[var(--border-subtle)]">
                  <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 block">
                    {totalDueToday}
                  </span>
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">
                    Due Today
                  </span>
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-bold text-teal-600 dark:text-teal-400 block">
                    {totalMastered}
                  </span>
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">
                    Mastered
                  </span>
                </div>
              </div>

              {/* Daily Target Progress Bar */}
              <div className="pt-2 mt-1 border-t border-[var(--border-subtle)]">
                <div className="w-full h-1.5 bg-[var(--bg-surface-subtle)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((totalMastered / Math.max(1, preferences.dailyGoal)) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          <div>
            {isLoadingDecks ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 animate-pulse" />
                </div>
                <p className="text-xs font-semibold text-[var(--text-muted)]">
                  Loading clinical review decks...
                </p>
              </div>
            ) : filteredDecks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDecks.map((deck) => (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    onStudy={handleStartStudy}
                    onEdit={(d) => {
                      setEditingDeck(d);
                      setIsCreatingDeck(true);
                    }}
                    onDelete={handleDeleteDeck}
                    onExport={handleExportDeck}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-[var(--bg-surface)] border border-dashed border-[var(--border-color)] space-y-3.5">
                <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--bg-surface-subtle)] text-[var(--text-subtle)] flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[var(--text-main)]">
                    No flashcard decks found
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                    {searchQuery
                      ? `No decks matched "${searchQuery}". Try a different keyword or reset filters.`
                      : 'Get started by creating your first deck or restoring preloaded sample decks.'}
                  </p>
                </div>
                <div className="flex justify-center gap-2.5 pt-2">
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingDeck(null);
                      setIsCreatingDeck(true);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold shadow-xs hover:bg-[var(--primary-hover)] cursor-pointer"
                  >
                    + Create New Deck
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        )}



        {/* TAB CONTENT: ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div>
            <LearningAnalytics />
          </div>
        )}

        {/* TAB CONTENT: BOARD READINESS TAB */}
        {activeTab === 'readiness' && (
          <div>
            <BoardReadinessView
              onStartSubjectPractice={() => {
                if (decks.length > 0) {
                  startStudySession(decks[0].id, 'multiple-choice');
                }
              }}
            />
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Deck Manager (Create / Edit Deck & Cards) */}

      {isCreatingDeck && (
        <DeckManager
          initialDeck={editingDeck}
          onSaveDeck={createDeck}
          onUpdateDeck={updateDeck}
          onAddCard={addCard}
          onUpdateCard={updateCard}
          onDeleteCard={deleteCard}
          onClose={() => {
            setIsCreatingDeck(false);
            setEditingDeck(null);
          }}
        />
      )}



      {/* 3. Import / Export Modal */}
      {isImportExportOpen && (
        <ImportExportModal
          decks={decks}
          selectedDeckId={selectedExportDeckId}
          onImportSuccess={loadDecks}
          onClose={() => {
            setIsImportExportOpen(false);
            setSelectedExportDeckId(null);
          }}
        />
      )}

      {/* 4. Settings & Theme Modal */}
      {isSettingsOpen && (
        <SettingsModal
          preferences={preferences}
          onUpdatePreferences={updatePreferences}
          onResetDecks={resetDecks}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* 5. Cloud Sync & Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal
          user={user}
          syncStatus={syncStatus}
          localDecksCount={decks.length}
          onSyncNow={syncWithCloud}
          onApplyThisDeviceToCloud={applyThisDeviceToCloudAndAllDevices}
          onResetLocalAndPullFromCloud={resetLocalAndPullFromCloud}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* 6. Launch Mock Board (CBLE) Confirmation Modal */}
      {isConfirmCBLEOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[var(--bg-surface)] text-[var(--text-main)] rounded-3xl border border-[var(--border-color)] shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[var(--text-main)] leading-snug">
                    Launch Mock Board Exam?
                  </h3>
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Official NDLE PRC-CBLE Simulation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmCBLEOpen(false)}
                className="text-[var(--text-subtle)] hover:text-[var(--text-main)] p-1 rounded-lg hover:bg-[var(--bg-surface-subtle)] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 py-1 text-xs text-[var(--text-muted)] leading-relaxed">
              {/* Item Count Selector */}
              <div>
                <span className="text-[11px] font-bold text-[var(--text-main)] block mb-1.5 uppercase tracking-wider">
                  Select Exam Length:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCbleItemCount(100)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      cbleItemCount === 100
                        ? "border-[#00838f] bg-[#00838f]/10 text-[#00838f] font-bold ring-2 ring-[#00838f]/20"
                        : "border-[var(--border-color)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    <span className="block text-xs font-black">100 Questions</span>
                    <span className="block text-[10px] text-[var(--text-subtle)] font-medium">120 Mins (2.0 Hrs)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCbleItemCount(200)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      cbleItemCount === 200
                        ? "border-[#00838f] bg-[#00838f]/10 text-[#00838f] font-bold ring-2 ring-[#00838f]/20"
                        : "border-[var(--border-color)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    <span className="block text-xs font-black">200 Questions</span>
                    <span className="block text-[10px] text-[var(--text-subtle)] font-medium">240 Mins (4.0 Hrs)</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center gap-2 text-[var(--text-main)] font-bold text-xs">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Timed {cbleItemCount === 200 ? "4-Hour Examination (240 Minutes)" : "2-Hour Examination (120 Minutes)"}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-normal">
                  You are about to start a full-length {cbleItemCount}-question computer-based licensure simulation. Please ensure you have an uninterrupted testing block.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
                  <span className="font-bold text-[var(--text-main)] block">{cbleItemCount} Questions</span>
                  <span className="text-[var(--text-muted)]">Official NDLE TOS ratio</span>
                </div>
                <div className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
                  <span className="font-bold text-[var(--text-main)] block">80% Passing GWA</span>
                  <span className="text-[var(--text-muted)]">&ge;50% each subject cut-off</span>
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-subtle)] leading-normal">
                Includes on-screen scientific calculator, full question roadmap, and question bookmarking. Completed exams will automatically update your Board Readiness engine.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setIsConfirmCBLEOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <Link
                href={`/cble?count=${cbleItemCount}`}
                onClick={() => setIsConfirmCBLEOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#00a2d9] hover:bg-[#0284c7] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Begin Examination</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

