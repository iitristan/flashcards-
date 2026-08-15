import { create } from 'zustand';
import { Deck, Flashcard, StudyMode, ReviewRating, ThemeType, UserPreferences, StudySessionState, CardReviewResult, DeckPlaylist } from '@/types';
import { deckService } from '@/lib/services/deckService';
import { soundEffects } from '@/lib/soundEffects';
import { shuffleArray } from '@/lib/services/flashcardService';

const PREFS_STORAGE_KEY = 'nutrianki_prefs_v1';

const DEFAULT_PREFS: UserPreferences = {
  theme: 'matcha',
  timerDuration: 0, // 0 = off, 10, 15, 20, 25, 30
  soundEnabled: true,
  autoFlip: false,
  dailyGoal: 15,
  studyStreak: 1,
  lastStudyDate: null
};

interface NutriStore {
  // State
  decks: Deck[];
  playlists: DeckPlaylist[];
  isLoadingDecks: boolean;
  activeDeckId: string | null;
  activeSession: StudySessionState | null;
  preferences: UserPreferences;

  // Deck Actions
  loadDecks: () => Promise<void>;
  setActiveDeckId: (id: string | null) => void;
  createDeck: (deck: Parameters<typeof deckService.createDeck>[0], cards?: Parameters<typeof deckService.createDeck>[1]) => Promise<Deck>;
  updateDeck: (id: string, updates: Parameters<typeof deckService.updateDeck>[1]) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  resetDecks: () => Promise<void>;
  importMultipleDecks: (decks: Deck[]) => Promise<void>;
  importQuizletFoodServiceDeck: () => Promise<Deck>;

  // Playlist Actions
  loadPlaylists: () => Promise<void>;
  createPlaylist: (playlist: Parameters<typeof deckService.createPlaylist>[0]) => Promise<DeckPlaylist>;
  updatePlaylist: (id: string, updates: Parameters<typeof deckService.updatePlaylist>[1]) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  startPlaylistSession: (playlistId: string, mode: StudyMode, shuffle?: boolean) => Promise<void>;

  // Card Actions
  addCard: (deckId: string, card: Parameters<typeof deckService.addCard>[1]) => Promise<void>;
  updateCard: (deckId: string, cardId: string, updates: Parameters<typeof deckService.updateCard>[2]) => Promise<void>;
  deleteCard: (deckId: string, cardId: string) => Promise<void>;

  // Session Actions
  startStudySession: (deckId: string, mode: StudyMode, filterDueOnly?: boolean) => Promise<void>;
  recordAnswer: (options: {
    rating?: ReviewRating;
    userAnswer?: string;
    isCorrect: boolean;
    verdict?: 'correct' | 'partially_correct' | 'incorrect';
    feedback?: string;
    timeSpentSeconds?: number;
  }) => Promise<void>;
  restartCurrentSession: (missedOnly?: boolean) => void;
  endStudySession: () => void;

  // Preferences Actions
  setTheme: (theme: ThemeType) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  initPreferences: () => void;
}

export const useNutriStore = create<NutriStore>((set, get) => ({
  decks: [],
  playlists: [],
  isLoadingDecks: true,
  activeDeckId: null,
  activeSession: null,
  preferences: DEFAULT_PREFS,

  initPreferences: () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) {
        const parsed: UserPreferences = JSON.parse(stored);
        
        // Calculate streak
        const todayStr = new Date().toISOString().split('T')[0];
        let streak = parsed.studyStreak || 1;
        if (parsed.lastStudyDate) {
          const lastDate = new Date(parsed.lastStudyDate);
          const today = new Date(todayStr);
          const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 1) {
            streak = 1; // streak reset
          }
        }

        const validTheme: ThemeType = (parsed.theme === 'strawberry' || parsed.theme === 'dark') ? parsed.theme : 'matcha';

        const merged: UserPreferences = {
          ...DEFAULT_PREFS,
          ...parsed,
          theme: validTheme,
          studyStreak: streak
        };

        soundEffects.setEnabled(merged.soundEnabled);
        set({ preferences: merged });
      }
    } catch {
      // Use defaults
    }
  },

  setTheme: (theme) => {
    get().updatePreferences({ theme });
  },

  updatePreferences: (updates) => {
    const updated = { ...get().preferences, ...updates };
    soundEffects.setEnabled(updated.soundEnabled);
    set({ preferences: updated });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
        if (updated.theme) {
          document.documentElement.setAttribute('data-theme', updated.theme);
          if (updated.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      } catch (e) {
        console.error('Failed to save preferences to localStorage:', e);
      }
    }
  },

  loadDecks: async () => {
    set({ isLoadingDecks: true });
    try {
      const decks = await deckService.getDecks();
      const playlists = await deckService.getPlaylists();
      set({ decks, playlists, isLoadingDecks: false });
    } catch (err) {
      console.error('Failed to load decks/playlists:', err);
      set({ isLoadingDecks: false });
    }
  },

  loadPlaylists: async () => {
    try {
      const playlists = await deckService.getPlaylists();
      set({ playlists });
    } catch (err) {
      console.error('Failed to load playlists:', err);
    }
  },

  createPlaylist: async (playlistData) => {
    const created = await deckService.createPlaylist(playlistData);
    await get().loadPlaylists();
    return created;
  },

  updatePlaylist: async (id, updates) => {
    await deckService.updatePlaylist(id, updates);
    await get().loadPlaylists();
  },

  deletePlaylist: async (id) => {
    await deckService.deletePlaylist(id);
    await get().loadPlaylists();
  },

  startPlaylistSession: async (playlistId, mode, shuffle = true) => {
    const playlists = await deckService.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) {
      throw new Error('Playlist not found!');
    }

    const allDecks = await deckService.getDecks();
    const includedDecks = allDecks.filter(d => playlist.deckIds.includes(d.id));

    let aggregatedCards: Flashcard[] = [];
    includedDecks.forEach(d => {
      aggregatedCards.push(...(d.cards || []));
    });

    if (aggregatedCards.length === 0) {
      throw new Error('No flashcards found in the selected playlist decks!');
    }

    if (shuffle || mode === 'multiple-choice' || mode === 'identification') {
      aggregatedCards = shuffleArray(aggregatedCards);
    }

    const { preferences } = get();

    set({
      activeDeckId: playlist.id,
      activeSession: {
        deckId: playlist.id,
        deckTitle: `Playlist: ${playlist.title}`,
        mode,
        cardsQueue: aggregatedCards,
        currentIndex: 0,
        results: [],
        startTime: Date.now(),
        isCompleted: false,
        timerDurationSeconds: preferences.timerDuration
      }
    });
  },

  setActiveDeckId: (id) => set({ activeDeckId: id }),

  createDeck: async (deckData, initialCards) => {
    const created = await deckService.createDeck(deckData, initialCards);
    await get().loadDecks();
    return created;
  },

  updateDeck: async (id, updates) => {
    await deckService.updateDeck(id, updates);
    await get().loadDecks();
  },

  deleteDeck: async (id) => {
    await deckService.deleteDeck(id);
    await get().loadDecks();
    if (get().activeDeckId === id) {
      set({ activeDeckId: null });
    }
  },

  resetDecks: async () => {
    await deckService.resetToDefaultDecks();
    await get().loadDecks();
  },

  importMultipleDecks: async (newDecks) => {
    await deckService.importMultipleDecks(newDecks);
    await get().loadDecks();
  },

  importQuizletFoodServiceDeck: async () => {
    const deck = await deckService.importQuizletFoodServiceDeck();
    await get().loadDecks();
    return deck;
  },

  addCard: async (deckId, cardData) => {
    await deckService.addCard(deckId, cardData);
    await get().loadDecks();
  },

  updateCard: async (deckId, cardId, updates) => {
    await deckService.updateCard(deckId, cardId, updates);
    await get().loadDecks();
  },

  deleteCard: async (deckId, cardId) => {
    await deckService.deleteCard(deckId, cardId);
    await get().loadDecks();
  },

  startStudySession: async (deckId, mode, filterDueOnly = false) => {
    const deck = await deckService.getDeckById(deckId);
    if (!deck || deck.cards.length === 0) {
      throw new Error('This deck has no cards to study!');
    }

    let cards = [...deck.cards];
    if (filterDueOnly) {
      const now = new Date();
      const dueCards = cards.filter(c => !c.lastReviewedAt || new Date(c.sm2.dueDate) <= now);
      if (dueCards.length > 0) {
        cards = dueCards;
      }
    }

    // Shuffle cards for multiple choice or identification
    if (mode === 'multiple-choice' || mode === 'identification') {
      cards = shuffleArray(cards);
    }

    const { preferences } = get();

    set({
      activeDeckId: deckId,
      activeSession: {
        deckId,
        deckTitle: deck.title,
        mode,
        cardsQueue: cards,
        currentIndex: 0,
        results: [],
        startTime: Date.now(),
        isCompleted: false,
        timerDurationSeconds: preferences.timerDuration
      }
    });
  },

  recordAnswer: async ({ rating = 'good', userAnswer = '', isCorrect, verdict, feedback, timeSpentSeconds = 0 }) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const currentCard = activeSession.cardsQueue[activeSession.currentIndex];
    if (!currentCard) return;

    // Apply SM-2 update via deckService to the card's parent deck
    const targetDeckId = currentCard.deckId || activeSession.deckId;
    await deckService.recordReview(
      targetDeckId,
      currentCard.id,
      rating,
      userAnswer,
      isCorrect
    );

    const newResult: CardReviewResult = {
      cardId: currentCard.id,
      userAnswer,
      isCorrect,
      rating,
      timeSpentSeconds,
      verdict,
      feedback
    };

    const nextIndex = activeSession.currentIndex + 1;
    const isCompleted = nextIndex >= activeSession.cardsQueue.length;

    // Update session state
    set({
      activeSession: {
        ...activeSession,
        currentIndex: nextIndex,
        results: [...activeSession.results, newResult],
        isCompleted
      }
    });

    // If completed, trigger victory sound & update streak/daily stats
    if (isCompleted) {
      soundEffects.playVictory();
      
      const { preferences } = get();
      const todayStr = new Date().toISOString().split('T')[0];
      const isNewDay = preferences.lastStudyDate !== todayStr;
      const updatedStreak = isNewDay ? (preferences.studyStreak || 0) + 1 : preferences.studyStreak;

      const newPrefs: UserPreferences = {
        ...preferences,
        studyStreak: updatedStreak,
        lastStudyDate: todayStr
      };

      set({ preferences: newPrefs });
      if (typeof window !== 'undefined') {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(newPrefs));
      }

      await get().loadDecks();
    }
  },

  restartCurrentSession: (missedOnly = false) => {
    const { activeSession, decks, playlists } = get();
    if (!activeSession) return;

    let sourceCards: Flashcard[] = [];
    if (activeSession.deckId.startsWith('playlist-')) {
      const playlist = playlists.find(p => p.id === activeSession.deckId);
      const includedDecks = decks.filter(d => playlist?.deckIds.includes(d.id));
      includedDecks.forEach(d => sourceCards.push(...(d.cards || [])));
    } else {
      const deck = decks.find(d => d.id === activeSession.deckId);
      sourceCards = deck ? [...deck.cards] : [];
    }

    if (sourceCards.length === 0) return;

    let newQueue = [...sourceCards];
    if (missedOnly) {
      const missedCardIds = activeSession.results
        .filter(r => !r.isCorrect || r.rating === 'again' || r.rating === 'hard')
        .map(r => r.cardId);
      newQueue = sourceCards.filter(c => missedCardIds.includes(c.id));
      if (newQueue.length === 0) {
        newQueue = [...sourceCards];
      }
    }

    set({
      activeSession: {
        ...activeSession,
        cardsQueue: shuffleArray(newQueue),
        currentIndex: 0,
        results: [],
        startTime: Date.now(),
        isCompleted: false
      }
    });
  },

  endStudySession: () => {
    set({ activeSession: null });
    get().loadDecks();
  }
}));
