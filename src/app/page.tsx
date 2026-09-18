'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Settings, 
  UploadCloud, 
  Search, 
  Layers, 
  Filter, 
  ListMusic, 
  TrendingUp, 
  BookOpen,
  ArrowRight,
  Play
} from 'lucide-react';

import { useNutriStore } from '@/lib/store/useNutriStore';
import { Deck, StudyMode, DeckPlaylist } from '@/types';
import { DeckCard } from '@/components/deck/DeckCard';
import { DeckManager } from '@/components/deck/DeckManager';
import { ImportExportModal } from '@/components/deck/ImportExportModal';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { PlaylistModal } from '@/components/deck/PlaylistModal';
import { PlaylistCard } from '@/components/deck/PlaylistCard';
import { StudyHeader } from '@/components/study/StudyHeader';
import { SpacedRepetitionCard } from '@/components/study/SpacedRepetitionCard';
import { MultipleChoiceView } from '@/components/study/MultipleChoiceView';
import { IdentificationView } from '@/components/study/IdentificationView';
import { BlitzMarathonView } from '@/components/study/BlitzMarathonView';
import { LearningAnalytics } from '@/components/study/LearningAnalytics';
import { StudySessionSummary } from '@/components/study/StudySessionSummary';
import { MusicPlayerWidget } from '@/components/music/MusicPlayerWidget';
import { AuthModal } from '@/components/auth/AuthModal';
import { toast } from 'sonner';



export default function NutriAnkiApp() {
  const {
    decks,
    playlists,
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
    uploadLocalDecksToCloud,
    loadDecks,
    startStudySession,
    startPlaylistSession,
    recordAnswer,
    restartCurrentSession,
    endStudySession,
    createDeck,
    updateDeck,
    deleteDeck,
    resetDecks,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addCard,
    updateCard,
    deleteCard,
    updatePreferences
  } = useNutriStore();

  // Local UI states
  const [activeTab, setActiveTab] = useState<'decks' | 'playlists' | 'analytics'>('decks');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<DeckPlaylist | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [selectedExportDeckId, setSelectedExportDeckId] = useState<string | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTimerExpired, setIsTimerExpired] = useState(false);

  // Initialize on mount and maintain background auto-sync interval
  useEffect(() => {
    const store = useNutriStore.getState();
    store.initPreferences();
    store.loadDecks();
    store.initAuth();

    // Auto-sync every 30 seconds in background silently
    const autoSyncInterval = setInterval(() => {
      useNutriStore.getState().syncWithCloud();
    }, 30000);

    return () => clearInterval(autoSyncInterval);
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

  // Filtered decks calculation
  const filteredDecks = useMemo(() => {
    return decks.filter((deck) => {
      const matchesSearch =
        deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deck.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deck.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' || deck.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [decks, searchQuery, selectedCategory]);

  // Filtered playlists calculation
  const filteredPlaylists = useMemo(() => {
    return (playlists || []).filter((p) => {
      return (
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [playlists, searchQuery]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    decks.forEach((d) => set.add(d.category));
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

  const handleStartPlaylistStudy = (playlistId: string, mode: StudyMode) => {
    try {
      setIsTimerExpired(false);
      startPlaylistSession(playlistId, mode);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Could not start playlist study session';
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
    const currentCard = activeSession.cardsQueue[activeSession.currentIndex];

    return (
      <main className="min-h-screen bg-[var(--bg-main)] px-4 py-6 sm:py-10 flex flex-col justify-between">
        <div className="w-full max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <StudyHeader
            deckTitle={activeSession.deckTitle}
            mode={activeSession.mode}
            currentIndex={activeSession.currentIndex}
            totalCards={activeSession.cardsQueue.length}
            timerDuration={activeSession.timerDurationSeconds}
            soundEnabled={preferences.soundEnabled}
            saveStatus={saveStatus}
            onToggleSound={() =>
              updatePreferences({ soundEnabled: !preferences.soundEnabled })
            }
            onExit={endStudySession}
            onTimerExpire={handleTimerExpire}
            isPaused={activeSession.isCompleted}
          />

          {/* Persistent Music Bar during Study Session */}
          <MusicPlayerWidget variant="study-bar" />


          {/* Body: Summary or Card View */}
          <AnimatePresence mode="wait">
            {activeSession.isCompleted ? (
              <StudySessionSummary
                key="summary"
                deckTitle={activeSession.deckTitle}
                results={activeSession.results}
                startTime={activeSession.startTime}
                streak={preferences.studyStreak}
                onRestart={(missedOnly) => restartCurrentSession(missedOnly)}
                onReturnHome={endStudySession}
              />
            ) : currentCard ? (
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
            ) : null}
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
              NutriAnki
            </h1>
            <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1 hidden xs:block">
              Board Examination & Dietetics Reviewer
            </p>
          </div>

          {/* Right Action Icons & Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Live Auto-Sync Status Indicator */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] text-xs font-medium text-[var(--text-muted)] select-none"
              title="Continuous couple background sync is active"
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
            </div>

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

            {/* Create Playlist Button */}
            <button
              onClick={() => {
                setEditingPlaylist(null);
                setIsPlaylistModalOpen(true);
              }}
              aria-label="Create multi-deck study playlist"
              className="px-2.5 py-1.5 sm:px-3 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 hover:bg-teal-100 text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Create Study Playlist"
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Playlist</span>
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

        {/* HERO SECTION: Review Metrics & Focus Audio (Balanced & Bento-Free) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
          {/* Review Overview Bar (Takes 2 cols on lg) */}
          <div className="lg:col-span-2 p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col justify-between">
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

          {/* Focus Study Audio (Takes 1 col on lg) */}
          <div className="lg:col-span-1">
            <MusicPlayerWidget variant="compact" />
          </div>
        </div>

        {/* VIEW TABS (Decks vs Playlists) & SEARCH BAR */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('decks')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'decks'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Decks ({decks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('playlists')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'playlists'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)]'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>Playlists ({(playlists || []).length})</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'analytics'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)]'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Analytics & Graphs</span>
              </button>
            </div>

            {/* Search Input (when not in analytics) */}
            {activeTab !== 'analytics' && (
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search flashcards, decks, or playlists"
                  placeholder={activeTab === 'decks' ? "Search cards, formulas, diets, tags..." : "Search playlists..."}
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] focus:border-[var(--primary)] outline-none text-xs font-medium text-[var(--text-main)] placeholder:text-[var(--text-subtle)] shadow-xs transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search input"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-subtle)] hover:text-[var(--text-main)]"
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
                    className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
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
        )}

        {/* TAB CONTENT: PLAYLISTS TAB */}
        {activeTab === 'playlists' && (
          <div>
            {(playlists || []).length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[var(--bg-surface)] border border-dashed border-[var(--border-color)] space-y-3.5">
                <div className="w-12 h-12 mx-auto rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <ListMusic className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[var(--text-main)]">
                    Create a Multi-Deck Playlist
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                    Combine cards from multiple clinical domains into targeted study sessions (e.g. &ldquo;Board Exam Comprehensive Marathon&rdquo;, &ldquo;Renal + Biochemical Assessment&rdquo;).
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setEditingPlaylist(null);
                      setIsPlaylistModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-2 mx-auto cursor-pointer active:scale-95"
                  >
                    <ListMusic className="w-4 h-4" />
                    <span>Create Deck Playlist</span>
                  </button>
                </div>
              </div>
            ) : filteredPlaylists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPlaylists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    allDecks={decks}
                    onStartStudy={handleStartPlaylistStudy}
                    onEdit={(pl) => {
                      setEditingPlaylist(pl);
                      setIsPlaylistModalOpen(true);
                    }}
                    onDelete={async (id) => {
                      await deletePlaylist(id);
                      toast.success('Playlist deleted');
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-10 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-muted)] font-semibold">
                  No playlists matched &ldquo;{searchQuery}&rdquo;.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div>
            <LearningAnalytics />
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

      {/* 2. Playlist Manager (Create / Edit Multi-Deck Playlist) */}
      {isPlaylistModalOpen && (
        <PlaylistModal
          initialPlaylist={editingPlaylist}
          decks={decks}
          onSave={createPlaylist}
          onUpdate={updatePlaylist}
          onClose={() => {
            setIsPlaylistModalOpen(false);
            setEditingPlaylist(null);
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
          onUploadLocalToCloud={uploadLocalDecksToCloud}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </main>
  );
}

