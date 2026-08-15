'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Plus, 
  Settings, 
  UploadCloud, 
  Search, 
  Layers, 
  Filter,
  ListMusic
} from 'lucide-react';
import { useNutriStore } from '@/lib/store/useNutriStore';
import { Deck, StudyMode, DeckPlaylist } from '@/types';
import { MascotBuddy } from '@/components/study/MascotBuddy';
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
import { StudySessionSummary } from '@/components/study/StudySessionSummary';
import { toast } from 'sonner';

export default function NutriAnkiApp() {
  const {
    decks,
    playlists,
    isLoadingDecks,
    activeSession,
    preferences,
    loadDecks,
    initPreferences,
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
  const [activeTab, setActiveTab] = useState<'decks' | 'playlists'>('decks');
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

  // Initialize on mount
  useEffect(() => {
    initPreferences();
    loadDecks();
  }, [initPreferences, loadDecks]);

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
      <main className="min-h-screen bg-[var(--bg-main)] px-4 py-8 sm:py-12 flex flex-col justify-between">
        <div className="w-full max-w-4xl mx-auto">
          {/* Header */}
          <StudyHeader
            deckTitle={activeSession.deckTitle}
            mode={activeSession.mode}
            currentIndex={activeSession.currentIndex}
            totalCards={activeSession.cardsQueue.length}
            timerDuration={activeSession.timerDurationSeconds}
            soundEnabled={preferences.soundEnabled}
            onToggleSound={() =>
              updatePreferences({ soundEnabled: !preferences.soundEnabled })
            }
            onExit={endStudySession}
            onTimerExpire={handleTimerExpire}
            isPaused={activeSession.isCompleted}
          />

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

        {/* Footer Mascot Prompt */}
        <div className="w-full max-w-md mx-auto mt-8">
          <MascotBuddy compact />
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
      <header className="sticky top-0 z-30 bg-[var(--bg-surface)]/85 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-100 to-green-200 border-2 border-emerald-300 flex items-center justify-center text-2xl shadow-inner select-none">
              🥑
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight text-[var(--text-main)]">
                Nutri<span className="text-[var(--primary)]">Anki</span>
              </h1>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] hidden sm:block">
                Nutrition & Dietetics Flashcard Hub
              </p>
            </div>
          </div>

          {/* Right Action Icons & Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Import / Export Tool */}
            <button
              onClick={() => setIsImportExportOpen(true)}
              aria-label="Open import or export flashcard tool"
              className="p-2 sm:px-3.5 sm:py-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)] text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
              title="Import / Export Cards"
            >
              <UploadCloud className="w-4 h-4 text-[var(--primary)]" />
              <span className="hidden sm:inline">Import/Export</span>
            </button>

            {/* Settings Modal */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open preferences and themes settings"
              className="p-2 sm:px-3 sm:py-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)] text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
              title="Settings & Themes"
            >
              <Settings className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="hidden md:inline">Settings</span>
            </button>

            {/* Create Playlist Button */}
            <button
              onClick={() => {
                setEditingPlaylist(null);
                setIsPlaylistModalOpen(true);
              }}
              aria-label="Create multi-deck study playlist"
              className="px-3.5 py-2 rounded-2xl border-2 border-[var(--primary)]/30 bg-[var(--primary-light)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white text-xs font-extrabold shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
              title="Create Study Playlist"
            >
              <ListMusic className="w-4 h-4" />
              <span className="hidden sm:inline">New Playlist</span>
            </button>

            {/* Create Deck Button */}
            <button
              onClick={() => {
                setEditingDeck(null);
                setIsCreatingDeck(true);
              }}
              aria-label="Create new reviewer flashcard deck"
              className="px-4 py-2 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Deck</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-8">
        {/* HERO SECTION: Mascot & Quick Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          {/* Mascot Motivational Card */}
          <div className="md:col-span-2">
            <MascotBuddy />
          </div>

          {/* Quick Metrics Tile */}
          <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-[var(--card-shadow)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-subtle)] uppercase tracking-wider mb-2">
              <span>Review Overview</span>
              <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center py-1">
              <div>
                <span className="text-xl font-black text-[var(--text-main)] block">
                  {totalCardsCount}
                </span>
                <span className="text-[10px] font-bold text-[var(--text-muted)]">
                  Total Cards
                </span>
              </div>
              <div className="border-x border-[var(--border-subtle)]">
                <span className="text-xl font-black text-amber-500 block">
                  {totalDueToday}
                </span>
                <span className="text-[10px] font-bold text-[var(--text-muted)]">
                  Due Today
                </span>
              </div>
              <div>
                <span className="text-xl font-black text-emerald-500 block">
                  {totalMastered}
                </span>
                <span className="text-[10px] font-bold text-[var(--text-muted)]">
                  Mastered
                </span>
              </div>
            </div>

            <div className="pt-3 mt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
              <span>Daily Target</span>
              <span className="text-[var(--primary)]">
                {Math.min(totalMastered, preferences.dailyGoal)} / {preferences.dailyGoal} cards
              </span>
            </div>
          </div>
        </div>

        {/* VIEW TABS (Decks vs Playlists) & SEARCH BAR */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs">
              <button
                onClick={() => setActiveTab('decks')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
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
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  activeTab === 'playlists'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)]'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>Playlists ({(playlists || []).length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[var(--text-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search flashcards, decks, or playlists"
                placeholder={activeTab === 'decks' ? "Search cards, formulas, diets, tags..." : "Search playlists..."}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] focus:border-[var(--primary)] outline-none text-xs font-semibold text-[var(--text-main)] placeholder:text-[var(--text-subtle)] shadow-xs transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search input"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-subtle)] hover:text-[var(--text-main)]"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills (when Decks tab is active) */}
          {activeTab === 'decks' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-xs font-bold text-[var(--text-subtle)] flex items-center gap-1 pl-1 flex-shrink-0">
                <Filter className="w-3 h-3" />
              </span>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                      isSelected
                        ? 'bg-[var(--primary)] text-white shadow-xs scale-105'
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
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-2xl animate-spin">
                  🥑
                </div>
                <p className="text-xs font-bold text-[var(--text-muted)]">
                  Loading your reviewer decks...
                </p>
              </div>
            ) : filteredDecks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="p-12 text-center rounded-3xl bg-[var(--bg-surface)] border-2 border-dashed border-[var(--border-color)] space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--bg-surface-subtle)] flex items-center justify-center text-3xl">
                  🥗
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--text-main)]">
                    No flashcard decks found
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                    {searchQuery
                      ? `No decks matched "${searchQuery}". Try a different keyword or reset filters.`
                      : 'Get started by creating your first deck or restoring preloaded sample decks!'}
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }}
                      className="px-4 py-2 rounded-2xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)]"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingDeck(null);
                      setIsCreatingDeck(true);
                    }}
                    className="px-4 py-2 rounded-2xl bg-[var(--primary)] text-white text-xs font-bold shadow-xs hover:bg-[var(--primary-hover)]"
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
              <div className="p-12 text-center rounded-3xl bg-[var(--bg-surface)] border-2 border-dashed border-[var(--border-color)] space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-3xl">
                  🎧
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-[var(--text-main)]">
                    Create Your First Multi-Deck Playlist
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                    Combine cards from multiple subjects into customized study mixes (e.g. &ldquo;Board Exam Marathon&rdquo;, &ldquo;Clinical + Biochem Mix&rdquo;) and study them seamlessly in any mode!
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setEditingPlaylist(null);
                      setIsPlaylistModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 mx-auto active:scale-95"
                  >
                    <ListMusic className="w-4 h-4" />
                    <span>Create Deck Playlist</span>
                  </button>
                </div>
              </div>
            ) : filteredPlaylists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </main>
  );
}
