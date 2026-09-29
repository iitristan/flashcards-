/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseClient } from '@/lib/supabase/client';
import { Deck, Flashcard, DeckPlaylist, UserPreferences, StudySessionState, StudyLogEntry } from '@/types';
import { computeDeckStats } from '@/lib/services/flashcardService';

export interface CloudUser {
  id: string;
  email?: string;
}


export class SyncService {
  public static readonly SHARED_WORKSPACE_UUID = '00000000-0000-0000-0000-000000000001';

  /**
   * Helper to format user ID for database operations.
   * Ensures all devices and users utilize the same shared database.
   */
  private getDbUserId(_user?: CloudUser | null): string {
    void _user;
    return SyncService.SHARED_WORKSPACE_UUID;
  }

  private cachedUser: CloudUser | null = null;

  /**
   * Clears cached user state (e.g. on auth state change or sign out).
   */
  clearUserCache() {
    this.cachedUser = null;
  }

  /**
   * Retrieves the currently authenticated Supabase user, or provides a zero-login shared workspace user.
   */
  async getCurrentUser(): Promise<CloudUser | null> {
    if (this.cachedUser) {
      return this.cachedUser;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('[SyncService] Supabase client is not available. Please verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel or .env.local');
      return null;
    }

    try {
      // 1. Check active session stored locally (fast, avoids unnecessary network roundtrips)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        this.cachedUser = { id: session.user.id, email: session.user.email };
        return this.cachedUser;
      }
    } catch (e) {
      console.warn('[SyncService] Supabase Auth check skipped:', e);
    }

    // 2. Zero-login Shared Workspace Profile (Always active, no login required)
    this.cachedUser = { id: SyncService.SHARED_WORKSPACE_UUID, email: 'shared@nutriboard.cloud' };
    return this.cachedUser;
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
      // 1. Fetch decks (paginated) — always fetch full deck registry so we never falsely think decks are missing
      const cloudDecks: Record<string, any>[] = [];
      let deckPage = 0;
      const deckColumns = 'id,title,description,category,icon,color,tags,created_at,updated_at';
      while (true) {
        const { data: chunk, error: chunkErr } = await supabase
          .from('decks')
          .select(deckColumns)
          .order('updated_at', { ascending: false })
          .range(deckPage * 1000, (deckPage + 1) * 1000 - 1);

        if (chunkErr) {
          console.error('Error fetching cloud decks:', chunkErr);
          break;
        }
        if (!chunk || chunk.length === 0) break;
        cloudDecks.push(...chunk);
        if (chunk.length < 1000) break;
        deckPage++;
      }

      // 2. Fetch all cards with pagination — explicit columns to reduce payload
      const cloudCards: Record<string, any>[] = [];
      let cardPage = 0;
      const cardColumns = 'id,deck_id,front,back,rationale,options,tags,ndle_subject,difficulty,leitner_box,user_notes,sm2,last_reviewed_at,created_at,updated_at';
      const fallbackCardColumns = 'id,deck_id,front,back,rationale,options,tags,difficulty,leitner_box,user_notes,sm2,last_reviewed_at,created_at,updated_at';
      let useFallbackColumns = false;

      while (true) {
        const cols = useFallbackColumns ? fallbackCardColumns : cardColumns;
        const res: { data: any[] | null; error: any } = await supabase
          .from('flashcards')
          .select(cols as any)
          .range(cardPage * 1000, (cardPage + 1) * 1000 - 1);
        let chunk = res.data;
        let cardsErr = res.error;

        if (cardsErr && (cardsErr.message?.includes('ndle_subject') || cardsErr.message?.includes('column'))) {
          useFallbackColumns = true;
          const retry: { data: any[] | null; error: any } = await supabase
            .from('flashcards')
            .select(fallbackCardColumns as any)
            .range(cardPage * 1000, (cardPage + 1) * 1000 - 1);
          chunk = retry.data;
          cardsErr = retry.error;
        }

        if (cardsErr) {
          console.error(`Error fetching cloud cards chunk at page ${cardPage}:`, cardsErr);
          break;
        }

        if (!chunk || chunk.length === 0) break;
        cloudCards.push(...chunk);
        if (chunk.length < 1000) break;
        cardPage++;
      }

      // 3. Fetch playlists (paginated) — explicit columns
      const cloudPlaylists: Record<string, any>[] = [];
      let playlistPage = 0;
      const playlistColumns = 'id,title,description,deck_ids,color,icon,created_at,updated_at';
      while (true) {
        const { data: chunk, error: playlistsErr } = await supabase
          .from('playlists')
          .select(playlistColumns)
          .order('updated_at', { ascending: false })
          .range(playlistPage * 1000, (playlistPage + 1) * 1000 - 1);

        if (playlistsErr) {
          console.error('Error fetching cloud playlists:', playlistsErr);
          break;
        }
        if (!chunk || chunk.length === 0) break;
        cloudPlaylists.push(...chunk);
        if (chunk.length < 1000) break;
        playlistPage++;
      }

      // Group cards by deckId
      const cardsByDeck = new Map<string, Flashcard[]>();
      for (const raw of cloudCards || []) {
        if (!raw.front?.trim() && !raw.back?.trim()) {
          continue; // Filter out blank cards with no content
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
      const decks: Deck[] = (cloudDecks || []).map((raw) => {
        const cards = cardsByDeck.get(raw.id) || [];
        const cleanDescription =
          cards.length === 0 && /with \d+ cards/i.test(raw.description || '')
            ? 'No flashcards added to this deck yet.'
            : raw.description || '';

        return {
          id: raw.id,
          title: raw.title,
          description: cleanDescription,
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
  async pushDeckToCloud(deck: Deck): Promise<{ ok: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      const msg = 'Supabase client is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel Environment Variables.';
      console.warn('[SyncService]', msg);
      return { ok: false, error: msg };
    }

    const user = await this.getCurrentUser();
    const dbUserId = this.getDbUserId(user);

    try {
      console.log(`[SyncService] Upserting deck "${deck.title}" (${deck.id}) to Cloud...`);

      // 1. Upsert deck with auto-fallback if user_id schema constraint occurs
      const deckPayload: Record<string, any> = {
        id: deck.id,
        title: deck.title,
        description: deck.description || '',
        category: deck.category || 'Clinical Nutrition',
        icon: deck.icon || '🥑',
        color: deck.color || '#7FA98B',
        tags: deck.tags || [],
        updated_at: deck.updatedAt || new Date().toISOString(),
      };
      if (dbUserId) {
        deckPayload.user_id = dbUserId;
      } else {
        deckPayload.user_id = null;
      }

      let { error: deckErr } = await supabase.from('decks').upsert(deckPayload, { onConflict: 'id' });

      if (deckErr && (deckErr.message.includes('user_id') || deckErr.code === '23502' || deckErr.code === '23503')) {
        console.warn('[SyncService] Retrying deck upsert without user_id column...');
        delete deckPayload.user_id;
        const retry = await supabase.from('decks').upsert(deckPayload, { onConflict: 'id' });
        deckErr = retry.error;
      }

      if (deckErr) {
        const errorDetail = `[Deck Upsert Error]: ${deckErr.message} (${deckErr.code || 'unknown code'}). Hint: ${deckErr.hint || 'Check if supabase/schema.sql was run in Supabase SQL editor.'}`;
        console.error('[SyncService] Failed to upsert deck:', errorDetail, deckErr);
        return { ok: false, error: errorDetail };
      }

      // 2. Delete any existing cards for this deck that are not in the new deck.cards list
      // SAFETY: Only delete remote cards if the local deck actually contains cards.
      // If deck.cards is empty, do NOT wipe out existing remote cards!
      const currentCardIds = new Set((deck.cards || []).map((c) => c.id));
      if (deck.cards && deck.cards.length > 0) {
        const { data: remoteCards, error: fetchCardsErr } = await supabase
          .from('flashcards')
          .select('id')
          .eq('deck_id', deck.id);

        if (fetchCardsErr) {
          console.warn('[SyncService] Could not check remote cards:', fetchCardsErr.message);
        }

        if (remoteCards && remoteCards.length > 0) {
          const toDelete = remoteCards.filter((r) => !currentCardIds.has(r.id)).map((r) => r.id);
          if (toDelete.length > 0) {
            await supabase.from('flashcards').delete().in('id', toDelete);
          }
        }
      }

      // 3. Upsert cards if any
      if (deck.cards && deck.cards.length > 0) {
        const rows = deck.cards.map((c) => {
          const cardPayload: Record<string, any> = {
            id: c.id,
            deck_id: deck.id,
            front: c.front || '',
            back: c.back || '',
            rationale: c.rationale || '',
            options: c.options || [],
            tags: c.tags || [],
            ndle_subject: c.ndleSubject || null,
            difficulty: c.difficulty || null,
            leitner_box: c.leitnerBox || 1,
            user_notes: c.userNotes || '',
            sm2: c.sm2 || { interval: 0, easeFactor: 2.5, repetitions: 0, dueDate: new Date().toISOString() },
            last_reviewed_at: c.lastReviewedAt || null,
            updated_at: c.updatedAt || new Date().toISOString(),
          };
          if (dbUserId) {
            cardPayload.user_id = dbUserId;
          } else {
            cardPayload.user_id = null;
          }
          return cardPayload;
        });

        // Batch in chunks of 100 to avoid payload size limit
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          let { error: cardsErr } = await supabase
            .from('flashcards')
            .upsert(chunk, { onConflict: 'id' });

          if (cardsErr && (cardsErr.message?.includes('ndle_subject') || cardsErr.message?.includes('schema cache'))) {
            console.warn('[SyncService] Retrying cards chunk upsert without ndle_subject column...');
            const retryChunk = chunk.map((r) => {
              const copy = { ...r };
              delete copy.ndle_subject;
              return copy;
            });
            const retry = await supabase.from('flashcards').upsert(retryChunk, { onConflict: 'id' });
            cardsErr = retry.error;
          }

          if (cardsErr && (cardsErr.message?.includes('user_id') || cardsErr.code === '23502' || cardsErr.code === '23503')) {
            console.warn('[SyncService] Retrying cards chunk upsert without user_id column...');
            const retryChunk = chunk.map((r) => {
              const copy = { ...r };
              delete copy.user_id;
              return copy;
            });
            const retry = await supabase.from('flashcards').upsert(retryChunk, { onConflict: 'id' });
            cardsErr = retry.error;
          }

          if (cardsErr) {
            const errorDetail = `[Cards Upsert Error in "${deck.title}"]: ${cardsErr.message} (${cardsErr.code || ''})`;
            console.error('[SyncService] Failed to upsert cards chunk:', errorDetail, cardsErr);
            return { ok: false, error: errorDetail };
          }
        }
      }

      console.log(`[SyncService] Successfully saved deck "${deck.title}" (${deck.cards?.length || 0} cards) to Cloud.`);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[SyncService] Error pushing deck to cloud:', msg, err);
      return { ok: false, error: msg };
    }
  }

  /**
   * Pushes a single card's updated review state to Supabase.
   * Optimization #9: Only sends review-relevant fields (not full card content).
   */
  async syncCardReview(deckId: string, card: Flashcard): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      // Only update review-relevant columns — front, back, rationale, options, tags are immutable during review
      const reviewPayload = {
        leitner_box: card.leitnerBox || 1,
        user_notes: card.userNotes || '',
        sm2: card.sm2 || { interval: 0, easeFactor: 2.5, repetitions: 0, dueDate: new Date().toISOString() },
        difficulty: card.difficulty || null,
        last_reviewed_at: card.lastReviewedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('flashcards')
        .update(reviewPayload)
        .eq('id', card.id);

      // If UPDATE affected 0 rows (card doesn't exist in cloud yet), fall back to a full upsert
      if (error && (error.code === 'PGRST116' || error.message?.includes('0 rows'))) {
        const user = await this.getCurrentUser();
        const isRealAuthUser = user && user.id !== SyncService.SHARED_WORKSPACE_UUID;
        const fullPayload: Record<string, any> = {
          id: card.id,
          deck_id: deckId,
          front: card.front || '',
          back: card.back || '',
          rationale: card.rationale || '',
          options: card.options || [],
          tags: card.tags || [],
          ndle_subject: card.ndleSubject || null,
          ...reviewPayload,
        };
        if (isRealAuthUser) fullPayload.user_id = user.id;

        const { error: upsertErr } = await supabase.from('flashcards').upsert(fullPayload, { onConflict: 'id' });
        if (upsertErr) {
          console.warn('[SyncService] Card review full upsert fallback failed:', upsertErr.message);
          return false;
        }
      } else if (error) {
        console.warn('[SyncService] Card review cloud sync deferred:', error.message || error.code || 'Unspecified error');
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[SyncService] Background card review sync error:', err);
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
    const dbUserId = this.getDbUserId(user);

    try {
      await supabase.from('flashcards').delete().eq('deck_id', deckId);

      let query = supabase.from('decks').delete().eq('id', deckId);
      if (dbUserId) {
        query = query.eq('user_id', dbUserId);
      }
      const { error } = await query;

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
    const dbUserId = this.getDbUserId(user);

    try {
      const rows = playlists.map((p) => ({
        id: p.id,
        user_id: dbUserId,
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
    const dbUserId = this.getDbUserId(user);

    try {
      let query = supabase.from('playlists').delete().eq('id', playlistId);
      if (dbUserId) {
        query = query.eq('user_id', dbUserId);
      }
      const { error } = await query;
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
    const isRealAuthUser = user && user.id !== SyncService.SHARED_WORKSPACE_UUID;
    if (!isRealAuthUser) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) return null;
      return data.preferences as UserPreferences;
    } catch {
      return null;
    }
  }

  /**
   * Pushes user preferences to Supabase — single UPSERT (Optimization #6).
   */
  async pushPreferences(preferences: UserPreferences): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const user = await this.getCurrentUser();
    const isRealAuthUser = user && user.id !== SyncService.SHARED_WORKSPACE_UUID;
    if (!isRealAuthUser) {
      return true; // Unauthenticated shared mode stored in localStorage
    }

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

      if (error) {
        console.warn('[SyncService] Failed to upsert preferences:', error.message);
        return false;
      }
      return true;
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
    const dbUserId = this.getDbUserId(user);
    const sessionId = session.id || `sess-${session.deckId || 'deck'}-${session.startTime || Date.now()}`;

    try {
      // Optimization #14: Slim session checkpoints — store only essential card fields to minimize payload
      const slimCardsQueue = Array.isArray(session.cardsQueue)
        ? session.cardsQueue.map((c) => ({
            id: c.id,
            deckId: c.deckId,
            front: c.front,
            back: c.back,
            options: c.options,
            rationale: c.rationale,
            leitnerBox: c.leitnerBox,
            difficulty: c.difficulty,
            ndleSubject: c.ndleSubject,
          }))
        : [];

      const { error } = await supabase.from('study_sessions').upsert(
        {
          id: sessionId,
          user_id: dbUserId,
          deck_id: session.deckId || 'unknown-deck',
          deck_title: session.deckTitle || 'Study Session',
          mode: session.mode || 'spaced-repetition',
          current_index: typeof session.currentIndex === 'number' ? session.currentIndex : 0,
          is_completed: typeof session.isCompleted === 'boolean' ? session.isCompleted : false,
          timer_duration_seconds: typeof session.timerDurationSeconds === 'number' ? session.timerDurationSeconds : 0,
          cards_queue: slimCardsQueue,
          results: Array.isArray(session.results) ? session.results : [],
          start_time: Number(session.startTime) || Date.now(),
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
    const dbUserId = this.getDbUserId(user);

    try {
      let query = supabase
        .from('study_sessions')
        .select('id,deck_id,deck_title,mode,current_index,is_completed,timer_duration_seconds,cards_queue,results,start_time,updated_at')
        .eq('is_completed', false)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (dbUserId) {
        query = query.eq('user_id', dbUserId);
      }

      const { data, error } = await query.maybeSingle();

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
    const dbUserId = this.getDbUserId(user);

    try {
      let query = supabase
        .from('study_sessions')
        .update({
          is_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (dbUserId) {
        query = query.eq('user_id', dbUserId);
      }

      const { error } = await query;
      return !error;
    } catch {
      return false;
    }
  }

  private pendingStudyLogs: StudyLogEntry[] = [];
  private studyLogFlushTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Optimization #10: Pushes multiple study log entries in a single batch INSERT query.
   */
  async pushStudyLogs(logs: StudyLogEntry[]): Promise<boolean> {
    if (!logs || logs.length === 0) return true;
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const user = await this.getCurrentUser();
    const dbUserId = this.getDbUserId(user);

    try {
      const rows = logs.map((log) => ({
        id: log.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: dbUserId,
        card_id: log.cardId || 'unknown-card',
        deck_id: log.deckId || 'unknown-deck',
        mode: log.mode || 'spaced-repetition',
        rating: log.rating || 'good',
        user_answer: log.userAnswer || '',
        is_correct: typeof log.isCorrect === 'boolean' ? log.isCorrect : true,
        time_spent_seconds: typeof log.timeSpentSeconds === 'number' ? log.timeSpentSeconds : 0,
        verdict: log.verdict || (log.isCorrect ? 'correct' : 'incorrect'),
        created_at: log.createdAt || new Date().toISOString(),
      }));

      const { error } = await supabase.from('study_logs').insert(rows);
      if (error) {
        console.warn('[SyncService] Batch study log insert warning:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Flushes any buffered study logs immediately.
   */
  async flushStudyLogs(): Promise<void> {
    if (this.studyLogFlushTimer) {
      clearTimeout(this.studyLogFlushTimer);
      this.studyLogFlushTimer = null;
    }
    if (this.pendingStudyLogs.length === 0) return;
    const batch = [...this.pendingStudyLogs];
    this.pendingStudyLogs = [];
    await this.pushStudyLogs(batch);
  }

  /**
   * Optimization #10: Buffers review logs and flushes them in batches every 5 seconds
   * instead of firing an HTTP POST on every card answer.
   */
  async pushStudyLog(log: StudyLogEntry): Promise<boolean> {
    this.pendingStudyLogs.push(log);
    if (!this.studyLogFlushTimer) {
      this.studyLogFlushTimer = setTimeout(() => {
        this.studyLogFlushTimer = null;
        this.flushStudyLogs().catch(console.warn);
      }, 5000);
    }
    return true;
  }

  /**
   * Pulls the user's historical study logs from Supabase.
   * Optimization #13: Supports conditional querying via `since` timestamp to avoid pulling 1000 logs every sync.
   */
  async pullStudyLogs(since?: string): Promise<StudyLogEntry[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const user = await this.getCurrentUser();
    const dbUserId = this.getDbUserId(user);

    try {
      let query = supabase
        .from('study_logs')
        .select('id,user_id,card_id,deck_id,mode,rating,user_answer,is_correct,time_spent_seconds,verdict,created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (dbUserId) {
        query = query.eq('user_id', dbUserId);
      }

      if (since) {
        query = query.gt('created_at', since);
      }

      const { data, error } = await query;
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

  /**
   * MASTER SYNC: Overwrites cloud database with this device's complete dataset.
   * Cleans out any obsolete cloud decks/cards/playlists and pushes local state.
   */
  async overwriteCloudWithLocalData(
    decks: Deck[],
    playlists: DeckPlaylist[],
    preferences?: UserPreferences,
    logs?: StudyLogEntry[]
  ): Promise<{ success: boolean; decksUploaded: number; totalCards: number; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      const msg = 'Supabase client is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel Environment Variables.';
      console.error('[SyncService]', msg);
      return { success: false, decksUploaded: 0, totalCards: 0, error: msg };
    }

    const user = await this.getCurrentUser();
    const dbUserId = this.getDbUserId(user);

    console.log(`[SyncService] Starting master overwrite to Cloud...`, {
      decksCount: decks.length,
      playlistsCount: playlists.length,
      logsCount: logs?.length || 0,
      user: user?.email || 'zero-login workspace',
    });

    try {
      // 1. Delete any cloud decks not present on this device
      const localDeckIds = new Set(decks.map((d) => d.id));
      let decksQuery = supabase.from('decks').select('id');
      if (dbUserId) {
        decksQuery = decksQuery.eq('user_id', dbUserId);
      }
      const { data: cloudDecks, error: fetchDecksErr } = await decksQuery;

      if (fetchDecksErr) {
        console.warn('[SyncService] Could not query existing cloud decks:', fetchDecksErr);
      }

      if (cloudDecks && cloudDecks.length > 0) {
        const decksToDelete = cloudDecks
          .filter((d) => !localDeckIds.has(d.id))
          .map((d) => d.id);

        if (decksToDelete.length > 0) {
          console.log(`[SyncService] Cleaning out ${decksToDelete.length} obsolete cloud decks:`, decksToDelete);
          // Delete child flashcards first to avoid foreign key constraints
          await supabase.from('flashcards').delete().in('deck_id', decksToDelete);
          const { error: delDecksErr } = await supabase.from('decks').delete().in('id', decksToDelete);
          if (delDecksErr) {
            console.error('[SyncService] Failed to delete obsolete decks:', delDecksErr);
          }
        }
      }

      // 2. Delete any cloud playlists not present on this device
      const localPlaylistIds = new Set(playlists.map((p) => p.id));
      let plQuery = supabase.from('playlists').select('id');
      if (dbUserId) {
        plQuery = plQuery.eq('user_id', dbUserId);
      }
      const { data: cloudPlaylists, error: fetchPlErr } = await plQuery;

      if (fetchPlErr) {
        console.warn('[SyncService] Could not query existing cloud playlists:', fetchPlErr);
      }

      if (cloudPlaylists && cloudPlaylists.length > 0) {
        const playlistsToDelete = cloudPlaylists
          .filter((p) => !localPlaylistIds.has(p.id))
          .map((p) => p.id);

        if (playlistsToDelete.length > 0) {
          console.log(`[SyncService] Cleaning out ${playlistsToDelete.length} obsolete playlists:`, playlistsToDelete);
          const { error: delPlErr } = await supabase.from('playlists').delete().in('id', playlistsToDelete);
          if (delPlErr) {
            console.error('[SyncService] Failed to delete obsolete playlists:', delPlErr);
          }
        }
      }

      // 3. Upsert all local decks & flashcards
      let decksUploaded = 0;
      let totalCards = 0;
      let firstError: string | null = null;

      for (const deck of decks) {
        const res = await this.pushDeckToCloud(deck);
        if (res.ok) {
          decksUploaded++;
          totalCards += (deck.cards || []).length;
        } else {
          if (!firstError) firstError = res.error || `Failed to upload deck "${deck.title}"`;
          console.error(`[SyncService] Failed to upload deck "${deck.title}" (${deck.id}):`, res.error);
        }
      }

      if (decks.length > 0 && decksUploaded === 0) {
        const errorMsg = firstError || 'Failed to push any decks to Cloud database. Please check Supabase tables and RLS permissions.';
        console.error('[SyncService] Master overwrite failed:', errorMsg);
        return { success: false, decksUploaded: 0, totalCards: 0, error: errorMsg };
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
          user_id: dbUserId,
          card_id: l.cardId || 'unknown-card',
          deck_id: l.deckId || 'unknown-deck',
          mode: l.mode || 'spaced-repetition',
          rating: l.rating || 'good',
          user_answer: l.userAnswer || '',
          is_correct: typeof l.isCorrect === 'boolean' ? l.isCorrect : true,
          time_spent_seconds: typeof l.timeSpentSeconds === 'number' ? l.timeSpentSeconds : 0,
          verdict: l.verdict || (l.isCorrect ? 'correct' : 'incorrect'),
          created_at: l.createdAt || l.timestamp || new Date().toISOString(),
        }));

        for (let i = 0; i < logRows.length; i += 100) {
          const chunk = logRows.slice(i, i + 100);
          const { error: logsErr } = await supabase.from('study_logs').upsert(chunk, { onConflict: 'id' });
          if (logsErr) {
            console.warn('[SyncService] Error upserting study logs chunk:', logsErr);
          }
        }
      }

      console.log(`[SyncService] Master overwrite complete: ${decksUploaded}/${decks.length} decks (${totalCards} cards) saved to Cloud.`);
      return { success: true, decksUploaded, totalCards };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[SyncService] Fatal error overwriting cloud data:', err);
      return { success: false, decksUploaded: 0, totalCards: 0, error: msg };
    }
  }
}

export const syncService = new SyncService();
