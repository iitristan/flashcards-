import { create } from 'zustand';
import { Deck, Flashcard, StudyMode, ReviewRating, ThemeType, UserPreferences, StudySessionState, CardReviewResult, DeckPlaylist } from '@/types';
import { deckService } from '@/lib/services/deckService';
import { soundEffects } from '@/lib/soundEffects';
import { shuffleArray } from '@/lib/services/flashcardService';
import { syncService } from '@/lib/services/syncService';
import { getSupabaseClient } from '@/lib/supabase/client';

const PREFS_STORAGE_KEY = 'nutrianki_prefs_v1';
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
  applyThisDeviceToCloudAndAllDevices: () => Promise<{ success: boolean; decksUploaded: number; totalCards: number; error?: string }>;
  resetLocalAndPullFromCloud: () => Promise<void>;

  // Session & Progress Actions
  setResumeAvailableSession: (session: StudySessionState | null) => void;
  resumeSession: () => void;
  dismissResumeSession: () => void;



  // Deck Actions
  loadDecks: () => Promise<void>;
  setActiveDeckId: (id: string | null) => void;
  createDeck: (deck: Parameters<typeof deckService.createDeck>[0], cards?: Parameters<typeof deckService.createDeck>[1]) => Promise<Deck>;
  updateDeck: (id: string, updates: Parameters<typeof deckService.updateDeck>[1]) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  purgeEmptyDecks: () => Promise<number>;
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
    if (session?.id) {
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
        // Zero-login shared cloud sync (Works out-of-the-box without requiring user signup/auth)
        const currentUser = await syncService.getCurrentUser();
        set({
          user: currentUser || { id: '00000000-0000-0000-0000-000000000001', email: 'shared@nutrianki.cloud' },
        });
        await get().syncWithCloud();
      }

      supabase.auth.onAuthStateChange(async (event, newSession) => {
        syncService.clearUserCache();
        if (newSession?.user) {
          set({
            user: { id: newSession.user.id, email: newSession.user.email },
          });
          if (event === 'SIGNED_IN') {
            await get().syncWithCloud();
          }
        } else {
          set({
            user: { id: '00000000-0000-0000-0000-000000000001', email: 'shared@nutrianki.cloud' },
          });
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
    if (!supabase) {
      set({ syncStatus: 'offline' });
      return;
    }

    const currentUser = await syncService.getCurrentUser();
    if (!currentUser) {
      set({ syncStatus: 'idle' });
      return;
    }

    set({ syncStatus: 'syncing' });
    try {
      const cloudData = await syncService.pullFromCloud();
      if (cloudData && cloudData.decks) {
        const localDecks = await deckService.getDecks();
        const cloudDeckMap = new Map(cloudData.decks.map((d) => [d.id, d]));
        const mergedDecks: Deck[] = [...cloudData.decks];
        const unsyncedLocalDecks: Deck[] = [];

        for (const localDeck of localDecks) {
          const cloudDeck = cloudDeckMap.get(localDeck.id);
          if (!cloudDeck) {
            // New local deck created on this device not yet in cloud: PRESERVE IT!
            mergedDecks.push(localDeck);
            unsyncedLocalDecks.push(localDeck);
          } else {
            // Exists in both: if local was updated more recently, preserve local card changes
            const localTime = new Date(localDeck.updatedAt || localDeck.createdAt || 0).getTime();
            const cloudTime = new Date(cloudDeck.updatedAt || cloudDeck.createdAt || 0).getTime();
            if (localTime > cloudTime && (localDeck.cards?.length || 0) >= (cloudDeck.cards?.length || 0)) {
              const idx = mergedDecks.findIndex((d) => d.id === localDeck.id);
              if (idx !== -1) {
                mergedDecks[idx] = localDeck;
              }
            }
          }
        }

        await deckService.setAllDecks(mergedDecks);
        if (cloudData.playlists) {
          await deckService.setAllPlaylists(cloudData.playlists);
        }

        // Auto-upload any local decks that were missing from the cloud
        if (unsyncedLocalDecks.length > 0) {
          for (const unsynced of unsyncedLocalDecks) {
            syncService.pushDeckToCloud(unsynced).catch((err) =>
              console.warn('[Sync] Auto-uploading local deck to cloud failed:', err)
            );
          }
        }

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
      console.log('[Store] Loading local decks, playlists, and study logs for master overwrite...');
      const localDecks = await deckService.getDecks();
      const localPlaylists = await deckService.getPlaylists();
      const localLogs = await deckService.getReviewLogs();
      const prefs = get().preferences;
      console.log(`[Store] Local data ready: ${localDecks.length} decks, ${localPlaylists.length} playlists, ${localLogs.length} logs`);

      const res = await syncService.overwriteCloudWithLocalData(localDecks, localPlaylists, prefs, localLogs);
      console.log('[Store] overwriteCloudWithLocalData response:', res);

      if (res.success) {
        set({
          syncStatus: 'synced',
          lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        await get().loadDecks();
        return res;
      } else {
        set({ syncStatus: 'error' });
        return res;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Store] Failed to apply this device to cloud:', err);
      set({ syncStatus: 'error' });
      return { success: false, decksUploaded: 0, totalCards: 0, error: msg };
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
    syncService.pushPlaylistsToCloud(get().playlists).catch(console.error);
    get().syncWithCloud().catch(() => {});
    return created;
  },

  updatePlaylist: async (id, updates) => {
    await deckService.updatePlaylist(id, updates);
    await get().loadPlaylists();
    syncService.pushPlaylistsToCloud(get().playlists).catch(console.error);
    get().syncWithCloud().catch(() => {});
  },

  deletePlaylist: async (id) => {
    await deckService.deletePlaylist(id);
    await get().loadPlaylists();
    syncService.deletePlaylistFromCloud(id).catch(console.error);
    get().syncWithCloud().catch(() => {});
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
    syncService.pushDeckToCloud(created).catch((err) => console.error('Sync createDeck error:', err));
    get().syncWithCloud().catch(() => {});
    return created;
  },

  updateDeck: async (id, updates) => {
    await deckService.updateDeck(id, updates);
    await get().loadDecks();
    const updated = get().decks.find((d) => d.id === id);
    if (updated) {
      syncService.pushDeckToCloud(updated).catch((err) => console.error('Sync updateDeck error:', err));
      get().syncWithCloud().catch(() => {});
    }
  },

  deleteDeck: async (id) => {
    await deckService.deleteDeck(id);
    await get().loadDecks();
    if (get().activeDeckId === id) {
      set({ activeDeckId: null });
    }
    syncService.deleteDeckFromCloud(id).catch((err) => console.error('Sync deleteDeck error:', err));
    get().syncWithCloud().catch(() => {});
  },

  purgeEmptyDecks: async () => {
    const emptyDecks = get().decks.filter((d) => (d.cards?.length || 0) === 0);
    if (emptyDecks.length === 0) return 0;
    for (const d of emptyDecks) {
      await deckService.deleteDeck(d.id);
      syncService.deleteDeckFromCloud(d.id).catch(console.error);
    }
    await get().loadDecks();
    get().syncWithCloud().catch(() => {});
    return emptyDecks.length;
  },

  resetDecks: async () => {
    await deckService.resetToDefaultDecks();
    await get().loadDecks();
    const decks = get().decks;
    const playlists = get().playlists;
    syncService.migrateLocalToCloud(decks, playlists).catch((err) => console.error('Sync reset error:', err));
    get().syncWithCloud().catch(() => {});
  },

  importMultipleDecks: async (newDecks) => {
    await deckService.importMultipleDecks(newDecks);
    await get().loadDecks();
    for (const d of newDecks) {
      await syncService.pushDeckToCloud(d).catch((err) => console.error('Sync import error:', err));
    }
    await get().syncWithCloud().catch(() => {});
  },

  importQuizletFoodServiceDeck: async () => {
    const deck = await deckService.importQuizletFoodServiceDeck();
    await get().loadDecks();
    syncService.pushDeckToCloud(deck).catch(console.error);
    get().syncWithCloud().catch(() => {});
    return deck;
  },

  addCard: async (deckId, cardData) => {
    await deckService.addCard(deckId, cardData);
    await get().loadDecks();
    const d = get().decks.find((deck) => deck.id === deckId);
    if (d) {
      syncService.pushDeckToCloud(d).catch(console.error);
      get().syncWithCloud().catch(() => {});
    }
  },

  updateCard: async (deckId, cardId, updates) => {
    await deckService.updateCard(deckId, cardId, updates);
    await get().loadDecks();
    const d = get().decks.find((deck) => deck.id === deckId);
    if (d) {
      syncService.pushDeckToCloud(d).catch(console.warn);
      get().syncWithCloud().catch(() => {});
    }

    // Also update current card in active session if active
    const { activeSession } = get();
    if (activeSession) {
      const updatedQueue = activeSession.cardsQueue.map((c) =>
        c.id === cardId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      );
      set({
        activeSession: {
          ...activeSession,
          cardsQueue: updatedQueue
        }
      });
    }
  },

  deleteCard: async (deckId, cardId) => {
    await deckService.deleteCard(deckId, cardId);
    await get().loadDecks();
    const d = get().decks.find((deck) => deck.id === deckId);
    if (d) {
      syncService.pushDeckToCloud(d).catch(console.warn);
      get().syncWithCloud().catch(() => {});
    }
  },

  saveCardNote: async (deckId, cardId, note) => {
    const updatedCard = await deckService.saveCardNote(deckId, cardId, note);
    await get().loadDecks();
    syncService.syncCardReview(deckId, updatedCard).catch((err) => console.warn('Cloud sync note error:', err));
    
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

    // Refresh decks list in store state so UI stats immediately reflect the review
    try {
      const updatedDecks = await deckService.getDecks();
      set({ decks: updatedDecks });
    } catch {}

    // Cloud sync card review (zero-login shared workspace & authenticated sync)
    syncService.syncCardReview(targetDeckId, updatedCard).catch((err) =>
      console.warn('Cloud sync on recordReview:', err)
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

    // Persist checkpoint & study log to cloud
    syncService.saveSessionCheckpoint(updatedSession).then(() => {
      set({ saveStatus: 'saved' });
      setTimeout(() => {
        if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
      }, 1500);
    }).catch(() => {
      set({ saveStatus: 'saved' }); // Local save succeeded
    });

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
    }).catch(console.warn);

    if (isCompleted && updatedSession.id) {
      syncService.completeStudySession(updatedSession.id).catch(console.warn);
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

    syncService.saveSessionCheckpoint(restartedSession).catch(console.error);
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
      syncService.saveSessionCheckpoint(activeSession).catch(console.error);
    }
    set({ activeSession: null });
    get().loadDecks();
  }
}));
