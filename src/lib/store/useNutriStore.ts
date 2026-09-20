import { create } from 'zustand';
import { Deck, Flashcard, StudyMode, ReviewRating, ThemeType, UserPreferences, StudySessionState, CardReviewResult, DeckPlaylist, UserMusicSettings } from '@/types';
import { deckService } from '@/lib/services/deckService';
import { soundEffects } from '@/lib/soundEffects';
import { shuffleArray } from '@/lib/services/flashcardService';
import { syncService } from '@/lib/services/syncService';
import { getSupabaseClient } from '@/lib/supabase/client';

const PREFS_STORAGE_KEY = 'nutrianki_prefs_v1';
const MUSIC_STORAGE_KEY = 'nutrianki_music_v1';
const ACTIVE_SESSION_STORAGE_KEY = 'nutrianki_active_session_v1';

const DEFAULT_PREFS: UserPreferences = {
  theme: 'matcha',
  timerDuration: 0, // 0 = off, 10, 15, 20, 25, 30
  soundEnabled: true,
  autoFlip: false,
  dailyGoal: 15,
  studyStreak: 1,
  lastStudyDate: null
};

const DEFAULT_MUSIC_SETTINGS: UserMusicSettings = {
  isPlaying: false,
  customUrl: ''
};


interface NutriStore {
  // State
  decks: Deck[];
  playlists: DeckPlaylist[];
  isLoadingDecks: boolean;
  activeDeckId: string | null;
  activeSession: StudySessionState | null;
  preferences: UserPreferences;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'syncing';
  resumeAvailableSession: StudySessionState | null;

  // Cloud Sync & Auth State
  user: { id: string; email?: string } | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncedAt: string | null;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  initAuth: () => Promise<void>;
  syncWithCloud: () => Promise<void>;
  uploadLocalDecksToCloud: () => Promise<void>;
  applyThisDeviceToCloudAndAllDevices: () => Promise<{ success: boolean; decksUploaded: number; totalCards: number }>;
  resetLocalAndPullFromCloud: () => Promise<void>;

  // Session & Progress Actions
  setResumeAvailableSession: (session: StudySessionState | null) => void;
  resumeSession: () => void;
  dismissResumeSession: () => void;

  // Music State
  musicSettings: UserMusicSettings;
  isMusicDrawerOpen: boolean;
  setMusicSettings: (updates: Partial<UserMusicSettings>) => void;
  setIsMusicDrawerOpen: (open: boolean) => void;

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
  saveCardNote: (deckId: string, cardId: string, note: string) => Promise<void>;

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

  // Analytics Actions
  analytics: import('@/types').LearningAnalyticsData | null;
  loadAnalytics: () => Promise<void>;

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
  saveStatus: 'idle',
  resumeAvailableSession: null,
  musicSettings: DEFAULT_MUSIC_SETTINGS,
  isMusicDrawerOpen: false,

  // Cloud Sync State
  user: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
  isAuthModalOpen: false,
  setIsAuthModalOpen: (open) => set({ isAuthModalOpen: open }),

  setResumeAvailableSession: (session) => set({ resumeAvailableSession: session }),

  resumeSession: () => {
    const session = get().resumeAvailableSession;
    if (session) {
      set({
        activeSession: session,
        activeDeckId: session.deckId,
        resumeAvailableSession: null
      });
    }
  },

  dismissResumeSession: () => {
    const session = get().resumeAvailableSession;
    set({ resumeAvailableSession: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    }
    if (get().user && session?.id) {
      syncService.completeStudySession(session.id).catch(console.error);
    }
  },

  initAuth: async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      set({ syncStatus: 'offline' });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({
          user: { id: session.user.id, email: session.user.email },
        });
        await get().syncWithCloud();
      } else {
        // Automatically connect to shared couple sync workspace (zero-login)
        const SHARED_EMAIL = 'couple@nutrianki.shared';
        const SHARED_PASS = 'NutriAnkiCoupleSync2026!';
        try {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: SHARED_EMAIL,
            password: SHARED_PASS,
          });

          if (signInData?.user) {
            set({
              user: { id: signInData.user.id, email: signInData.user.email },
            });
            await get().syncWithCloud();
          } else if (signInErr) {
            const { data: signUpData } = await supabase.auth.signUp({
              email: SHARED_EMAIL,
              password: SHARED_PASS,
            });
            if (signUpData?.user) {
              set({
                user: { id: signUpData.user.id, email: signUpData.user.email },
              });
              await get().syncWithCloud();
            }
          }
        } catch {
          set({ syncStatus: 'idle' });
        }
      }

      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (newSession?.user) {
          set({
            user: { id: newSession.user.id, email: newSession.user.email },
          });
          if (event === 'SIGNED_IN') {
            await get().syncWithCloud();
          }
        }
      });

      // Realtime cross-device sync: listen for changes made on other devices
      let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
      const triggerRealtimeSync = () => {
        if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => {
          get().syncWithCloud();
        }, 1000);
      };

      try {
        supabase
          .channel('nutrianki_live_sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'decks' }, triggerRealtimeSync)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'flashcards' }, triggerRealtimeSync)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, triggerRealtimeSync)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'user_preferences' }, triggerRealtimeSync)
          .subscribe();
      } catch (realtimeErr) {
        console.warn('Realtime subscription skipped:', realtimeErr);
      }
    } catch (err) {
      console.error('Failed to init auth listener:', err);
    }
  },

  syncWithCloud: async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const currentUser = await syncService.getCurrentUser();
    if (!currentUser) {
      set({ user: null, syncStatus: 'idle' });
      return;
    }

    set({ syncStatus: 'syncing' });
    try {
      const cloudData = await syncService.pullFromCloud();
      if (cloudData && cloudData.decks && cloudData.decks.length > 0) {
        // Cloud is the single authoritative source of truth.
        // Directly overwrite local storage with synced cloud decks & playlists.
        // This removes any stale, zombie, or sample decks that only existed locally.
        await deckService.setAllDecks(cloudData.decks);
        await deckService.setAllPlaylists(cloudData.playlists || []);

        // Sync preferences
        const cloudPrefs = await syncService.pullPreferences();
        if (cloudPrefs) {
          const mergedPrefs: UserPreferences = {
            ...get().preferences,
            ...cloudPrefs,
          };
          set({ preferences: mergedPrefs });
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(mergedPrefs));
            } catch {}
          }
        } else if (get().preferences) {
          await syncService.pushPreferences(get().preferences);
        }

        // Check for cloud active session checkpoint
        try {
          const remoteSession = await syncService.fetchActiveSession();
          if (remoteSession && !remoteSession.isCompleted && (remoteSession.currentIndex > 0 || remoteSession.results.length > 0)) {
            set({ resumeAvailableSession: remoteSession });
          }
        } catch (e) {
          console.warn('Failed to fetch remote active session:', e);
        }

        // Sync historical study logs for cross-device analytics
        try {
          const remoteLogs = await syncService.pullStudyLogs();
          if (remoteLogs && remoteLogs.length > 0) {
            const localLogs = await deckService.getReviewLogs();
            const logMap = new Map();
            for (const l of localLogs) logMap.set(l.timestamp || l.createdAt || l.cardId, l);
            for (const r of remoteLogs) {
              const key = r.createdAt || r.cardId;
              if (!logMap.has(key)) {
                logMap.set(key, {
                  cardId: r.cardId,
                  deckId: r.deckId,
                  mode: r.mode,
                  rating: r.rating,
                  userAnswer: r.userAnswer,
                  isCorrect: r.isCorrect,
                  timeSpentSeconds: r.timeSpentSeconds,
                  timestamp: r.createdAt
                });
              }
            }
            await deckService.saveReviewLogs(Array.from(logMap.values()));
            await get().loadAnalytics();
          }
        } catch (e) {
          console.warn('Failed to sync study logs:', e);
        }

        await get().loadDecks();
        set({
          syncStatus: 'synced',
          lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        // Cloud is currently empty. If this device has local decks, upload them as the initial seed!
        const localDecks = await deckService.getDecks();
        const localPlaylists = await deckService.getPlaylists();
        if (localDecks.length > 0) {
          await syncService.migrateLocalToCloud(localDecks, localPlaylists);
        }
        if (get().preferences) {
          await syncService.pushPreferences(get().preferences);
        }
        set({
          syncStatus: 'synced',
          lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch (err) {
      console.error('Failed to sync with cloud:', err);
      set({ syncStatus: 'error' });
    }
  },

  uploadLocalDecksToCloud: async () => {
    set({ syncStatus: 'syncing' });
    try {
      const localDecks = await deckService.getDecks();
      const localPlaylists = await deckService.getPlaylists();
      const res = await syncService.migrateLocalToCloud(localDecks, localPlaylists);
      if (res.success) {
        set({
          syncStatus: 'synced',
          lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        set({ syncStatus: 'error' });
      }
    } catch (err) {
      console.error('Failed to upload local decks to cloud:', err);
      set({ syncStatus: 'error' });
    }
  },

  applyThisDeviceToCloudAndAllDevices: async () => {
    set({ syncStatus: 'syncing' });
    try {
      const localDecks = await deckService.getDecks();
      const localPlaylists = await deckService.getPlaylists();
      const localLogs = await deckService.getReviewLogs();
      const prefs = get().preferences;
      const res = await syncService.overwriteCloudWithLocalData(localDecks, localPlaylists, prefs, localLogs);
      if (res.success) {
        set({
          syncStatus: 'synced',
          lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        await get().loadDecks();
        return res;
      } else {
        set({ syncStatus: 'error' });
        return { success: false, decksUploaded: 0, totalCards: 0 };
      }
    } catch (err) {
      console.error('Failed to apply this device to cloud:', err);
      set({ syncStatus: 'error' });
      return { success: false, decksUploaded: 0, totalCards: 0 };
    }
  },

  resetLocalAndPullFromCloud: async () => {
    set({ syncStatus: 'syncing' });
    try {
      await deckService.clearLocalData();
      const cloudData = await syncService.pullFromCloud();
      if (cloudData && cloudData.decks) {
        await deckService.setAllDecks(cloudData.decks);
        await deckService.setAllPlaylists(cloudData.playlists || []);
      }
      await get().loadDecks();
      await get().loadAnalytics();
      set({
        syncStatus: 'synced',
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (err) {
      console.error('Failed to reset local and pull from cloud:', err);
      set({ syncStatus: 'error' });
    }
  },

  setMusicSettings: (updates) => {
    const updated = { ...get().musicSettings, ...updates };
    set({ musicSettings: updated });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save music settings to localStorage:', e);
      }
    }
  },

  setIsMusicDrawerOpen: (open) => set({ isMusicDrawerOpen: open }),

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

        const validTheme: ThemeType = (parsed.theme === 'navy' || parsed.theme === 'dark') ? parsed.theme : 'matcha';

        const merged: UserPreferences = {
          ...DEFAULT_PREFS,
          ...parsed,
          theme: validTheme,
          studyStreak: streak
        };

        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', validTheme);
        }

        soundEffects.setEnabled(merged.soundEnabled);
        set({ preferences: merged });
      } else {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', 'matcha');
        }
      }

      // Check for in-progress session checkpoint
      const storedSession = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
      if (storedSession) {
        try {
          const parsedSession: StudySessionState = JSON.parse(storedSession);
          if (parsedSession && !parsedSession.isCompleted && (parsedSession.currentIndex > 0 || parsedSession.results.length > 0)) {
            set({ resumeAvailableSession: parsedSession });
          }
        } catch {}
      }

      // Load music preferences
      const storedMusic = localStorage.getItem(MUSIC_STORAGE_KEY);
      if (storedMusic) {
        const parsedMusic: UserMusicSettings = JSON.parse(storedMusic);
        set({
          musicSettings: {
            ...DEFAULT_MUSIC_SETTINGS,
            ...parsedMusic,
            isPlaying: false // Don't autoplay immediately on fresh load
          }
        });
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
    if (get().user) {
      syncService.pushPreferences(updated).catch((err) => console.error('Cloud sync preferences error:', err));
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
    if (get().user) {
      syncService.pushPlaylistsToCloud(get().playlists).catch(console.error);
    }
    return created;
  },

  updatePlaylist: async (id, updates) => {
    await deckService.updatePlaylist(id, updates);
    await get().loadPlaylists();
    if (get().user) {
      syncService.pushPlaylistsToCloud(get().playlists).catch(console.error);
    }
  },

  deletePlaylist: async (id) => {
    await deckService.deletePlaylist(id);
    await get().loadPlaylists();
    if (get().user) {
      syncService.deletePlaylistFromCloud(id).catch(console.error);
    }
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

    if (shuffle || mode === 'multiple-choice' || mode === 'identification' || mode === 'blitz-marathon') {
      aggregatedCards = shuffleArray(aggregatedCards);
    }

    const { preferences } = get();
    const timerDuration = mode === 'blitz-marathon' ? 15 : preferences.timerDuration;
    const sessionId = `sess-${playlist.id}-${Date.now()}`;

    const newSession: StudySessionState = {
      id: sessionId,
      deckId: playlist.id,
      deckTitle: `Playlist: ${playlist.title}`,
      mode,
      cardsQueue: aggregatedCards,
      currentIndex: 0,
      results: [],
      startTime: Date.now(),
      isCompleted: false,
      timerDurationSeconds: timerDuration,
      updatedAt: new Date().toISOString()
    };

    set({
      activeDeckId: playlist.id,
      activeSession: newSession,
      resumeAvailableSession: null,
      saveStatus: 'idle'
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(newSession));
      } catch {}
    }

    if (get().user) {
      syncService.saveSessionCheckpoint(newSession).catch((err) =>
        console.warn('Failed to save initial playlist session checkpoint:', err)
      );
    }
  },

  setActiveDeckId: (id) => set({ activeDeckId: id }),

  createDeck: async (deckData, initialCards) => {
    const created = await deckService.createDeck(deckData, initialCards);
    await get().loadDecks();
    if (get().user) {
      syncService.pushDeckToCloud(created).catch((err) => console.error('Sync createDeck error:', err));
    }
    return created;
  },

  updateDeck: async (id, updates) => {
    await deckService.updateDeck(id, updates);
    await get().loadDecks();
    if (get().user) {
      const updated = get().decks.find((d) => d.id === id);
      if (updated) {
        syncService.pushDeckToCloud(updated).catch((err) => console.error('Sync updateDeck error:', err));
      }
    }
  },

  deleteDeck: async (id) => {
    await deckService.deleteDeck(id);
    await get().loadDecks();
    if (get().activeDeckId === id) {
      set({ activeDeckId: null });
    }
    if (get().user) {
      syncService.deleteDeckFromCloud(id).catch((err) => console.error('Sync deleteDeck error:', err));
    }
  },

  resetDecks: async () => {
    await deckService.resetToDefaultDecks();
    await get().loadDecks();
    if (get().user) {
      const decks = get().decks;
      const playlists = get().playlists;
      syncService.migrateLocalToCloud(decks, playlists).catch((err) => console.error('Sync reset error:', err));
    }
  },

  importMultipleDecks: async (newDecks) => {
    await deckService.importMultipleDecks(newDecks);
    await get().loadDecks();
    if (get().user) {
      for (const d of newDecks) {
        syncService.pushDeckToCloud(d).catch(console.error);
      }
    }
  },

  importQuizletFoodServiceDeck: async () => {
    const deck = await deckService.importQuizletFoodServiceDeck();
    await get().loadDecks();
    if (get().user) {
      syncService.pushDeckToCloud(deck).catch(console.error);
    }
    return deck;
  },

  addCard: async (deckId, cardData) => {
    await deckService.addCard(deckId, cardData);
    await get().loadDecks();
    if (get().user) {
      const d = get().decks.find((deck) => deck.id === deckId);
      if (d) syncService.pushDeckToCloud(d).catch(console.error);
    }
  },

  updateCard: async (deckId, cardId, updates) => {
    await deckService.updateCard(deckId, cardId, updates);
    await get().loadDecks();
    if (get().user) {
      const d = get().decks.find((deck) => deck.id === deckId);
      if (d) syncService.pushDeckToCloud(d).catch(console.error);
    }
  },

  deleteCard: async (deckId, cardId) => {
    await deckService.deleteCard(deckId, cardId);
    await get().loadDecks();
    if (get().user) {
      const d = get().decks.find((deck) => deck.id === deckId);
      if (d) syncService.pushDeckToCloud(d).catch(console.error);
    }
  },

  saveCardNote: async (deckId, cardId, note) => {
    const updatedCard = await deckService.saveCardNote(deckId, cardId, note);
    await get().loadDecks();
    if (get().user) {
      syncService.syncCardReview(deckId, updatedCard).catch((err) => console.error('Cloud sync note error:', err));
    }
    // Also update current card in active session if active
    const { activeSession } = get();
    if (activeSession) {
      const updatedQueue = activeSession.cardsQueue.map(c => 
        c.id === cardId ? { ...c, userNotes: note } : c
      );
      set({
        activeSession: {
          ...activeSession,
          cardsQueue: updatedQueue
        }
      });
    }
  },

  analytics: null,

  loadAnalytics: async () => {
    try {
      const data = await deckService.getAnalyticsData(get().preferences.dailyGoal);
      set({ analytics: data });
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
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

    // Shuffle cards for multiple choice, identification, or blitz-marathon
    if (mode === 'multiple-choice' || mode === 'identification' || mode === 'blitz-marathon') {
      cards = shuffleArray(cards);
    }

    const { preferences } = get();
    const timerDuration = mode === 'blitz-marathon' ? 15 : preferences.timerDuration;
    const sessionId = `sess-${deckId}-${Date.now()}`;

    const newSession: StudySessionState = {
      id: sessionId,
      deckId,
      deckTitle: deck.title,
      mode,
      cardsQueue: cards,
      currentIndex: 0,
      results: [],
      startTime: Date.now(),
      isCompleted: false,
      timerDurationSeconds: timerDuration,
      updatedAt: new Date().toISOString()
    };

    set({
      activeDeckId: deckId,
      activeSession: newSession,
      resumeAvailableSession: null,
      saveStatus: 'idle'
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(newSession));
      } catch {}
    }

    if (get().user) {
      syncService.saveSessionCheckpoint(newSession).catch((err) =>
        console.warn('Failed to save initial study session checkpoint:', err)
      );
    }
  },

  recordAnswer: async ({ rating = 'good', userAnswer = '', isCorrect, verdict, feedback, timeSpentSeconds = 5 }) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const currentCard = activeSession.cardsQueue[activeSession.currentIndex];
    if (!currentCard) return;

    // Apply SM-2 update via deckService to the card's parent deck
    const targetDeckId = currentCard.deckId || activeSession.deckId;
    const updatedCard = await deckService.recordReview(
      targetDeckId,
      currentCard.id,
      rating,
      userAnswer,
      isCorrect,
      timeSpentSeconds,
      activeSession.mode
    );

    if (get().user) {
      syncService.syncCardReview(targetDeckId, updatedCard).catch((err) =>
        console.error('Cloud sync error on recordReview:', err)
      );
    }

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

    const updatedSession: StudySessionState = {
      ...activeSession,
      currentIndex: nextIndex,
      results: [...activeSession.results, newResult],
      isCompleted,
      updatedAt: new Date().toISOString()
    };

    // Update local session state & set saving status
    set({
      activeSession: updatedSession,
      saveStatus: 'saving'
    });

    // Checkpoint to localStorage immediately
    if (typeof window !== 'undefined') {
      try {
        if (isCompleted) {
          localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        } else {
          localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
        }
      } catch {}
    }

    // Persist to Supabase if authenticated
    if (get().user) {
      // 1. Save in-progress checkpoint
      syncService.saveSessionCheckpoint(updatedSession).then(() => {
        set({ saveStatus: 'saved' });
        setTimeout(() => {
          if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
        }, 1500);
      }).catch(() => {
        set({ saveStatus: 'error' });
      });

      // 2. Push historical study log entry
      syncService.pushStudyLog({
        cardId: currentCard.id,
        deckId: targetDeckId,
        mode: activeSession.mode,
        rating,
        userAnswer,
        isCorrect,
        timeSpentSeconds,
        verdict,
        createdAt: new Date().toISOString()
      }).catch(console.error);

      // 3. If session completed, mark finished in cloud
      if (isCompleted && updatedSession.id) {
        syncService.completeStudySession(updatedSession.id).catch(console.error);
      }
    } else {
      set({ saveStatus: 'saved' });
      setTimeout(() => {
        if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
      }, 1200);
    }

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
      await get().loadAnalytics();
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

    const restartedSession: StudySessionState = {
      ...activeSession,
      cardsQueue: shuffleArray(newQueue),
      currentIndex: 0,
      results: [],
      startTime: Date.now(),
      isCompleted: false,
      updatedAt: new Date().toISOString()
    };

    set({
      activeSession: restartedSession,
      saveStatus: 'idle'
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(restartedSession));
      } catch {}
    }

    if (get().user) {
      syncService.saveSessionCheckpoint(restartedSession).catch(console.error);
    }
  },

  endStudySession: () => {
    const { activeSession, user } = get();
    if (activeSession && !activeSession.isCompleted && activeSession.currentIndex > 0) {
      // Save in-progress session checkpoint before closing
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(activeSession));
        } catch {}
      }
      if (user) {
        syncService.saveSessionCheckpoint(activeSession).catch(console.error);
      }
    }
    set({ activeSession: null });
    get().loadDecks();
  }
}));
