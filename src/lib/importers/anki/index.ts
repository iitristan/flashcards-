import { Deck } from '@/types';
import { AnkiImportOptions, ImportResult, IImporter } from '../types';
import { extractAnkiArchive, ExtractedArchive } from './ankiArchive';
import { parseAnkiSqlite } from './ankiSqliteParser';
import { convertAnkiCollectionToDecks } from './ankiConverter';

export interface AnkiDeckPreview {
  id: string;
  name: string;
  cardCount: number;
}

export class AnkiImporter implements IImporter<File | ArrayBuffer | Uint8Array, AnkiImportOptions> {
  public canHandle(fileOrData: File | ArrayBuffer | Uint8Array, filename?: string): boolean {
    if (filename) {
      const lower = filename.toLowerCase();
      return lower.endsWith('.colpkg') || lower.endsWith('.apkg') || lower.endsWith('.zip');
    }
    if (typeof File !== 'undefined' && fileOrData instanceof File) {
      const lower = fileOrData.name.toLowerCase();
      return lower.endsWith('.colpkg') || lower.endsWith('.apkg') || lower.endsWith('.zip');
    }
    return false;
  }

  /**
   * Preview available decks and card counts in a .colpkg/.apkg file before full conversion
   */
  public async previewPackage(
    fileOrData: File | ArrayBuffer | Uint8Array
  ): Promise<{ decks: AnkiDeckPreview[]; totalCards: number; hasMedia: boolean }> {
    const archive = await extractAnkiArchive(fileOrData);
    const data = await parseAnkiSqlite(archive.dbBuffer, archive.mediaMap);

    const cardsByDeck = new Map<string, number>();
    for (const card of data.cards) {
      const did = String(card.did);
      cardsByDeck.set(did, (cardsByDeck.get(did) || 0) + 1);
    }

    const deckPreviews: AnkiDeckPreview[] = [];
    for (const deck of data.decks) {
      const id = String(deck.id);
      const cardCount = cardsByDeck.get(id) || 0;
      if (cardCount > 0) {
        deckPreviews.push({
          id,
          name: deck.name,
          cardCount
        });
      }
    }

    return {
      decks: deckPreviews,
      totalCards: data.cards.length,
      hasMedia: archive.hasMedia
    };
  }

  /**
   * Full package import: extract, parse SQLite, and convert to NutriAnki decks
   */
  public async importData(
    fileOrData: File | ArrayBuffer | Uint8Array,
    options?: AnkiImportOptions
  ): Promise<ImportResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    const { onProgress } = options || {};

    try {
      onProgress?.({
        stage: 'extracting',
        progress: 10,
        message: 'Extracting Anki archive...'
      });

      const archive: ExtractedArchive = await extractAnkiArchive(fileOrData);

      onProgress?.({
        stage: 'parsing_database',
        progress: 35,
        message: 'Parsing Anki collection database...'
      });

      const data = await parseAnkiSqlite(archive.dbBuffer, archive.mediaMap);

      if (data.cards.length === 0) {
        warnings.push('The Anki collection does not contain any cards.');
      }

      onProgress?.({
        stage: 'processing_cards',
        progress: 60,
        message: `Converting ${data.cards.length} cards across ${data.decks.length} decks...`
      });

      const decks: Deck[] = await convertAnkiCollectionToDecks(data, archive, options);

      const totalCards = decks.reduce((sum, d) => sum + d.cards.length, 0);

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: `Successfully imported ${totalCards} cards into ${decks.length} decks!`
      });

      return {
        decks,
        totalCards,
        warnings,
        errors
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during Anki package import';
      errors.push(errorMsg);
      onProgress?.({
        stage: 'error',
        progress: 100,
        message: errorMsg
      });

      return {
        decks: [],
        totalCards: 0,
        warnings,
        errors
      };
    }
  }
}

export const ankiImporter = new AnkiImporter();
