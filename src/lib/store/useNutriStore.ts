import { create } from 'zustand';
import { 
  Deck, 
  Flashcard, 
  StudyMode, 
  ReviewRating, 
  ThemeType, 
  UserPreferences, 
  StudySessionState, 
  CardReviewResult, 
  DeckPlaylist, 
  CardSortOption, 
  CardFilterOption, 
  SparkleStyle,
  CardGroupFilterConfig,
  CardGroupFilterItem,
  DEFAULT_CARD_GROUP_FILTERS
} from '@/types';
import { deckService } from '@/lib/services/deckService';
import { soundEffects } from '@/lib/soundEffects';
import { shuffleArray, computeDeckStats } from '@/lib/services/flashcardService';
import { syncService } from '@/lib/services/syncService';
import { getSupabaseClient } from '@/lib/supabase/client';
import { resolveCardSubject, getSubjectCards, getSubjectMissedCards } from '@/lib/services/boardReadinessService';
import { NDLESubject, NDLE_SUBJECT_CONFIGS } from '@/types/ndle';

const PREFS_STORAGE_KEY = 'nutrianki_prefs_v1';
const ACTIVE_SESSION_STORAGE_KEY = 'nutrianki_active_session_v1';
export const CARD_GROUP_FILTERS_STORAGE_KEY = 'nutriboard_card_group_filters_v1';

function getInitialCardGroupFilters(): Record<string, CardGroupFilterConfig> {
  if (typeof window === 'undefined') return DEFAULT_CARD_GROUP_FILTERS;
  try {
    const raw = localStorage.getItem(CARD_GROUP_FILTERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_CARD_GROUP_FILTERS;
}

const DEFAULT_PREFS: UserPreferences = {
  theme: 'matcha',
  timerDuration: 0, // 0 = off, 10, 15, 20, 25, 30
  soundEnabled: true,
  autoFlip: false,
  dailyGoal: 15,
  studyStreak: 1,
  lastStudyDate: null
};

// Module-level flags to prevent duplicate channel creation or duplicate auth listeners on re-mount
let isAuthListenerAttached = false;
let isRealtimeSubscribed = false;

// Optimization: Debounce & dedup syncWithCloud to prevent rapid successive full-pulls
let syncDebounceGlobal: ReturnType<typeof setTimeout> | null = null;
let isSyncInProgress = false;

// Optimization: Self-echo guard — suppress realtime-triggered re-pulls while we're actively pushing
let isSelfPushing = false;
let selfPushCooldownTimer: ReturnType<typeof setTimeout> | null = null;
let checkpointDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function markSelfPushStart() {
  isSelfPushing = true;
  if (selfPushCooldownTimer) clearTimeout(selfPushCooldownTimer);
}

function markSelfPushEnd() {
  // Keep guard up for 3 seconds after push completes to allow realtime echo to pass
  if (selfPushCooldownTimer) clearTimeout(selfPushCooldownTimer);
  selfPushCooldownTimer = setTimeout(() => {
    isSelfPushing = false;
  }, 3000);
}


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
  resumeSession: (deckId?: string) => void;
  dismissResumeSession: (deckId?: string) => void;
  deckCheckpoints: Record<string, StudySessionState>;
  getDeckCheckpoint: (deckId: string) => StudySessionState | null;
  clearDeckCheckpoint: (deckId: string) => void;

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
  startStudySession: (
    deckId: string,
    mode: StudyMode,
    filterDueOnly?: boolean,
    options?: {
      sort?: CardSortOption;
      filter?: CardFilterOption;
      searchQuery?: string;
      resume?: boolean;
      startFresh?: boolean;
    }
  ) => Promise<void>;
  startPracticeAreaSession: (
    subject: NDLESubject,
    options?: {
      mode?: StudyMode;
      searchQuery?: string;
      sort?: CardSortOption;
      filter?: CardFilterOption;
      sparkleStyle?: SparkleStyle;
      resume?: boolean;
      startFresh?: boolean;
      missedOnly?: boolean;
    }
  ) => Promise<void>;
  updateSessionFilterAndSort: (options: {
    sort?: CardSortOption;
    filter?: CardFilterOption;
    searchQuery?: string;
    sparkleStyle?: SparkleStyle;
  }) => void;
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

  // Card Group Filter Management
  cardGroupFilters: Record<string, CardGroupFilterConfig>;
  updateGroupFilterConfig: (groupId: string, updates: Partial<CardGroupFilterConfig>) => void;
  updatePracticeAreaName: (groupId: string, newName: string) => void;
  deletePracticeArea: (groupId: string) => Promise<void>;
  assignCardToPracticeArea: (deckId: string, cardId: string, practiceAreaId: string) => Promise<void>;
  unassignCardFromPracticeArea: (deckId: string, cardId: string) => Promise<void>;
  addGroupFilterItem: (groupId: string, item: { label: string; tag: string }) => void;
  removeGroupFilterItem: (groupId: string, filterId: string) => void;
  toggleGroupFilterItem: (groupId: string, filterId: string, enabled?: boolean) => void;
  reorderGroupFilterItems: (groupId: string, filterIds: string[]) => void;
  resetGroupFilterConfig: (groupId: string) => void;
  resetAllGroupFilters: () => void;
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
  deckCheckpoints: {},
  cardGroupFilters: getInitialCardGroupFilters(),

  user: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
  isAuthModalOpen: false,
  setIsAuthModalOpen: (open) => set({ isAuthModalOpen: open }),

  setResumeAvailableSession: (session) => set({ resumeAvailableSession: session }),

  getDeckCheckpoint: (deckId: string) => {
    const { deckCheckpoints, activeSession, resumeAvailableSession } = get();
    if (deckCheckpoints[deckId] && !deckCheckpoints[deckId].isCompleted) {
      return deckCheckpoints[deckId];
    }
    if (activeSession?.deckId === deckId && !activeSession.isCompleted && (activeSession.currentIndex > 0 || (activeSession.results || []).length > 0)) {
      return activeSession;
    }
    if (resumeAvailableSession?.deckId === deckId && !resumeAvailableSession.isCompleted && (resumeAvailableSession.currentIndex > 0 || (resumeAvailableSession.results || []).length > 0)) {
      return resumeAvailableSession;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`nutrianki_deck_session_${deckId}`);
        if (stored) {
          const parsed: StudySessionState = JSON.parse(stored);
          if (parsed && !parsed.isCompleted && (parsed.currentIndex > 0 || (parsed.results || []).length > 0)) {
            set((state) => ({
              deckCheckpoints: { ...state.deckCheckpoints, [deckId]: parsed }
            }));
            return parsed;
          }
        }
        if (deckId.startsWith('practice-area-')) {
          const pCode = deckId.replace('practice-area-', '');
          const pStored = localStorage.getItem(`nutriboard_practice_session_${pCode}`);
          if (pStored) {
            const parsed: StudySessionState = JSON.parse(pStored);
            if (parsed && !parsed.isCompleted && (parsed.currentIndex > 0 || (parsed.results || []).length > 0)) {
              set((state) => ({
                deckCheckpoints: { ...state.deckCheckpoints, [deckId]: parsed }
              }));
              return parsed;
            }
          }
        }
      } catch {}
    }
    return null;
  },

  clearDeckCheckpoint: (deckId: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`nutrianki_deck_session_${deckId}`);
        if (deckId.startsWith('practice-area-')) {
          const pCode = deckId.replace('practice-area-', '');
          localStorage.removeItem(`nutriboard_practice_session_${pCode}`);
        }
        const active = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
        if (active) {
          const parsed = JSON.parse(active);
          if (parsed?.deckId === deckId) {
            localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
          }
        }
      } catch {}
    }
    set((state) => {
      const nextCheckpoints = { ...state.deckCheckpoints };
      delete nextCheckpoints[deckId];
      return {
        deckCheckpoints: nextCheckpoints,
        resumeAvailableSession: state.resumeAvailableSession?.deckId === deckId ? null : state.resumeAvailableSession,
        activeSession: state.activeSession?.deckId === deckId ? null : state.activeSession
      };
    });
  },

  resumeSession: (deckId?: string) => {
    const targetDeckId = deckId || get().resumeAvailableSession?.deckId;
    const session = targetDeckId ? get().getDeckCheckpoint(targetDeckId) : get().resumeAvailableSession;
    if (session) {
      set({
        activeSession: session,
        activeDeckId: session.deckId,
        resumeAvailableSession: null
      });
    }
  },

  dismissResumeSession: (deckId?: string) => {
    const targetDeckId = deckId || get().resumeAvailableSession?.deckId;
    if (targetDeckId) {
      get().clearDeckCheckpoint(targetDeckId);
    } else {
      set({ resumeAvailableSession: null });
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      }
    }
    const session = get().resumeAvailableSession;
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
          user: currentUser || { id: '00000000-0000-0000-0000-000000000001', email: 'shared@nutriboard.cloud' },
        });
        await get().syncWithCloud();
      }

      // Attach auth listener only once per browser session
      if (!isAuthListenerAttached) {
        isAuthListenerAttached = true;
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
              user: { id: '00000000-0000-0000-0000-000000000001', email: 'shared@nutriboard.cloud' },
            });
          }
        });
      }

      // Realtime cross-device sync: listen for changes made on other devices
      let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
      const triggerRealtimeSync = () => {
        // Self-echo guard: skip re-pull if WE just pushed data (our own change echo)
        if (isSelfPushing) {
          return;
        }
        if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => {
          get().syncWithCloud();
        }, 2000); // Increased debounce to 2s to batch multiple rapid realtime events
      };

      // Subscribe to realtime changes only once per browser session
      if (!isRealtimeSubscribed) {
        try {
          const channels = supabase.getChannels();
          const existing = channels.find(
            (c) =>
              c.topic === 'realtime:nutriboard_live_sync' ||
              c.topic === 'realtime:nutrianki_live_sync'
          );

          if (existing) {
            // Already subscribed, do not re-add listeners to prevent Supabase Realtime error
            if (existing.state === 'joined' || existing.state === 'joining') {
              isRealtimeSubscribed = true;
              return;
            }
            supabase.removeChannel(existing);
          }

          supabase
            .channel('nutriboard_live_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'decks' }, triggerRealtimeSync)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, triggerRealtimeSync)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_preferences' }, triggerRealtimeSync)
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                isRealtimeSubscribed = true;
              }
            });
          isRealtimeSubscribed = true;
        } catch (realtimeErr) {
          console.warn('Realtime subscription skipped:', realtimeErr);
        }
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

    // Dedup: if a sync is already in progress, debounce and skip
    if (isSyncInProgress) {
      if (syncDebounceGlobal) clearTimeout(syncDebounceGlobal);
      syncDebounceGlobal = setTimeout(() => {
        get().syncWithCloud();
      }, 3000);
      return;
    }

    const currentUser = await syncService.getCurrentUser();
    if (!currentUser) {
      set({ syncStatus: 'idle' });
      return;
    }

    isSyncInProgress = true;
    set({ syncStatus: 'syncing' });
    try {
      const cloudData = await syncService.pullFromCloud();
      if (cloudData && cloudData.decks) {
        const localDecks = await deckService.getDecks();
        const cloudDeckMap = new Map(cloudData.decks.map((d) => [d.id, d]));
        const mergedDecks: Deck[] = [];
        const unsyncedLocalDecks: Deck[] = [];

        for (const localDeck of localDecks) {
          const cloudDeck = cloudDeckMap.get(localDeck.id);
          if (!cloudDeck) {
            // New local deck created on this device not yet in cloud: PRESERVE IT!
            mergedDecks.push(localDeck);
            unsyncedLocalDecks.push(localDeck);
          } else {
            // Exists in both: do a SMART CARD-LEVEL MERGE so no card review is ever lost!
            const cloudCardsMap = new Map((cloudDeck.cards || []).map((c) => [c.id, c]));
            const localCardsMap = new Map((localDeck.cards || []).map((c) => [c.id, c]));
            const mergedCards: Flashcard[] = [];

            for (const localCard of localDeck.cards || []) {
              const cloudCard = cloudCardsMap.get(localCard.id);
              if (!cloudCard) {
                mergedCards.push(localCard);
              } else {
                const localReviewed = new Date(localCard.lastReviewedAt || 0).getTime();
                const cloudReviewed = new Date(cloudCard.lastReviewedAt || 0).getTime();
                const localRepetitions = localCard.sm2?.repetitions || 0;
                const cloudRepetitions = cloudCard.sm2?.repetitions || 0;

                if (localReviewed > cloudReviewed || localRepetitions > cloudRepetitions) {
                  mergedCards.push(localCard);
                } else if (cloudReviewed > localReviewed || cloudRepetitions > localRepetitions) {
                  mergedCards.push(cloudCard);
                } else {
                  const localUpdated = new Date(localCard.updatedAt || localCard.createdAt || 0).getTime();
                  const cloudUpdated = new Date(cloudCard.updatedAt || cloudCard.createdAt || 0).getTime();
                  mergedCards.push(localUpdated >= cloudUpdated ? localCard : cloudCard);
                }
              }
            }

            for (const cloudCard of cloudDeck.cards || []) {
              if (!localCardsMap.has(cloudCard.id)) {
                mergedCards.push(cloudCard);
              }
            }

            const updatedDeck: Deck = {
              ...cloudDeck,
              ...localDeck,
              cards: mergedCards,
              stats: computeDeckStats(mergedCards),
              updatedAt: new Date(
                Math.max(
                  new Date(localDeck.updatedAt || localDeck.createdAt || 0).getTime(),
                  new Date(cloudDeck.updatedAt || cloudDeck.createdAt || 0).getTime(),
                  Date.now()
                )
              ).toISOString()
            };
            mergedDecks.push(updatedDeck);
          }
        }

        // Include any cloud decks not present locally
        const localDeckIdSet = new Set(localDecks.map((d) => d.id));
        for (const cloudDeck of cloudData.decks) {
          if (!localDeckIdSet.has(cloudDeck.id)) {
            mergedDecks.push(cloudDeck);
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

        // Check for cloud active session checkpoint with timestamp & progress guard
        try {
          const remoteSession = await syncService.fetchActiveSession();
          if (remoteSession && !remoteSession.isCompleted && (remoteSession.currentIndex > 0 || remoteSession.results.length > 0)) {
            const currentLocal = get().activeSession || get().resumeAvailableSession;
            if (!currentLocal) {
              set({ resumeAvailableSession: remoteSession });
            } else {
              const localTime = new Date(currentLocal.updatedAt || 0).getTime();
              const remoteTime = new Date(remoteSession.updatedAt || 0).getTime();
              // Only adopt remote session if it is strictly newer AND has at least equal progress
              if (remoteTime > localTime && remoteSession.currentIndex >= currentLocal.currentIndex) {
                set({ resumeAvailableSession: remoteSession });
                if (get().activeSession?.id === remoteSession.id) {
                  set({ activeSession: remoteSession });
                }
              }
            }
          }
        } catch (e) {
          console.warn('Failed to fetch remote active session:', e);
        }

        // Sync historical study logs for cross-device analytics (Optimization #13: conditional pull)
        try {
          const localLogs = await deckService.getReviewLogs();
          let latestTimestamp: string | undefined = undefined;
          if (localLogs && localLogs.length > 0) {
            for (const l of localLogs) {
              const ts = l.timestamp || l.createdAt;
              if (ts && (!latestTimestamp || ts > latestTimestamp)) {
                latestTimestamp = ts;
              }
            }
          }

          const remoteLogs = await syncService.pullStudyLogs(latestTimestamp);
          if (remoteLogs && remoteLogs.length > 0) {
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

        const refreshedDecks = await deckService.getDecks();
        const refreshedPlaylists = await deckService.getPlaylists();
        set({
          decks: refreshedDecks,
          playlists: refreshedPlaylists,
          isLoadingDecks: false,
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
    } finally {
      isSyncInProgress = false;
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

      // Rehydrate independent card group filters
      const groupFilters = getInitialCardGroupFilters();
      set({ cardGroupFilters: groupFilters });

      // Check for in-progress session checkpoints and make them available for resumption
      const checkpoints: Record<string, StudySessionState> = {};
      if (typeof window !== 'undefined') {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('nutrianki_deck_session_') || key.startsWith('nutriboard_practice_session_'))) {
              const val = localStorage.getItem(key);
              if (val) {
                const parsed: StudySessionState = JSON.parse(val);
                if (parsed && !parsed.isCompleted && (parsed.currentIndex > 0 || (parsed.results || []).length > 0)) {
                  checkpoints[parsed.deckId] = parsed;
                }
              }
            }
          }
        } catch {}
      }

      const storedSession = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) : null;
      let parsedSession: StudySessionState | null = null;
      if (storedSession) {
        try {
          parsedSession = JSON.parse(storedSession);
          if (parsedSession && !parsedSession.isCompleted && (parsedSession.currentIndex > 0 || (parsedSession.results || []).length > 0)) {
            checkpoints[parsedSession.deckId] = parsedSession;
          } else {
            parsedSession = null;
          }
        } catch {}
      }

      set({
        resumeAvailableSession: parsedSession,
        deckCheckpoints: checkpoints
      });


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

  updateGroupFilterConfig: (groupId, updates) => {
    set((state) => {
      const current = state.cardGroupFilters[groupId] || DEFAULT_CARD_GROUP_FILTERS[groupId];
      if (!current) return state;
      const updated = {
        ...state.cardGroupFilters,
        [groupId]: {
          ...current,
          ...updates
        }
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CARD_GROUP_FILTERS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      return { cardGroupFilters: updated };
    });
  },

  updatePracticeAreaName: (groupId, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    set((state) => {
      const current = state.cardGroupFilters[groupId] || DEFAULT_CARD_GROUP_FILTERS[groupId];
      if (!current) return state;
      const updated = {
        ...state.cardGroupFilters,
        [groupId]: {
          ...current,
          name: trimmed
        }
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CARD_GROUP_FILTERS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      return { cardGroupFilters: updated };
    });
  },

  deletePracticeArea: async (groupId) => {
    const { decks, updateCard } = get();
    const groupToDelete = get().cardGroupFilters[groupId];

    // Remove group from cardGroupFilters
    set((state) => {
      const nextFilters = { ...state.cardGroupFilters };
      delete nextFilters[groupId];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CARD_GROUP_FILTERS_STORAGE_KEY, JSON.stringify(nextFilters));
        } catch {}
      }
      return { cardGroupFilters: nextFilters };
    });

    // Safely mark associated cards as unassigned without deleting records, rationales, or progress
    for (const deck of decks) {
      for (const card of deck.cards || []) {
        let isAssociated = false;
        if (card.practiceAreaId === groupId) {
          isAssociated = true;
        } else if (!card.practiceAreaId && !card.unassigned && groupToDelete) {
          if (groupToDelete.ndleSubject && resolveCardSubject(card, deck.category) === groupToDelete.ndleSubject) {
            isAssociated = true;
          } else if (groupToDelete.category && (deck.category === groupToDelete.category || (card.tags || []).some(t => t.toLowerCase() === groupToDelete.category?.toLowerCase()))) {
            isAssociated = true;
          }
        }

        if (isAssociated) {
          await updateCard(deck.id, card.id, {
            practiceAreaId: 'unassigned',
            unassigned: true
          });
        }
      }
    }
  },

  assignCardToPracticeArea: async (deckId, cardId, practiceAreaId) => {
    const { cardGroupFilters, updateCard } = get();
    const targetGroup = cardGroupFilters[practiceAreaId];
    const updates: Partial<Flashcard> = {
      practiceAreaId,
      unassigned: false
    };
    if (targetGroup?.ndleSubject) {
      updates.ndleSubject = targetGroup.ndleSubject;
    }
    await updateCard(deckId, cardId, updates);
  },

  unassignCardFromPracticeArea: async (deckId, cardId) => {
    const { updateCard } = get();
    await updateCard(deckId, cardId, {
      practiceAreaId: 'unassigned',
      unassigned: true
    });
  },

  addGroupFilterItem: (groupId, { label, tag }) => {
    set((state) => {
      const current = state.cardGroupFilters[groupId] || DEFAULT_CARD_GROUP_FILTERS[groupId];
      if (!current) return state;
      const newFilter: CardGroupFilterItem = {
        id: `custom-filter-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: label.trim(),
        tag: tag.trim().toLowerCase(),
        enabled: true
      };
      const updated = {
        ...state.cardGroupFilters,
        [groupId]: {
          ...current,
          filters: [...(current.filters || []), newFilter]
        }
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CARD_GROUP_FILTERS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      return { cardGroupFilters: updated };
    });
  },

  removeGroupFilterItem: (groupId, filterId) => {
    set((state) => {
      const current = state.cardGroupFilters[groupId] || DEFAULT_CARD_GROUP_FILTERS[groupId];
      if (!current) return state;
      const updated = {
        ...state.cardGroupFilters,
        [groupId]: {
          ...current,
          filters: (current.filters || []).filter(f => f.id !== filterId)
        }
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CARD_GROUP_FILTERS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      return { cardGroupFilters: updated };
    });
  },

  toggleGroupFilterItem: (groupId, filterId, enabled) => {
    set((state) => {
      const current = state.cardGroupFilters[groupId] || DEFAULT_CARD_GROUP_FILTERS[groupId];
      if (!current) return state;
      const updated = {
        ...state.cardGroupFilters,
        [groupId]: {
          ...current,
          filters: (current.filters || []).map(f =>
            f.id === filterId ? { ...f, enabled: enabled !== undefined ? enabled : !f.enabled } : f
          )
        }
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CARD_GROUP_FILTERS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      return { cardGroupFilters: updated };
    });
  },

  reorderGroupFilterItems: (groupId, filterIds) => {
    set((state) => {
      const current = state.cardGroupFilters[groupId] || DEFAULT_CARD_GROUP_FILTERS[groupId];
      if (!current) return state;
      const filterMap = new Map((current.filters || []).map(f => [f.id, f]));
      const reordered: CardGroupFilterItem[] = [];
      for (const id of filterIds) {
        const item = filterMap.get(id);
        if (item) {
          reordered.push(item);
          filterMap.delete(id);
        }
      }
      for (const rem of filterMap.values()) {
        reordered.push(rem);
      }
      const updated = {
        ...state.cardGroupFilters,
        [groupId]: {
          ...current,
          filters: reordered
        }
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CARD_GROUP_FILTERS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      return { cardGroupFilters: updated };
    });
  },

  resetGroupFilterConfig: (groupId) => {
    set((state) => {
      const def = DEFAULT_CARD_GROUP_FILTERS[groupId];
      if (!def) return state;
      const updated = {
        ...state.cardGroupFilters,
        [groupId]: { ...def }
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CARD_GROUP_FILTERS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      return { cardGroupFilters: updated };
    });
  },

  resetAllGroupFilters: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CARD_GROUP_FILTERS_STORAGE_KEY, JSON.stringify(DEFAULT_CARD_GROUP_FILTERS));
      } catch {}
    }
    set({ cardGroupFilters: DEFAULT_CARD_GROUP_FILTERS });
  },

  loadDecks: async () => {
    // Only display full loading state on initial cold start when no decks are present in memory
    if (get().decks.length === 0) {
      set({ isLoadingDecks: true });
    }
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
    markSelfPushStart();
    syncService.pushPlaylistsToCloud(get().playlists).catch(console.error).finally(markSelfPushEnd);
    return created;
  },

  updatePlaylist: async (id, updates) => {
    await deckService.updatePlaylist(id, updates);
    await get().loadPlaylists();
    markSelfPushStart();
    syncService.pushPlaylistsToCloud(get().playlists).catch(console.error).finally(markSelfPushEnd);
  },

  deletePlaylist: async (id) => {
    await deckService.deletePlaylist(id);
    await get().loadPlaylists();
    markSelfPushStart();
    syncService.deletePlaylistFromCloud(id).catch(console.error).finally(markSelfPushEnd);
  },

  startPlaylistSession: async (playlistId, mode, shuffle = true) => {
    let playlist = get().playlists.find(p => p.id === playlistId);
    if (!playlist) {
      const playlists = await deckService.getPlaylists();
      playlist = playlists.find(p => p.id === playlistId);
    }
    if (!playlist) {
      throw new Error('Playlist not found!');
    }

    const allDecks = get().decks.length > 0 ? get().decks : await deckService.getDecks();
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
    markSelfPushStart();
    syncService.pushDeckToCloud(created).catch((err) => console.error('Sync createDeck error:', err)).finally(markSelfPushEnd);
    return created;
  },

  updateDeck: async (id, updates) => {
    await deckService.updateDeck(id, updates);
    await get().loadDecks();
    const updated = get().decks.find((d) => d.id === id);
    if (updated) {
      markSelfPushStart();
      syncService.pushDeckToCloud(updated).catch((err) => console.error('Sync updateDeck error:', err)).finally(markSelfPushEnd);
    }
  },

  deleteDeck: async (id) => {
    await deckService.deleteDeck(id);
    await get().loadDecks();
    if (get().activeDeckId === id) {
      set({ activeDeckId: null });
    }
    markSelfPushStart();
    syncService.deleteDeckFromCloud(id).catch((err) => console.error('Sync deleteDeck error:', err)).finally(markSelfPushEnd);
  },

  resetDecks: async () => {
    await deckService.resetToDefaultDecks();
    await get().loadDecks();
    const decks = get().decks;
    const playlists = get().playlists;
    markSelfPushStart();
    syncService.migrateLocalToCloud(decks, playlists).catch((err) => console.error('Sync reset error:', err)).finally(markSelfPushEnd);
  },

  importMultipleDecks: async (newDecks) => {
    await deckService.importMultipleDecks(newDecks);
    await get().loadDecks();
    markSelfPushStart();
    try {
      for (const d of newDecks) {
        await syncService.pushDeckToCloud(d).catch((err) => console.error('Sync import error:', err));
      }
    } finally {
      markSelfPushEnd();
    }
  },

  importQuizletFoodServiceDeck: async () => {
    const deck = await deckService.importQuizletFoodServiceDeck();
    await get().loadDecks();
    markSelfPushStart();
    syncService.pushDeckToCloud(deck).catch(console.error).finally(markSelfPushEnd);
    return deck;
  },

  addCard: async (deckId, cardData) => {
    await deckService.addCard(deckId, cardData);
    await get().loadDecks();
    const d = get().decks.find((deck) => deck.id === deckId);
    if (d) {
      markSelfPushStart();
      syncService.pushDeckToCloud(d).catch(console.error).finally(markSelfPushEnd);
    }
  },

  updateCard: async (deckId, cardId, updates) => {
    await deckService.updateCard(deckId, cardId, updates);
    await get().loadDecks();
    const d = get().decks.find((deck) => deck.id === deckId);
    if (d) {
      markSelfPushStart();
      syncService.pushDeckToCloud(d).catch(console.warn).finally(markSelfPushEnd);
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
      markSelfPushStart();
      syncService.pushDeckToCloud(d).catch(console.warn).finally(markSelfPushEnd);
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

  startStudySession: async (deckId, mode, filterDueOnly = false, options) => {
    // If startFresh is explicitly requested, clear any saved checkpoint first
    if (options?.startFresh) {
      get().clearDeckCheckpoint(deckId);
    }

    const { activeSession, resumeAvailableSession, deckCheckpoints } = get();
    const existing = options?.startFresh
      ? null
      : (activeSession?.deckId === deckId && !activeSession.isCompleted)
      ? activeSession
      : (deckCheckpoints[deckId] && !deckCheckpoints[deckId].isCompleted)
      ? deckCheckpoints[deckId]
      : (resumeAvailableSession?.deckId === deckId && !resumeAvailableSession.isCompleted)
      ? resumeAvailableSession
      : get().getDeckCheckpoint(deckId);

    const shouldResume = options?.resume || (Boolean(existing) && existing?.mode === mode && !options?.startFresh);

    if (shouldResume && existing && !options?.searchQuery && (!options?.filter || options.filter === existing.activeFilter) && (existing.currentIndex > 0 || (existing.results || []).length > 0)) {
      set({
        activeDeckId: deckId,
        activeSession: existing,
        resumeAvailableSession: null,
        saveStatus: 'idle'
      });
      return;
    }

    let deck = get().decks.find(d => d.id === deckId);
    if (!deck) {
      deck = await deckService.getDeckById(deckId) || undefined;
    }
    if (!deck || (deck.cards || []).length === 0) {
      throw new Error('This deck has no cards to study!');
    }

    let cards = [...(deck.cards || [])];
    const searchQuery = (options?.searchQuery || '').trim().toLowerCase();
    if (searchQuery) {
      cards = cards.filter(c =>
        (c.front || '').toLowerCase().includes(searchQuery) ||
        (c.back || '').toLowerCase().includes(searchQuery) ||
        (c.rationale || '').toLowerCase().includes(searchQuery) ||
        (c.tags || []).some(t => t.toLowerCase().includes(searchQuery))
      );
    }

    if (filterDueOnly || options?.filter === 'due') {
      const now = new Date();
      const dueCards = cards.filter(c => !c.lastReviewedAt || new Date(c.sm2.dueDate) <= now);
      if (dueCards.length > 0) {
        cards = dueCards;
      }
    } else if (options?.filter === 'unseen') {
      const unseen = cards.filter(c => !c.lastReviewedAt || (c.sm2?.repetitions || 0) === 0);
      if (unseen.length > 0) cards = unseen;
    } else if (options?.filter === 'learning') {
      const learning = cards.filter(c => (c.sm2?.repetitions || 0) > 0 && (c.sm2?.interval || 0) < 4);
      if (learning.length > 0) cards = learning;
    } else if (options?.filter === 'developing') {
      const dev = cards.filter(c => (c.sm2?.interval || 0) >= 4 && (c.sm2?.interval || 0) < 21);
      if (dev.length > 0) cards = dev;
    } else if (options?.filter === 'mastered') {
      const mastered = cards.filter(c => (c.sm2?.interval || 0) >= 21 || (c.sm2?.repetitions || 0) >= 4);
      if (mastered.length > 0) cards = mastered;
    } else if (options?.filter === 'wrong') {
      const wrongCardIds = new Set<string>();
      if (existing) {
        (existing.results || []).filter(r => !r.isCorrect || r.rating === 'again' || r.rating === 'hard').forEach(r => wrongCardIds.add(r.cardId));
      }
      try {
        const logs = await deckService.getReviewLogs();
        logs.filter(l => !l.isCorrect || l.rating === 'again' || l.rating === 'hard').forEach(l => wrongCardIds.add(l.cardId));
      } catch {}
      const wrong = cards.filter(c => wrongCardIds.has(c.id) || (c.lastReviewedAt && (c.sm2?.repetitions || 0) === 0));
      if (wrong.length > 0) cards = wrong;
    }

    // Sort cards
    if (options?.sort === 'progress-asc') {
      cards.sort((a, b) => (a.sm2?.repetitions || 0) - (b.sm2?.repetitions || 0));
    } else if (options?.sort === 'progress-desc') {
      cards.sort((a, b) => (b.sm2?.repetitions || 0) - (a.sm2?.repetitions || 0));
    } else if (options?.sort === 'difficulty') {
      const diffOrder: Record<string, number> = { hard: 1, medium: 2, easy: 3 };
      cards.sort((a, b) => (diffOrder[a.difficulty || 'medium'] || 2) - (diffOrder[b.difficulty || 'medium'] || 2));
    } else if (options?.sort === 'alphabetical') {
      cards.sort((a, b) => (a.front || '').localeCompare(b.front || ''));
    } else if (options?.sort === 'most-reviewed') {
      cards.sort((a, b) => (b.sm2?.repetitions || 0) - (a.sm2?.repetitions || 0));
    } else if (mode === 'multiple-choice' || mode === 'identification' || mode === 'blitz-marathon') {
      // Shuffle cards for quiz modes by default
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
      activeSort: options?.sort || 'default',
      activeFilter: options?.filter || (filterDueOnly ? 'due' : 'all'),
      searchFilter: searchQuery || undefined,
      sparkleStyle: preferences.sparkleStyle || 'clinical',
      cardsQueue: cards,
      currentIndex: 0,
      results: [],
      startTime: Date.now(),
      isCompleted: false,
      timerDurationSeconds: timerDuration,
      updatedAt: new Date().toISOString()
    };

    set((state) => ({
      activeDeckId: deckId,
      activeSession: newSession,
      resumeAvailableSession: null,
      deckCheckpoints: {
        ...state.deckCheckpoints,
        [deckId]: newSession
      },
      saveStatus: 'idle'
    }));

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(newSession));
        localStorage.setItem(`nutrianki_deck_session_${deckId}`, JSON.stringify(newSession));
      } catch {}
    }

    if (get().user) {
      syncService.saveSessionCheckpoint(newSession).catch((err) =>
        console.warn('Failed to save initial study session checkpoint:', err)
      );
    }
  },

  startPracticeAreaSession: async (subject, options) => {
    const { decks, activeSession, resumeAvailableSession, preferences, cardGroupFilters } = get();
    const config = NDLE_SUBJECT_CONFIGS[subject];
    const code = config?.code || 'NBCD';
    const practiceDeckId = `practice-area-${code}`;
    const practiceStorageKey = `nutriboard_practice_session_${code}`;
    const groupKey = code === 'NBCD' ? 'nbcd' : code === 'CPHN' ? 'cphn' : 'ffss';
    const groupConfig = cardGroupFilters[groupKey] || DEFAULT_CARD_GROUP_FILTERS[groupKey];

    const mode = options?.mode || 'multiple-choice';
    const sort = options?.sort || groupConfig?.activeSort || 'default';
    const filter = options?.filter || (options?.missedOnly ? 'wrong' : (groupConfig?.stageFilter || 'all'));
    const searchQuery = (options?.searchQuery || groupConfig?.searchQuery || '').trim().toLowerCase();

    // If startFresh is explicitly requested, clear existing checkpoint
    if (options?.startFresh) {
      get().clearDeckCheckpoint(practiceDeckId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(practiceStorageKey);
          localStorage.removeItem(`nutrianki_deck_session_${practiceDeckId}`);
        } catch {}
      }
    }

    // Check if user already has an in-progress session for THIS practice area
    let existingSession: StudySessionState | null = null;
    if (!options?.startFresh) {
      if (activeSession?.practiceArea === subject && !activeSession.isCompleted) {
        existingSession = activeSession;
      } else if (resumeAvailableSession?.practiceArea === subject && !resumeAvailableSession.isCompleted) {
        existingSession = resumeAvailableSession;
      } else {
        existingSession = get().getDeckCheckpoint(practiceDeckId);
        if (!existingSession && typeof window !== 'undefined') {
          try {
            const stored = localStorage.getItem(practiceStorageKey);
            if (stored) {
              const parsed = JSON.parse(stored) as StudySessionState;
              if (parsed.practiceArea === subject && !parsed.isCompleted && (parsed.cardsQueue || []).length > 0) {
                existingSession = parsed;
              }
            }
          } catch {}
        }
      }
    }

    const shouldResume = options?.resume || (Boolean(existingSession) && !options?.startFresh && !options?.missedOnly && filter !== 'wrong' && !searchQuery);

    if (shouldResume && existingSession && (existingSession.currentIndex > 0 || (existingSession.results || []).length > 0)) {
      set({
        activeDeckId: practiceDeckId,
        activeSession: existingSession,
        resumeAvailableSession: null,
        saveStatus: 'idle'
      });
      return;
    }

    // Gather cards strictly belonging to this practice area
    let subjectCards: Flashcard[] = getSubjectCards(subject, decks);

    if (subjectCards.length === 0) {
      throw new Error(`No practice questions found for ${subject}.`);
    }

    // Handle Missed / Wrong answers filter
    if (options?.missedOnly || filter === 'wrong') {
      let logs: any[] = [];
      try {
        logs = await deckService.getReviewLogs();
      } catch {}

      const wrongCards = getSubjectMissedCards(
        subject,
        decks,
        logs,
        existingSession?.results,
        activeSession?.results
      );

      if (wrongCards.length > 0) {
        subjectCards = wrongCards;
      } else {
        throw new Error(`No wrong answers recorded for ${config ? config.shortTitle : subject} yet! All your responses in this subject are correct.`);
      }
    }

    // Apply text search filtering if user entered text
    if (searchQuery) {
      const filteredBySearch = subjectCards.filter(c =>
        (c.front || '').toLowerCase().includes(searchQuery) ||
        (c.back || '').toLowerCase().includes(searchQuery) ||
        (c.rationale || '').toLowerCase().includes(searchQuery) ||
        (c.tags || []).some(t => t.toLowerCase().includes(searchQuery))
      );
      if (filteredBySearch.length > 0) {
        subjectCards = filteredBySearch;
      }
    }

    // Apply group-specific sub-filters (tags)
    if (groupConfig?.filters && groupConfig.filters.length > 0 && !options?.missedOnly && filter !== 'wrong') {
      const enabledFilters = groupConfig.filters.filter(f => f.enabled);
      if (enabledFilters.length < groupConfig.filters.length && enabledFilters.length > 0) {
        const enabledTags = enabledFilters.map(f => f.tag.toLowerCase().trim()).filter(Boolean);
        const filteredByTags = subjectCards.filter(c => {
          const cTags = (c.tags || []).map(t => t.toLowerCase());
          const cFront = (c.front || '').toLowerCase();
          const cBack = (c.back || '').toLowerCase();
          const cRationale = (c.rationale || '').toLowerCase();

          return enabledTags.some(t =>
            cTags.some(tag => tag.includes(t) || t.includes(tag)) ||
            cFront.includes(t) ||
            cBack.includes(t) ||
            cRationale.includes(t)
          );
        });
        if (filteredByTags.length > 0) {
          subjectCards = filteredByTags;
        }
      }
    }

    // Apply progress filter segment (if not already filtered by wrong)
    if (filter !== 'wrong' && !options?.missedOnly) {
      if (filter === 'unseen') {
        const unseen = subjectCards.filter(c => !c.lastReviewedAt || (c.sm2?.repetitions || 0) === 0);
        if (unseen.length > 0) subjectCards = unseen;
      } else if (filter === 'learning') {
        const learning = subjectCards.filter(c => (c.sm2?.repetitions || 0) > 0 && (c.sm2?.interval || 0) < 4);
        if (learning.length > 0) subjectCards = learning;
      } else if (filter === 'developing') {
        const dev = subjectCards.filter(c => (c.sm2?.interval || 0) >= 4 && (c.sm2?.interval || 0) < 21);
        if (dev.length > 0) subjectCards = dev;
      } else if (filter === 'mastered') {
        const mastered = subjectCards.filter(c => (c.sm2?.interval || 0) >= 21 || (c.sm2?.repetitions || 0) >= 4);
        if (mastered.length > 0) subjectCards = mastered;
      } else if (filter === 'due') {
        const now = new Date();
        const due = subjectCards.filter(c => !c.lastReviewedAt || new Date(c.sm2?.dueDate || 0) <= now);
        if (due.length > 0) subjectCards = due;
      }
    }

    // Apply sorting
    if (sort === 'progress-asc') {
      subjectCards.sort((a, b) => (a.sm2?.repetitions || 0) - (b.sm2?.repetitions || 0));
    } else if (sort === 'progress-desc') {
      subjectCards.sort((a, b) => (b.sm2?.repetitions || 0) - (a.sm2?.repetitions || 0));
    } else if (sort === 'difficulty') {
      const diffOrder: Record<string, number> = { hard: 1, medium: 2, easy: 3 };
      subjectCards.sort((a, b) => (diffOrder[a.difficulty || 'medium'] || 2) - (diffOrder[b.difficulty || 'medium'] || 2));
    } else if (sort === 'alphabetical') {
      subjectCards.sort((a, b) => (a.front || '').localeCompare(b.front || ''));
    } else if (sort === 'most-reviewed') {
      subjectCards.sort((a, b) => (b.sm2?.repetitions || 0) - (a.sm2?.repetitions || 0));
    } else {
      subjectCards = shuffleArray(subjectCards);
    }

    const timerDuration = mode === 'blitz-marathon' ? 15 : preferences.timerDuration;
    const sessionId = `practice-${code}-${Date.now()}`;
    const isMissedMode = options?.missedOnly || filter === 'wrong';

    const newSession: StudySessionState = {
      id: sessionId,
      deckId: practiceDeckId,
      deckTitle: isMissedMode
        ? `${config ? config.shortTitle : subject} (Wrong Answers)`
        : (config ? `${config.shortTitle} Practice` : `${subject} Practice`),
      practiceArea: subject,
      activeSort: sort,
      activeFilter: isMissedMode ? 'wrong' : filter,
      searchFilter: searchQuery || undefined,
      sparkleStyle: options?.sparkleStyle || preferences.sparkleStyle || 'clinical',
      mode,
      cardsQueue: subjectCards,
      currentIndex: 0,
      results: [],
      startTime: Date.now(),
      isCompleted: false,
      timerDurationSeconds: timerDuration,
      updatedAt: new Date().toISOString()
    };

    set((state) => ({
      activeDeckId: practiceDeckId,
      activeSession: newSession,
      resumeAvailableSession: null,
      deckCheckpoints: {
        ...state.deckCheckpoints,
        [practiceDeckId]: newSession
      },
      saveStatus: 'idle'
    }));

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(practiceStorageKey, JSON.stringify(newSession));
        localStorage.setItem(`nutrianki_deck_session_${practiceDeckId}`, JSON.stringify(newSession));
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(newSession));
      } catch {}
    }

    if (get().user) {
      syncService.saveSessionCheckpoint(newSession).catch(console.warn);
    }
  },

  updateSessionFilterAndSort: ({ sort, filter, searchQuery, sparkleStyle }) => {
    const { activeSession, decks } = get();
    if (!activeSession) return;

    let sourcePool: Flashcard[] = [];
    if (activeSession.practiceArea) {
      for (const d of decks) {
        for (const c of d.cards || []) {
          if (resolveCardSubject(c, d.category) === activeSession.practiceArea) {
            sourcePool.push({ ...c, deckId: c.deckId || d.id });
          }
        }
      }
    } else if (activeSession.deckId.startsWith('playlist-')) {
      const playlist = get().playlists.find(p => p.id === activeSession.deckId);
      const includedDecks = decks.filter(d => playlist?.deckIds.includes(d.id));
      includedDecks.forEach(d => sourcePool.push(...(d.cards || [])));
    } else {
      const d = decks.find(dk => dk.id === activeSession.deckId);
      sourcePool = d ? [...(d.cards || [])] : [...(activeSession.cardsQueue || [])];
    }

    if (sourcePool.length === 0) sourcePool = [...(activeSession.cardsQueue || [])];

    const effectiveSearch = (searchQuery !== undefined ? searchQuery : activeSession.searchFilter || '').trim().toLowerCase();
    const effectiveFilter = filter !== undefined ? filter : activeSession.activeFilter || 'all';
    const effectiveSort = sort !== undefined ? sort : activeSession.activeSort || 'default';
    const effectiveSparkle = sparkleStyle !== undefined ? sparkleStyle : activeSession.sparkleStyle || 'clinical';

    let filteredCards = [...sourcePool];
    if (effectiveSearch) {
      filteredCards = filteredCards.filter(c =>
        (c.front || '').toLowerCase().includes(effectiveSearch) ||
        (c.back || '').toLowerCase().includes(effectiveSearch) ||
        (c.rationale || '').toLowerCase().includes(effectiveSearch) ||
        (c.tags || []).some(t => t.toLowerCase().includes(effectiveSearch))
      );
    }

    if (effectiveFilter === 'unseen') {
      const unseen = filteredCards.filter(c => !c.lastReviewedAt || (c.sm2?.repetitions || 0) === 0);
      if (unseen.length > 0) filteredCards = unseen;
    } else if (effectiveFilter === 'learning') {
      const learning = filteredCards.filter(c => (c.sm2?.repetitions || 0) > 0 && (c.sm2?.interval || 0) < 4);
      if (learning.length > 0) filteredCards = learning;
    } else if (effectiveFilter === 'developing') {
      const dev = filteredCards.filter(c => (c.sm2?.interval || 0) >= 4 && (c.sm2?.interval || 0) < 21);
      if (dev.length > 0) filteredCards = dev;
    } else if (effectiveFilter === 'mastered') {
      const mastered = filteredCards.filter(c => (c.sm2?.interval || 0) >= 21 || (c.sm2?.repetitions || 0) >= 4);
      if (mastered.length > 0) filteredCards = mastered;
    } else if (effectiveFilter === 'due') {
      const now = new Date();
      const due = filteredCards.filter(c => !c.lastReviewedAt || new Date(c.sm2?.dueDate || 0) <= now);
      if (due.length > 0) filteredCards = due;
    } else if (effectiveFilter === 'wrong') {
      const wrongCardIds = new Set<string>();
      (activeSession.results || [])
        .filter(r => !r.isCorrect || r.rating === 'again' || r.rating === 'hard')
        .forEach(r => wrongCardIds.add(r.cardId));
      const wrong = filteredCards.filter(c => wrongCardIds.has(c.id) || (c.lastReviewedAt && (c.sm2?.repetitions || 0) === 0));
      if (wrong.length > 0) filteredCards = wrong;
    }

    if (effectiveSort === 'progress-asc') {
      filteredCards.sort((a, b) => (a.sm2?.repetitions || 0) - (b.sm2?.repetitions || 0));
    } else if (effectiveSort === 'progress-desc') {
      filteredCards.sort((a, b) => (b.sm2?.repetitions || 0) - (a.sm2?.repetitions || 0));
    } else if (effectiveSort === 'difficulty') {
      const diffOrder: Record<string, number> = { hard: 1, medium: 2, easy: 3 };
      filteredCards.sort((a, b) => (diffOrder[a.difficulty || 'medium'] || 2) - (diffOrder[b.difficulty || 'medium'] || 2));
    } else if (effectiveSort === 'alphabetical') {
      filteredCards.sort((a, b) => (a.front || '').localeCompare(b.front || ''));
    } else if (effectiveSort === 'most-reviewed') {
      filteredCards.sort((a, b) => (b.sm2?.repetitions || 0) - (a.sm2?.repetitions || 0));
    }

    const updatedSession: StudySessionState = {
      ...activeSession,
      cardsQueue: filteredCards.length > 0 ? filteredCards : activeSession.cardsQueue,
      currentIndex: 0,
      activeSort: effectiveSort,
      activeFilter: effectiveFilter,
      searchFilter: effectiveSearch || undefined,
      sparkleStyle: effectiveSparkle,
      updatedAt: new Date().toISOString()
    };

    set({ activeSession: updatedSession });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
        if (updatedSession.practiceArea) {
          const cfg = NDLE_SUBJECT_CONFIGS[updatedSession.practiceArea];
          if (cfg) {
            localStorage.setItem(`nutriboard_practice_session_${cfg.code}`, JSON.stringify(updatedSession));
          }
        }
      } catch {}
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
    if (isCompleted) {
      set((state) => {
        const nextCheckpoints = { ...state.deckCheckpoints };
        if (targetDeckId) delete nextCheckpoints[targetDeckId];
        return {
          activeSession: updatedSession,
          deckCheckpoints: nextCheckpoints,
          resumeAvailableSession: state.resumeAvailableSession?.deckId === targetDeckId ? null : state.resumeAvailableSession,
          saveStatus: 'saving'
        };
      });
    } else {
      set((state) => ({
        activeSession: updatedSession,
        deckCheckpoints: {
          ...state.deckCheckpoints,
          [targetDeckId]: updatedSession
        },
        resumeAvailableSession: updatedSession,
        saveStatus: 'saving'
      }));
    }

    // Checkpoint to localStorage immediately
    if (typeof window !== 'undefined') {
      try {
        if (isCompleted) {
          localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
          if (targetDeckId) {
            localStorage.removeItem(`nutrianki_deck_session_${targetDeckId}`);
          }
        } else {
          localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
          if (targetDeckId) {
            localStorage.setItem(`nutrianki_deck_session_${targetDeckId}`, JSON.stringify(updatedSession));
          }
        }
      } catch {}
    }

    // Persist checkpoint & study log to cloud (Optimization #10: debounced checkpoint & buffered logs)
    if (isCompleted) {
      if (checkpointDebounceTimer) {
        clearTimeout(checkpointDebounceTimer);
        checkpointDebounceTimer = null;
      }
      if (updatedSession.id) {
        syncService.completeStudySession(updatedSession.id).catch(console.warn);
      }
      syncService.flushStudyLogs().catch(console.warn);
      set({ saveStatus: 'saved' });
      setTimeout(() => {
        if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
      }, 1500);
    } else {
      if (checkpointDebounceTimer) clearTimeout(checkpointDebounceTimer);
      checkpointDebounceTimer = setTimeout(() => {
        checkpointDebounceTimer = null;
        syncService.saveSessionCheckpoint(updatedSession).then(() => {
          set({ saveStatus: 'saved' });
          setTimeout(() => {
            if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
          }, 1500);
        }).catch(() => {
          set({ saveStatus: 'saved' });
        });
      }, 4000);
    }

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
    if (activeSession.practiceArea) {
      for (const d of decks) {
        for (const c of d.cards || []) {
          if (resolveCardSubject(c, d.category) === activeSession.practiceArea) {
            sourceCards.push({ ...c, deckId: c.deckId || d.id });
          }
        }
      }
    } else if (activeSession.deckId.startsWith('playlist-')) {
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
      const missedCardIds = (activeSession.results || [])
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
        if (restartedSession.practiceArea) {
          const cfg = NDLE_SUBJECT_CONFIGS[restartedSession.practiceArea];
          if (cfg) {
            localStorage.setItem(`nutriboard_practice_session_${cfg.code}`, JSON.stringify(restartedSession));
          }
        }
      } catch {}
    }

    syncService.saveSessionCheckpoint(restartedSession).catch(console.error);
  },

  endStudySession: () => {
    const { activeSession } = get();
    if (checkpointDebounceTimer) {
      clearTimeout(checkpointDebounceTimer);
      checkpointDebounceTimer = null;
    }
    if (activeSession && !activeSession.isCompleted && (activeSession.currentIndex > 0 || (activeSession.results || []).length > 0)) {
      // Save in-progress session checkpoint before closing
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(activeSession));
          localStorage.setItem(`nutrianki_deck_session_${activeSession.deckId}`, JSON.stringify(activeSession));
          if (activeSession.practiceArea) {
            const cfg = NDLE_SUBJECT_CONFIGS[activeSession.practiceArea];
            if (cfg) {
              localStorage.setItem(`nutriboard_practice_session_${cfg.code}`, JSON.stringify(activeSession));
            }
          }
        } catch {}
      }
      syncService.saveSessionCheckpoint(activeSession).catch(console.error);
      // Preserve resumeAvailableSession and deckCheckpoints so the user sees resume options
      set((state) => ({
        activeSession: null,
        resumeAvailableSession: activeSession,
        deckCheckpoints: {
          ...state.deckCheckpoints,
          [activeSession.deckId]: activeSession
        }
      }));
    } else {
      if (activeSession?.deckId) {
        get().clearDeckCheckpoint(activeSession.deckId);
      }
      if (activeSession?.practiceArea && typeof window !== 'undefined') {
        try {
          const cfg = NDLE_SUBJECT_CONFIGS[activeSession.practiceArea];
          if (cfg) {
            localStorage.removeItem(`nutriboard_practice_session_${cfg.code}`);
          }
        } catch {}
      }
      set({ activeSession: null });
    }
    syncService.flushStudyLogs().catch(console.warn);
    get().loadDecks();
  }
}));
