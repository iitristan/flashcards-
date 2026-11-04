/* eslint-disable @typescript-eslint/no-explicit-any */
import { Deck, Flashcard, DeckPlaylist, UserPreferences, StudySessionState, StudyLogEntry } from '@/types';
import { computeDeckStats } from '@/lib/services/flashcardService';

export interface CloudUser {
  id: string;
  email?: string;
}

export class SyncService {
  public static readonly SHARED_WORKSPACE_UUID = '00000000-0000-0000-0000-000000000001';

  private cachedUser: CloudUser | null = {
    id: SyncService.SHARED_WORKSPACE_UUID,
    email: 'student@nutrianki.local',
  };

  private pendingStudyLogs: StudyLogEntry[] = [];
  private logFlushTimeout: any = null;

  public checkQuotaError(_errMessage?: string): boolean {
    return false;
  }

  public isCloudAvailable(): boolean {
    return true;
  }

  clearUserCache() {
    this.cachedUser = {
      id: SyncService.SHARED_WORKSPACE_UUID,
      email: 'student@nutrianki.local',
    };
  }

  async getCurrentUser(): Promise<CloudUser | null> {
    if (this.cachedUser) {
      return this.cachedUser;
    }
    this.cachedUser = {
      id: SyncService.SHARED_WORKSPACE_UUID,
      email: 'student@nutrianki.local',
    };
    return this.cachedUser;
  }

  /**
   * Pulls all decks, cards, playlists, preferences, and sessions from PostgreSQL.
   */
  async pullFromCloud(): Promise<{ decks: Deck[]; playlists: DeckPlaylist[]; isEmpty: boolean } | null> {
    try {
      const res = await fetch('/api/sync?action=pullAll', { cache: 'no-store' });
      if (!res.ok) {
        console.warn('Failed to pull from /api/sync, trying /api/neon/decks:', res.statusText);
        const neonRes = await fetch('/api/neon/decks', { cache: 'no-store' });
        if (!neonRes.ok) {
          console.error('Failed to pull from PostgreSQL API:', neonRes.statusText);
          return null;
        }
        const neonData = await neonRes.json();
        const rawDecks = neonData.decks || [];
        const rawCards = neonData.cards || [];
        const cardsByDeck = new Map<string, Flashcard[]>();
        for (const raw of rawCards) {
          if (!raw.front?.trim() && !raw.back?.trim()) continue;
          const card: Flashcard = {
            id: raw.id,
            deckId: raw.deck_id,
            front: raw.front,
            back: raw.back,
            rationale: raw.rationale || '',
            options: Array.isArray(raw.options) ? raw.options : undefined,
            tags: Array.isArray(raw.tags) ? raw.tags : [],
            ndleSubject: raw.ndle_subject || undefined,
            difficulty: raw.difficulty || undefined,
            leitnerBox: raw.leitner_box || 1,
            userNotes: raw.user_notes || '',
            sm2: raw.sm2 || {
              interval: 0,
              easeFactor: 2.5,
              repetitions: 0,
              dueDate: new Date().toISOString(),
            },
            lastReviewedAt: raw.last_reviewed_at || null,
            createdAt: raw.created_at,
            updatedAt: raw.updated_at,
          };
          const list = cardsByDeck.get(raw.deck_id) || [];
          list.push(card);
          cardsByDeck.set(raw.deck_id, list);
        }

        const decks: Deck[] = rawDecks.map((raw: any) => {
          const cards = cardsByDeck.get(raw.id) || [];
          return {
            id: raw.id,
            title: raw.title,
            description: raw.description || '',
            category: raw.category || 'Clinical Nutrition',
            icon: raw.icon || '🥑',
            color: raw.color || '#7FA98B',
            tags: Array.isArray(raw.tags) ? raw.tags : [],
            cards,
            stats: computeDeckStats(cards),
            createdAt: raw.created_at,
            updatedAt: raw.updated_at,
          };
        });

        return {
          decks,
          playlists: [],
          isEmpty: decks.length === 0,
        };
      }

      const json = await res.json();
      if (!json.ok || !json.data) {
        return null;
      }

      const { decks: rawDecks = [], cards: rawCards = [], playlists: rawPlaylists = [] } = json.data;

      // Group cards by deckId
      const cardsByDeck = new Map<string, Flashcard[]>();
      for (const raw of rawCards) {
        if (!raw.front?.trim() && !raw.back?.trim()) {
          continue;
        }

        const card: Flashcard = {
          id: raw.id,
          deckId: raw.deck_id,
          front: raw.front,
          back: raw.back,
          rationale: raw.rationale || '',
          options: Array.isArray(raw.options) ? raw.options : undefined,
          tags: Array.isArray(raw.tags) ? raw.tags : [],
          ndleSubject: raw.ndle_subject || undefined,
          difficulty: raw.difficulty || undefined,
          leitnerBox: raw.leitner_box || 1,
          userNotes: raw.user_notes || '',
          sm2: raw.sm2 || {
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            dueDate: new Date().toISOString(),
          },
          lastReviewedAt: raw.last_reviewed_at || null,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at,
        };

        const list = cardsByDeck.get(raw.deck_id) || [];
        list.push(card);
        cardsByDeck.set(raw.deck_id, list);
      }

      // Build Deck list
      const decks: Deck[] = rawDecks.map((raw: any) => {
        const cards = cardsByDeck.get(raw.id) || [];
        const cleanDescription =
          cards.length === 0 && /with \d+ cards/i.test(raw.description || '')
            ? 'No flashcards added to this deck yet.'
            : raw.description || '';

        return {
          id: raw.id,
          title: raw.title,
          description: cleanDescription,
          category: raw.category || 'Clinical Nutrition',
          icon: raw.icon || '🥑',
          color: raw.color || '#7FA98B',
          tags: Array.isArray(raw.tags) ? raw.tags : [],
          cards,
          stats: computeDeckStats(cards),
          createdAt: raw.created_at,
          updatedAt: raw.updated_at,
        };
      });

      // Build Playlist list
      const playlists: DeckPlaylist[] = rawPlaylists.map((raw: any) => ({
        id: raw.id,
        title: raw.title,
        description: raw.description || '',
        deckIds: Array.isArray(raw.deck_ids) ? raw.deck_ids : [],
        color: raw.color || '#7FA98B',
        icon: raw.icon || '🎵',
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
      }));

      return {
        decks,
        playlists,
        isEmpty: decks.length === 0,
      };
    } catch (err) {
      console.error('[SyncService] Error in pullFromCloud:', err);
      return null;
    }
  }

  /**
   * Pushes a single deck (and its cards) to PostgreSQL.
   */
  async pushDeckToCloud(deck: Deck): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch('/api/neon/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deck),
      });
      if (res.ok) {
        return { ok: true };
      }
    } catch {}

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pushDeck',
          payload: { deck },
        }),
      });
      const data = await res.json();
      return { ok: Boolean(data.ok), error: data.error };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Updates Leitner Box and SM2 Spaced Repetition stats for a reviewed card.
   */
  async syncCardReview(deckId: string, card: Flashcard): Promise<boolean> {
    try {
      const res = await fetch('/api/neon/decks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckId, card }),
      });
      if (res.ok) return true;
    } catch {}

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'syncCardReview',
          payload: { deckId, card },
        }),
      });
      const data = await res.json();
      return Boolean(data.ok);
    } catch {
      return false;
    }
  }

  /**
   * Deletes a deck from PostgreSQL.
   */
  async deleteDeckFromCloud(deckId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/neon/decks?id=${encodeURIComponent(deckId)}`, {
        method: 'DELETE',
      });
      if (res.ok) return true;
    } catch {}

    try {
      const res = await fetch(`/api/sync?action=deleteDeck&id=${encodeURIComponent(deckId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      return Boolean(data.ok);
    } catch {
      return false;
    }
  }

  /**
   * Pushes all playlists to PostgreSQL.
   */
  async pushPlaylistsToCloud(playlists: DeckPlaylist[]): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pushPlaylists',
          payload: { playlists },
        }),
      });
      const data = await res.json();
      return Boolean(data.ok);
    } catch {
      return false;
    }
  }

  /**
   * Deletes a playlist from PostgreSQL.
   */
  async deletePlaylistFromCloud(playlistId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/sync?action=deletePlaylist&id=${encodeURIComponent(playlistId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      return Boolean(data.ok);
    } catch {
      return false;
    }
  }

  /**
   * Pulls user preferences from PostgreSQL.
   */
  async pullPreferences(): Promise<UserPreferences | null> {
    try {
      const res = await fetch('/api/sync?action=pullAll', { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data?.preferences || null;
    } catch {
      return null;
    }
  }

  /**
   * Pushes user preferences to PostgreSQL.
   */
  async pushPreferences(preferences: UserPreferences): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pushPreferences',
          payload: { preferences },
        }),
      });
      const data = await res.json();
      return Boolean(data.ok);
    } catch {
      return false;
    }
  }

  /**
   * Saves study session progress checkpoint.
   */
  async saveSessionCheckpoint(session: StudySessionState): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveSession',
          payload: { session },
        }),
      });
      const data = await res.json();
      return Boolean(data.ok);
    } catch {
      return false;
    }
  }

  /**
   * Fetches active study session from PostgreSQL.
   */
  async fetchActiveSession(): Promise<StudySessionState | null> {
    try {
      const res = await fetch('/api/sync?action=pullAll', { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json();
      const raw = json?.data?.activeSession;
      if (!raw) return null;

      return {
        id: raw.id,
        deckId: raw.deck_id,
        deckTitle: raw.deck_title,
        mode: raw.mode,
        currentIndex: raw.current_index,
        isCompleted: raw.is_completed,
        timerDurationSeconds: raw.timer_duration_seconds,
        cardsQueue: Array.isArray(raw.cards_queue) ? raw.cards_queue : [],
        results: Array.isArray(raw.results) ? raw.results : [],
        startTime: Number(raw.start_time) || Date.now(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Marks study session as completed.
   */
  async completeStudySession(sessionId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'completeSession',
          payload: { sessionId },
        }),
      });
      const data = await res.json();
      return Boolean(data.ok);
    } catch {
      return false;
    }
  }

  /**
   * Pushes a batch of study logs to PostgreSQL.
   */
  async pushStudyLogs(logs: StudyLogEntry[]): Promise<boolean> {
    if (!logs || logs.length === 0) return true;
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pushStudyLogs',
          payload: { logs },
        }),
      });
      const data = await res.json();
      return Boolean(data.ok);
    } catch {
      return false;
    }
  }

  async flushStudyLogs(): Promise<void> {
    if (this.logFlushTimeout) {
      clearTimeout(this.logFlushTimeout);
      this.logFlushTimeout = null;
    }
    if (this.pendingStudyLogs.length === 0) return;

    const toFlush = [...this.pendingStudyLogs];
    this.pendingStudyLogs = [];
    await this.pushStudyLogs(toFlush);
  }

  async pushStudyLog(log: StudyLogEntry): Promise<boolean> {
    this.pendingStudyLogs.push(log);
    if (!this.logFlushTimeout) {
      this.logFlushTimeout = setTimeout(() => {
        this.flushStudyLogs().catch(console.error);
      }, 2000);
    }
    return true;
  }

  /**
   * Pulls study logs from PostgreSQL.
   */
  async pullStudyLogs(since?: string): Promise<StudyLogEntry[]> {
    try {
      const url = `/api/sync?action=pullLogs${since ? `&since=${encodeURIComponent(since)}` : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return [];
      const json = await res.json();
      const rows = json.logs || [];

      return rows.map((r: any) => ({
        id: r.id,
        cardId: r.card_id,
        deckId: r.deck_id,
        mode: r.mode,
        rating: r.rating,
        userAnswer: r.user_answer,
        isCorrect: r.is_correct,
        timeSpentSeconds: r.time_spent_seconds,
        verdict: r.verdict,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  }

  async migrateLocalToCloud(
    decks: Deck[],
    playlists: DeckPlaylist[]
  ): Promise<{ success: boolean; decksUploaded: number }> {
    let uploaded = 0;
    for (const deck of decks) {
      const res = await this.pushDeckToCloud(deck);
      if (res.ok) uploaded++;
    }
    if (playlists.length > 0) {
      await this.pushPlaylistsToCloud(playlists);
    }
    return { success: true, decksUploaded: uploaded };
  }

  async overwriteCloudWithLocalData(
    decks: Deck[],
    playlists: DeckPlaylist[],
    preferences?: UserPreferences,
    logs?: StudyLogEntry[]
  ): Promise<{ success: boolean; decksUploaded: number; totalCards: number; error?: string }> {
    try {
      let uploaded = 0;
      let totalCards = 0;
      for (const deck of decks) {
        const res = await this.pushDeckToCloud(deck);
        if (res.ok) {
          uploaded++;
          totalCards += deck.cards.length;
        }
      }
      if (playlists.length > 0) {
        await this.pushPlaylistsToCloud(playlists);
      }
      if (preferences) {
        await this.pushPreferences(preferences);
      }
      if (logs && logs.length > 0) {
        await this.pushStudyLogs(logs);
      }
      return { success: true, decksUploaded: uploaded, totalCards };
    } catch (err: any) {
      return { success: false, decksUploaded: 0, totalCards: 0, error: err.message };
    }
  }
}

export const syncService = new SyncService();
