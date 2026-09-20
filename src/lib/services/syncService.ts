import { getSupabaseClient } from '@/lib/supabase/client';
import { Deck, Flashcard, DeckPlaylist, UserPreferences, StudySessionState, StudyLogEntry } from '@/types';
import { computeDeckStats } from '@/lib/services/flashcardService';

export interface CloudUser {
  id: string;
  email?: string;
}

export class SyncService {
  /**
   * Retrieves the currently authenticated Supabase user, or null.
   */
  async getCurrentUser(): Promise<CloudUser | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      return { id: user.id, email: user.email };
    } catch {
      return null;
    }
  }

  /**
   * Pulls all decks, cards, and playlists from Supabase for the current user.
   */
  async pullFromCloud(): Promise<{ decks: Deck[]; playlists: DeckPlaylist[]; isEmpty: boolean } | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const user = await this.getCurrentUser();
    if (!user) return null;

    try {
      // 1. Fetch decks
      const { data: cloudDecks, error: decksErr } = await supabase
        .from('decks')
        .select('*')
        .order('updated_at', { ascending: false });

      if (decksErr) {
        console.error('Error fetching cloud decks:', decksErr);
        return null;
      }

      // 2. Fetch cards
      const { data: cloudCards, error: cardsErr } = await supabase
        .from('flashcards')
        .select('*');

      if (cardsErr) {
        console.error('Error fetching cloud cards:', cardsErr);
        return null;
      }

      // 3. Fetch playlists
      const { data: cloudPlaylists, error: playlistsErr } = await supabase
        .from('playlists')
        .select('*')
        .order('updated_at', { ascending: false });

      if (playlistsErr) {
        console.error('Error fetching cloud playlists:', playlistsErr);
      }

      // Group cards by deckId
      const cardsByDeck = new Map<string, Flashcard[]>();
      for (const raw of cloudCards || []) {
        const card: Flashcard = {
          id: raw.id,
          deckId: raw.deck_id,
          front: raw.front,
          back: raw.back,
          rationale: raw.rationale || '',
          options: Array.isArray(raw.options) ? raw.options : undefined,
          tags: Array.isArray(raw.tags) ? raw.tags : [],
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
      const decks: Deck[] = (cloudDecks || []).map((raw) => {
        const cards = cardsByDeck.get(raw.id) || [];
        return {
          id: raw.id,
          title: raw.title,
          description: raw.description || '',
          category: raw.category,
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
      const playlists: DeckPlaylist[] = (cloudPlaylists || []).map((raw) => ({
        id: raw.id,
        title: raw.title,
        description: raw.description || '',
        deckIds: Array.isArray(raw.deck_ids) ? raw.deck_ids : [],
        color: raw.color || '#7FA98B',
        icon: raw.icon || '🎵',
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
      }));

      return { decks, playlists, isEmpty: decks.length === 0 && playlists.length === 0 };
    } catch (err) {
      console.error('Failed to pull from cloud:', err);
      return null;
    }
  }

  /**
   * Pushes a single deck (and its flashcards) to Supabase.
   */
  async pushDeckToCloud(deck: Deck): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const user = await this.getCurrentUser();
    if (!user) return false;

    try {
      // 1. Upsert deck
      const { error: deckErr } = await supabase.from('decks').upsert(
        {
          id: deck.id,
          user_id: user.id,
          title: deck.title,
          description: deck.description || '',
          category: deck.category,
          icon: deck.icon,
          color: deck.color,
          tags: deck.tags || [],
          updated_at: deck.updatedAt || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (deckErr) {
        console.error('Failed to upsert deck:', deckErr);
        return false;
      }

      // 2. Delete any existing cards for this deck that are not in the new deck.cards list
      const currentCardIds = new Set((deck.cards || []).map((c) => c.id));
      const { data: remoteCards } = await supabase
        .from('flashcards')
        .select('id')
        .eq('deck_id', deck.id);

      if (remoteCards && remoteCards.length > 0) {
        const toDelete = remoteCards.filter((r) => !currentCardIds.has(r.id)).map((r) => r.id);
        if (toDelete.length > 0) {
          await supabase.from('flashcards').delete().in('id', toDelete);
        }
      }

      // 3. Upsert cards if any
      if (deck.cards && deck.cards.length > 0) {
        const rows = deck.cards.map((c) => ({
          id: c.id,
          deck_id: deck.id,
          user_id: user.id,
          front: c.front,
          back: c.back,
          rationale: c.rationale || '',
          options: c.options || [],
          tags: c.tags || [],
          difficulty: c.difficulty || null,
          leitner_box: c.leitnerBox || 1,
          user_notes: c.userNotes || '',
          sm2: c.sm2,
          last_reviewed_at: c.lastReviewedAt || null,
          updated_at: c.updatedAt || new Date().toISOString(),
        }));

        // Batch in chunks of 100 to avoid payload size limit
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error: cardsErr } = await supabase
            .from('flashcards')
            .upsert(chunk, { onConflict: 'id' });

          if (cardsErr) {
            console.error('Failed to upsert cards chunk:', cardsErr);
            return false;
          }
        }
      }

      return true;
    } catch (err) {
      console.error('Error pushing deck to cloud:', err);
      return false;
    }
  }

  /**
   * Pushes a single card's updated review state to Supabase.
   */
  async syncCardReview(deckId: string, card: Flashcard): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const user = await this.getCurrentUser();
    if (!user) return false;

    try {
      const { error } = await supabase.from('flashcards').upsert(
        {
          id: card.id,
          deck_id: deckId,
          user_id: user.id,
          front: card.front,
          back: card.back,
          rationale: card.rationale || '',
          options: card.options || [],
          tags: card.tags || [],
          difficulty: card.difficulty || null,
          leitner_box: card.leitnerBox || 1,
          user_notes: card.userNotes || '',
          sm2: card.sm2,
          last_reviewed_at: card.lastReviewedAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error('Failed to sync card review:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error syncing card review:', err);
      return false;
    }
  }

  /**
   * Deletes a deck from Supabase (cascades to flashcards).
   */
  async deleteDeckFromCloud(deckId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const user = await this.getCurrentUser();
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('decks')
        .delete()
        .eq('id', deckId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to delete cloud deck:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error deleting cloud deck:', err);
      return false;
    }
  }

  /**
   * Pushes playlists to Supabase.
   */
  async pushPlaylistsToCloud(playlists: DeckPlaylist[]): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const user = await this.getCurrentUser();
    if (!user) return false;

    try {
      const rows = playlists.map((p) => ({
        id: p.id,
        user_id: user.id,
        title: p.title,
        description: p.description || '',
        deck_ids: p.deckIds || [],
        color: p.color,
        icon: p.icon,
        updated_at: p.updatedAt || new Date().toISOString(),
      }));

      if (rows.length === 0) return true;

      const { error } = await supabase
        .from('playlists')
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        console.error('Failed to upsert playlists:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error syncing playlists:', err);
      return false;
    }
  }

  /**
   * Deletes a playlist from Supabase.
   */
  async deletePlaylistFromCloud(playlistId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const user = await this.getCurrentUser();
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)
        .eq('user_id', user.id);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Pulls user preferences from Supabase.
   */
  async pullPreferences(): Promise<UserPreferences | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const user = await this.getCurrentUser();
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single();

      if (error || !data) return null;
      return data.preferences as UserPreferences;
    } catch {
      return null;
    }
  }

  /**
   * Pushes user preferences to Supabase.
   */
  async pushPreferences(preferences: UserPreferences): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const user = await this.getCurrentUser();
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            preferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Saves an active study session checkpoint to Supabase.
   */
  async saveSessionCheckpoint(session: StudySessionState): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const user = await this.getCurrentUser();
    if (!user) return false;

    const sessionId = session.id || `sess-${session.deckId}-${session.startTime}`;

    try {
      const { error } = await supabase.from('study_sessions').upsert(
        {
          id: sessionId,
          user_id: user.id,
          deck_id: session.deckId,
          deck_title: session.deckTitle,
          mode: session.mode,
          current_index: session.currentIndex,
          is_completed: session.isCompleted,
          timer_duration_seconds: session.timerDurationSeconds || 0,
          cards_queue: session.cardsQueue,
          results: session.results,
          start_time: session.startTime,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.warn('Failed to save study session checkpoint to Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Network error saving study session checkpoint:', err);
      return false;
    }
  }

  /**
   * Retrieves the most recent active / in-progress study session for the user.
   */
  async fetchActiveSession(): Promise<StudySessionState | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const user = await this.getCurrentUser();
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        deckId: data.deck_id,
        deckTitle: data.deck_title,
        mode: data.mode,
        currentIndex: data.current_index,
        isCompleted: data.is_completed,
        timerDurationSeconds: data.timer_duration_seconds,
        cardsQueue: Array.isArray(data.cards_queue) ? data.cards_queue : [],
        results: Array.isArray(data.results) ? data.results : [],
        startTime: Number(data.start_time) || Date.now(),
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * Marks a study session completed in Supabase.
   */
  async completeStudySession(sessionId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const user = await this.getCurrentUser();
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('study_sessions')
        .update({
          is_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Pushes a completed review entry / study log to Supabase for historical analytics.
   */
  async pushStudyLog(log: StudyLogEntry): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const user = await this.getCurrentUser();
    if (!user) return false;

    try {
      const { error } = await supabase.from('study_logs').insert({
        id: log.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: user.id,
        card_id: log.cardId,
        deck_id: log.deckId,
        mode: log.mode,
        rating: log.rating || null,
        user_answer: log.userAnswer || '',
        is_correct: log.isCorrect,
        time_spent_seconds: log.timeSpentSeconds || 0,
        verdict: log.verdict || '',
        created_at: log.createdAt || new Date().toISOString(),
      });

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Pulls the user's historical study logs from Supabase.
   */
  async pullStudyLogs(): Promise<StudyLogEntry[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const user = await this.getCurrentUser();
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('study_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error || !data) return [];

      return data.map((d) => ({
        id: d.id,
        userId: d.user_id,
        cardId: d.card_id,
        deckId: d.deck_id,
        mode: d.mode,
        rating: d.rating,
        userAnswer: d.user_answer,
        isCorrect: d.is_correct,
        timeSpentSeconds: d.time_spent_seconds,
        verdict: d.verdict,
        createdAt: d.created_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Uploads all current local decks & playlists to cloud (for initial migration).
   */
  async migrateLocalToCloud(
    decks: Deck[],
    playlists: DeckPlaylist[]
  ): Promise<{ success: boolean; decksUploaded: number }> {
    const user = await this.getCurrentUser();
    if (!user) return { success: false, decksUploaded: 0 };

    let uploaded = 0;
    for (const deck of decks) {
      const ok = await this.pushDeckToCloud(deck);
      if (ok) uploaded++;
    }

    if (playlists.length > 0) {
      await this.pushPlaylistsToCloud(playlists);
    }

    return { success: true, decksUploaded: uploaded };
  }

  /**
   * MASTER SYNC: Overwrites cloud database with this device's complete dataset.
   * Cleans out any obsolete cloud decks/cards/playlists and pushes local state.
   */
  async overwriteCloudWithLocalData(
    decks: Deck[],
    playlists: DeckPlaylist[],
    preferences?: UserPreferences,
    logs?: StudyLogEntry[]
  ): Promise<{ success: boolean; decksUploaded: number; totalCards: number }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, decksUploaded: 0, totalCards: 0 };

    const user = await this.getCurrentUser();
    if (!user) return { success: false, decksUploaded: 0, totalCards: 0 };

    try {
      // 1. Delete any cloud decks not present on this device
      const localDeckIds = new Set(decks.map((d) => d.id));
      const { data: cloudDecks } = await supabase
        .from('decks')
        .select('id')
        .eq('user_id', user.id);

      if (cloudDecks && cloudDecks.length > 0) {
        const decksToDelete = cloudDecks
          .filter((d) => !localDeckIds.has(d.id))
          .map((d) => d.id);

        if (decksToDelete.length > 0) {
          await supabase.from('decks').delete().in('id', decksToDelete);
        }
      }

      // 2. Delete any cloud playlists not present on this device
      const localPlaylistIds = new Set(playlists.map((p) => p.id));
      const { data: cloudPlaylists } = await supabase
        .from('playlists')
        .select('id')
        .eq('user_id', user.id);

      if (cloudPlaylists && cloudPlaylists.length > 0) {
        const playlistsToDelete = cloudPlaylists
          .filter((p) => !localPlaylistIds.has(p.id))
          .map((p) => p.id);

        if (playlistsToDelete.length > 0) {
          await supabase.from('playlists').delete().in('id', playlistsToDelete);
        }
      }

      // 3. Upsert all local decks & flashcards
      let decksUploaded = 0;
      let totalCards = 0;

      for (const deck of decks) {
        const ok = await this.pushDeckToCloud(deck);
        if (ok) {
          decksUploaded++;
          totalCards += (deck.cards || []).length;
        }
      }

      // 4. Upsert playlists
      if (playlists.length > 0) {
        await this.pushPlaylistsToCloud(playlists);
      }

      // 5. Upsert preferences
      if (preferences) {
        await this.pushPreferences(preferences);
      }

      // 6. Upsert logs in chunks if present
      if (logs && logs.length > 0) {
        const logRows = logs.map((l) => ({
          id: l.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          user_id: user.id,
          card_id: l.cardId,
          deck_id: l.deckId,
          mode: l.mode,
          rating: l.rating || null,
          user_answer: l.userAnswer || '',
          is_correct: l.isCorrect,
          time_spent_seconds: l.timeSpentSeconds || 0,
          verdict: l.verdict || '',
          created_at: l.createdAt || l.timestamp || new Date().toISOString(),
        }));

        for (let i = 0; i < logRows.length; i += 100) {
          const chunk = logRows.slice(i, i + 100);
          await supabase.from('study_logs').upsert(chunk, { onConflict: 'id' });
        }
      }

      return { success: true, decksUploaded, totalCards };
    } catch (err) {
      console.error('Error overwriting cloud data:', err);
      return { success: false, decksUploaded: 0, totalCards: 0 };
    }
  }
}

export const syncService = new SyncService();
