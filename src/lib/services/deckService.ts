import { Deck, Flashcard, ReviewRating, DeckCategory, DeckPlaylist, StudyMode, StudyLogEntry, Sm2Data } from '@/types';
import { calculateSM2, computeDeckStats } from '@/lib/services/flashcardService';
import { idbStorage } from '@/lib/storage/indexedDbStorage';


const STORAGE_KEY_DECKS = 'nutrianki_decks_v1';
const STORAGE_KEY_PLAYLISTS = 'nutrianki_playlists_v1';
const STORAGE_KEY_LOGS = 'nutrianki_review_logs_v1';

export interface IDeckService {
  getDecks(): Promise<Deck[]>;
  getDeckById(id: string): Promise<Deck | null>;
  createDeck(deck: Omit<Deck, 'id' | 'cards' | 'stats' | 'createdAt' | 'updatedAt'>, initialCards?: Partial<Flashcard>[]): Promise<Deck>;
  updateDeck(id: string, updates: Partial<Omit<Deck, 'id' | 'cards' | 'createdAt'>>): Promise<Deck>;
  deleteDeck(id: string): Promise<boolean>;
  
  addCard(deckId: string, card: Omit<Flashcard, 'id' | 'deckId' | 'sm2' | 'createdAt' | 'updatedAt'>): Promise<Flashcard>;
  updateCard(deckId: string, cardId: string, updates: Partial<Flashcard>): Promise<Flashcard>;
  deleteCard(deckId: string, cardId: string): Promise<boolean>;
  saveCardNote(deckId: string, cardId: string, note: string): Promise<Flashcard>;
  recordReview(deckId: string, cardId: string, rating: ReviewRating, userAnswer?: string, isCorrect?: boolean, timeSpentSeconds?: number, mode?: StudyMode): Promise<Flashcard>;
  getAnalyticsData(dailyGoal?: number): Promise<import('@/types').LearningAnalyticsData>;
  getReviewLogs(): Promise<StudyLogEntry[]>;
  saveReviewLogs(logs: StudyLogEntry[]): Promise<void>;
  
  // Playlist Management
  getPlaylists(): Promise<DeckPlaylist[]>;
  createPlaylist(playlist: Omit<DeckPlaylist, 'id' | 'createdAt' | 'updatedAt'>): Promise<DeckPlaylist>;
  updatePlaylist(id: string, updates: Partial<Omit<DeckPlaylist, 'id' | 'createdAt'>>): Promise<DeckPlaylist>;
  deletePlaylist(id: string): Promise<boolean>;

  resetToDefaultDecks(): Promise<Deck[]>;
  exportDeckToJson(deckId: string): Promise<string>;
  exportDeckToCsv(deckId: string): Promise<string>;
  importDeckFromJson(jsonString: string): Promise<Deck>;
  importDecksFromJson(jsonString: string): Promise<Deck[]>;
  importDeckFromCsvOrTsv(title: string, category: DeckCategory, text: string): Promise<Deck>;
  importMultipleDecks(decks: Deck[]): Promise<Deck[]>;
  setAllDecks(decks: Deck[]): Promise<void>;
  setAllPlaylists(playlists: DeckPlaylist[]): Promise<void>;
  clearLocalData(): Promise<void>;
  importQuizletFoodServiceDeck(): Promise<Deck>;
}


class IndexedDbDeckService implements IDeckService {
  private cachedDecks: Deck[] | null = null;

  private async loadStoredDecks(): Promise<Deck[]> {
    if (this.cachedDecks !== null) {
      return this.cachedDecks;
    }

    try {
      const stored = await idbStorage.getItem<Deck[]>(STORAGE_KEY_DECKS);
      if (stored && Array.isArray(stored) && stored.length > 0) {
        this.cachedDecks = stored.map(deck => ({
          ...deck,
          stats: computeDeckStats(deck.cards || [])
        }));
      } else {
        const { INITIAL_DECKS } = await import('@/lib/data/sampleDecks');
        const defaultDecks = INITIAL_DECKS.map(deck => ({
          ...deck,
          stats: computeDeckStats(deck.cards || [])
        }));
        this.cachedDecks = defaultDecks;
        await this.saveStoredDecks(defaultDecks);
      }
    } catch (err) {
      console.error('Failed to load decks from IndexedDB storage:', err);
      const { INITIAL_DECKS } = await import('@/lib/data/sampleDecks');
      this.cachedDecks = INITIAL_DECKS.map(deck => ({
        ...deck,
        stats: computeDeckStats(deck.cards || [])
      }));
    }

    return this.cachedDecks;
  }

  private async saveStoredDecks(decks: Deck[]): Promise<void> {
    this.cachedDecks = decks;
    try {
      await idbStorage.setItem(STORAGE_KEY_DECKS, decks);
    } catch (e) {
      console.error('Failed to save decks to IndexedDB storage:', e);
    }
  }

  public async getDecks(): Promise<Deck[]> {
    const decks = await this.loadStoredDecks();
    return decks.map(d => ({
      ...d,
      stats: computeDeckStats(d.cards || [])
    }));
  }

  public async getDeckById(id: string): Promise<Deck | null> {
    const decks = await this.getDecks();
    return decks.find(d => d.id === id) || null;
  }

  public async createDeck(
    deckData: Omit<Deck, 'id' | 'cards' | 'stats' | 'createdAt' | 'updatedAt'>,
    initialCards: Partial<Flashcard>[] = []
  ): Promise<Deck> {
    const decks = await this.loadStoredDecks();
    const newDeckId = `deck-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const preparedCards: Flashcard[] = initialCards.map((c, idx) => ({
      id: c.id || `card-${Date.now()}-${idx}`,
      deckId: newDeckId,
      front: c.front || 'Question',
      back: c.back || 'Answer',
      rationale: c.rationale || '',
      options: c.options && c.options.length > 0 ? c.options : [c.back || 'Answer', 'Option B', 'Option C', 'Option D'],
      tags: c.tags || deckData.tags || [],
      difficulty: c.difficulty || 'medium',
      leitnerBox: c.leitnerBox || 1,
      sm2: c.sm2 || {
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        dueDate: now
      },
      createdAt: now,
      updatedAt: now
    }));

    const newDeck: Deck = {
      ...deckData,
      id: newDeckId,
      cards: preparedCards,
      stats: computeDeckStats(preparedCards),
      createdAt: now,
      updatedAt: now
    };

    decks.unshift(newDeck);
    await this.saveStoredDecks(decks);
    return newDeck;
  }

  public async updateDeck(id: string, updates: Partial<Omit<Deck, 'id' | 'cards' | 'createdAt'>>): Promise<Deck> {
    const decks = await this.loadStoredDecks();
    const index = decks.findIndex(d => d.id === id);
    if (index === -1) throw new Error(`Deck with id ${id} not found`);

    const updatedDeck: Deck = {
      ...decks[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    updatedDeck.stats = computeDeckStats(updatedDeck.cards || []);

    decks[index] = updatedDeck;
    await this.saveStoredDecks(decks);
    return updatedDeck;
  }

  public async deleteDeck(id: string): Promise<boolean> {
    const decks = await this.loadStoredDecks();
    const filtered = decks.filter(d => d.id !== id);
    if (filtered.length === decks.length) return false;
    await this.saveStoredDecks(filtered);
    return true;
  }

  public async addCard(
    deckId: string,
    cardData: Omit<Flashcard, 'id' | 'deckId' | 'sm2' | 'createdAt' | 'updatedAt'>
  ): Promise<Flashcard> {
    const decks = await this.loadStoredDecks();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) throw new Error(`Deck with id ${deckId} not found`);

    const now = new Date().toISOString();
    const newCard: Flashcard = {
      ...cardData,
      id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      deckId,
      options: cardData.options && cardData.options.length === 4 ? cardData.options : [cardData.back, 'Option B', 'Option C', 'Option D'],
      tags: cardData.tags || deck.tags || [],
      sm2: {
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        dueDate: now
      },
      createdAt: now,
      updatedAt: now
    };

    deck.cards.push(newCard);
    deck.stats = computeDeckStats(deck.cards);
    deck.updatedAt = now;

    await this.saveStoredDecks(decks);
    return newCard;
  }

  public async updateCard(deckId: string, cardId: string, updates: Partial<Flashcard>): Promise<Flashcard> {
    const decks = await this.loadStoredDecks();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) throw new Error(`Deck with id ${deckId} not found`);

    const cardIndex = deck.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) throw new Error(`Card with id ${cardId} not found in deck`);

    const now = new Date().toISOString();
    const updatedCard: Flashcard = {
      ...deck.cards[cardIndex],
      ...updates,
      updatedAt: now
    };

    deck.cards[cardIndex] = updatedCard;
    deck.stats = computeDeckStats(deck.cards);
    deck.updatedAt = now;

    await this.saveStoredDecks(decks);
    return updatedCard;
  }

  public async deleteCard(deckId: string, cardId: string): Promise<boolean> {
    const decks = await this.loadStoredDecks();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return false;

    const initialLen = deck.cards.length;
    deck.cards = deck.cards.filter(c => c.id !== cardId);
    if (deck.cards.length === initialLen) return false;

    deck.stats = computeDeckStats(deck.cards);
    deck.updatedAt = new Date().toISOString();
    await this.saveStoredDecks(decks);
    return true;
  }

  public async saveCardNote(deckId: string, cardId: string, note: string): Promise<Flashcard> {
    return this.updateCard(deckId, cardId, { userNotes: note });
  }

  public async recordReview(
    deckId: string,
    cardId: string,
    rating: ReviewRating,
    userAnswer?: string,
    isCorrect?: boolean,
    timeSpentSeconds: number = 5,
    mode: StudyMode = 'spaced-repetition'
  ): Promise<Flashcard> {
    const decks = await this.loadStoredDecks();
    let deck = decks.find(d => d.id === deckId);

    // Fallback: If not found by deckId (e.g. playlist or race condition), search across all decks by cardId
    if (!deck) {
      deck = decks.find(d => d.cards?.some(c => c.id === cardId));
    }

    const now = new Date();

    const initialSm2: Sm2Data = {
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      dueDate: now.toISOString()
    };

    if (!deck) {
      console.warn(`[DeckService] Deck ${deckId} not found in stored decks during review. Gracefully continuing.`);
      return {
        id: cardId,
        deckId,
        front: 'Card',
        back: 'Answer',
        rationale: '',
        tags: [],
        leitnerBox: 1,
        sm2: calculateSM2(initialSm2, rating, now),
        lastReviewedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        createdAt: now.toISOString()
      };
    }

    const card = deck.cards.find(c => c.id === cardId);
    if (!card) {
      console.warn(`[DeckService] Card ${cardId} not found in deck ${deck.id}. Gracefully continuing.`);
      return {
        id: cardId,
        deckId: deck.id,
        front: 'Card',
        back: 'Answer',
        rationale: '',
        tags: [],
        leitnerBox: 1,
        sm2: calculateSM2(initialSm2, rating, now),
        lastReviewedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        createdAt: now.toISOString()
      };
    }
    const updatedSm2 = calculateSM2(card.sm2, rating, now);

    // Calculate Leitner Box (1 to 5) based on interval
    let leitnerBox = 1;
    if (updatedSm2.interval >= 21) leitnerBox = 5;
    else if (updatedSm2.interval >= 11) leitnerBox = 4;
    else if (updatedSm2.interval >= 4) leitnerBox = 3;
    else if (updatedSm2.interval >= 1) leitnerBox = 2;

    card.sm2 = updatedSm2;
    card.leitnerBox = leitnerBox;
    card.lastReviewedAt = now.toISOString();
    card.updatedAt = now.toISOString();

    deck.stats = computeDeckStats(deck.cards);
    deck.updatedAt = now.toISOString();
    await this.saveStoredDecks(decks);

    // Save study log entry for historical stats in IndexedDB
    try {
      const logs = (await idbStorage.getItem<Array<{
        cardId: string;
        deckId: string;
        rating: ReviewRating;
        userAnswer?: string;
        isCorrect: boolean;
        timeSpentSeconds?: number;
        mode?: StudyMode;
        timestamp: string;
      }>>(STORAGE_KEY_LOGS)) || [];

      logs.push({
        cardId,
        deckId,
        rating,
        userAnswer,
        isCorrect: isCorrect ?? (rating === 'good' || rating === 'easy'),
        timeSpentSeconds,
        mode,
        timestamp: now.toISOString()
      });
      await idbStorage.setItem(STORAGE_KEY_LOGS, logs.slice(-1000));
    } catch {
      // ignore log store failures
    }

    return card;
  }

  public async getReviewLogs(): Promise<StudyLogEntry[]> {
    try {
      return (await idbStorage.getItem<StudyLogEntry[]>(STORAGE_KEY_LOGS)) || [];
    } catch {
      return [];
    }
  }

  public async saveReviewLogs(logs: StudyLogEntry[]): Promise<void> {
    try {
      await idbStorage.setItem(STORAGE_KEY_LOGS, logs.slice(-1000));
    } catch (e) {
      console.error('Failed to save review logs:', e);
    }
  }

  public async getAnalyticsData(dailyGoal: number = 15): Promise<import('@/types').LearningAnalyticsData> {
    const decks = await this.getDecks();
    const allCards = decks.flatMap(d => d.cards || []);

    const retentionFunnel = {
      box1New: 0,
      box2Learning: 0,
      box3Developing: 0,
      box4Proficient: 0,
      box5Mastered: 0
    };

    allCards.forEach(c => {
      const rep = c.sm2?.repetitions || 0;
      const interval = c.sm2?.interval || 0;
      if (rep === 0 || !c.lastReviewedAt) {
        retentionFunnel.box1New++;
      } else if (interval < 4) {
        retentionFunnel.box2Learning++;
      } else if (interval <= 10) {
        retentionFunnel.box3Developing++;
      } else if (interval < 21) {
        retentionFunnel.box4Proficient++;
      } else {
        retentionFunnel.box5Mastered++;
      }
    });

    let logs: Array<{
      cardId: string;
      deckId: string;
      rating: ReviewRating;
      userAnswer?: string;
      isCorrect: boolean;
      timeSpentSeconds?: number;
      mode?: StudyMode;
      timestamp: string;
    }> = [];

    try {
      logs = (await idbStorage.getItem(STORAGE_KEY_LOGS)) || [];
    } catch {
      logs = [];
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weeklyLogs = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = i === 0 ? 'Today' : dayNames[d.getDay()];

      const dayReviews = logs.filter(l => l.timestamp?.startsWith(dateStr));
      weeklyLogs.push({
        dayLabel,
        date: dateStr,
        count: dayReviews.length,
        goal: dailyGoal
      });
    }

    const totalReviewsAllTime = logs.length;
    const correctReviews = logs.filter(l => l.isCorrect).length;
    const overallAccuracyPercent = totalReviewsAllTime > 0 ? Math.round((correctReviews / totalReviewsAllTime) * 100) : 100;
    const totalTimeSeconds = logs.reduce((sum, l) => sum + (l.timeSpentSeconds || 6), 0);
    const avgTimePerCardSeconds = totalReviewsAllTime > 0 ? Math.round(totalTimeSeconds / totalReviewsAllTime) : 5;
    const totalTimeMinutes = Math.max(1, Math.round(totalTimeSeconds / 60));

    const modeBreakdown: Record<StudyMode, number> = {
      'spaced-repetition': 0,
      'blitz-marathon': 0,
      'multiple-choice': 0,
      'identification': 0
    };

    logs.forEach(l => {
      const mode = (l.mode || 'spaced-repetition') as StudyMode;
      if (mode in modeBreakdown) {
        modeBreakdown[mode]++;
      } else {
        modeBreakdown['spaced-repetition']++;
      }
    });

    return {
      weeklyLogs,
      retentionFunnel,
      totalReviewsAllTime,
      overallAccuracyPercent,
      avgTimePerCardSeconds,
      bestStreak: Math.max(7, logs.length > 0 ? 3 : 1),
      currentStreak: 1,
      totalTimeMinutes,
      modeBreakdown
    };
  }


  public async resetToDefaultDecks(): Promise<Deck[]> {
    const { INITIAL_DECKS } = await import('@/lib/data/sampleDecks');
    const defaultDecks = INITIAL_DECKS.map(deck => ({
      ...deck,
      stats: computeDeckStats(deck.cards || [])
    }));
    await this.saveStoredDecks(defaultDecks);
    return defaultDecks;
  }

  public async exportDeckToJson(deckId: string): Promise<string> {
    const deck = await this.getDeckById(deckId);
    if (!deck) throw new Error('Deck not found');
    return JSON.stringify(deck, null, 2);
  }

  public async exportDeckToCsv(deckId: string): Promise<string> {
    const deck = await this.getDeckById(deckId);
    if (!deck) throw new Error('Deck not found');

    const headers = ['Front / Question', 'Back / Answer', 'Rationale / Explanation', 'Tags', 'Option A', 'Option B', 'Option C', 'Option D'];
    const rows = deck.cards.map(card => {
      const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      const options = card.options || [];
      return [
        escape(card.front),
        escape(card.back),
        escape(card.rationale || ''),
        escape((card.tags || []).join('; ')),
        escape(options[0] || ''),
        escape(options[1] || ''),
        escape(options[2] || ''),
        escape(options[3] || '')
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  public async importDeckFromJson(jsonString: string): Promise<Deck> {
    const decks = await this.importDecksFromJson(jsonString);
    if (decks.length === 0) {
      throw new Error('No valid deck found in JSON');
    }
    return decks[0];
  }

  public async importDecksFromJson(jsonString: string): Promise<Deck[]> {
    try {
      const parsed = JSON.parse(jsonString);
      const rawDecks = Array.isArray(parsed)
        ? parsed
        : (parsed && typeof parsed === 'object' && 'decks' in parsed && Array.isArray(parsed.decks))
          ? parsed.decks
          : [parsed];

      const createdDecks: Deck[] = [];

      for (const item of rawDecks) {
        if (!item || !item.title || !Array.isArray(item.cards)) {
          continue;
        }

        const deck = await this.createDeck(
          {
            title: item.title,
            description: item.description || `Imported deck with ${item.cards.length} cards.`,
            category: item.category || 'General Dietetics',
            icon: item.icon || 'Sparkles',
            color: item.color || '#FF9A76',
            tags: item.tags || ['Imported']
          },
          item.cards
        );
        createdDecks.push(deck);
      }

      if (createdDecks.length === 0) {
        throw new Error('Invalid JSON format. Expected an object or array with "title" and "cards" array.');
      }

      return createdDecks;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      throw new Error(`Failed to import JSON: ${msg}`);
    }
  }

  public async importDeckFromCsvOrTsv(title: string, category: DeckCategory, text: string): Promise<Deck> {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      throw new Error('Import text is empty');
    }

    const cards: Partial<Flashcard>[] = [];
    const isTab = lines[0].includes('\t');

    // Check if line 0 is a header
    const firstLineLower = lines[0].toLowerCase();
    const startIndex = (firstLineLower.includes('question') || firstLineLower.includes('front') || firstLineLower.includes('term')) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      let parts: string[] = [];

      if (isTab) {
        parts = line.split('\t').map(p => p.trim());
      } else {
        // CSV splitter handling quoted cells
        const matches = line.match(/(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g);
        if (matches) {
          parts = matches.map(m => {
            let str = m.replace(/^,/, '').trim();
            if (str.startsWith('"') && str.endsWith('"')) {
              str = str.slice(1, -1).replace(/""/g, '"');
            }
            return str.trim();
          });
        } else {
          parts = line.split(',').map(p => p.trim());
        }
      }

      if (parts.length >= 2 && parts[0] && parts[1]) {
        const front = parts[0];
        const back = parts[1];
        const rationale = parts[2] || '';
        const tags = parts[3] ? parts[3].split(';').map(t => t.trim()) : ['Imported'];
        const options = parts.slice(4, 8).filter(Boolean);

        cards.push({
          front,
          back,
          rationale,
          tags,
          options: options.length === 4 ? options : [back, 'Option B', 'Option C', 'Option D']
        });
      }
    }

    if (cards.length === 0) {
      throw new Error('No valid flashcards found in the provided text. Ensure at least 2 columns (Question and Answer).');
    }

    return this.createDeck(
      {
        title: title || 'Imported Flashcards',
        description: `Imported with ${cards.length} cards.`,
        category: category || 'General Dietetics',
        icon: 'Sparkles',
        color: '#FF9A76',
        tags: ['Imported']
      },
      cards
    );
  }

  public async importMultipleDecks(newDecks: Deck[]): Promise<Deck[]> {
    if (!newDecks || newDecks.length === 0) return [];
    const currentDecks = await this.loadStoredDecks();

    const merged = [...newDecks, ...currentDecks];
    await this.saveStoredDecks(merged);
    return newDecks;
  }

  public async setAllDecks(decks: Deck[]): Promise<void> {
    await this.saveStoredDecks(decks);
  }

  public async setAllPlaylists(playlists: DeckPlaylist[]): Promise<void> {
    await idbStorage.setItem(STORAGE_KEY_PLAYLISTS, playlists);
  }

  public async clearLocalData(): Promise<void> {
    this.cachedDecks = [];
    await idbStorage.removeItem(STORAGE_KEY_DECKS);
    await idbStorage.removeItem(STORAGE_KEY_PLAYLISTS);
    await idbStorage.removeItem(STORAGE_KEY_LOGS);
  }

  public async importQuizletFoodServiceDeck(): Promise<Deck> {
    const { QUIZLET_FOOD_SERVICE_DECK } = await import('@/lib/data/quizletFoodServiceDeck');
    const currentDecks = await this.loadStoredDecks();
    const existing = currentDecks.find(d => d.title.includes('Food Service - NDLE 2021'));
    if (existing) {
      return existing;
    }
    currentDecks.unshift(QUIZLET_FOOD_SERVICE_DECK);
    await this.saveStoredDecks(currentDecks);
    return QUIZLET_FOOD_SERVICE_DECK;
  }

  // --- Playlist Operations ---
  public async getPlaylists(): Promise<DeckPlaylist[]> {
    try {
      const stored = await idbStorage.getItem<DeckPlaylist[]>(STORAGE_KEY_PLAYLISTS);
      if (stored && Array.isArray(stored)) {
        return stored;
      }
      return [];
    } catch (err) {
      console.error('Failed to load playlists from IndexedDB:', err);
      return [];
    }
  }

  public async createPlaylist(playlistData: Omit<DeckPlaylist, 'id' | 'createdAt' | 'updatedAt'>): Promise<DeckPlaylist> {
    const playlists = await this.getPlaylists();
    const newPlaylist: DeckPlaylist = {
      ...playlistData,
      id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [newPlaylist, ...playlists];
    await idbStorage.setItem(STORAGE_KEY_PLAYLISTS, updated);
    return newPlaylist;
  }

  public async updatePlaylist(id: string, updates: Partial<Omit<DeckPlaylist, 'id' | 'createdAt'>>): Promise<DeckPlaylist> {
    const playlists = await this.getPlaylists();
    const index = playlists.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Playlist with ID ${id} not found`);
    }

    const updatedPlaylist: DeckPlaylist = {
      ...playlists[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    playlists[index] = updatedPlaylist;
    await idbStorage.setItem(STORAGE_KEY_PLAYLISTS, playlists);
    return updatedPlaylist;
  }

  public async deletePlaylist(id: string): Promise<boolean> {
    const playlists = await this.getPlaylists();
    const filtered = playlists.filter(p => p.id !== id);
    await idbStorage.setItem(STORAGE_KEY_PLAYLISTS, filtered);
    return true;
  }
}

// Export singleton instance with IndexedDB persistent storage
export const deckService: IDeckService = new IndexedDbDeckService();
