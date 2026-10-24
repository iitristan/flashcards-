import { Deck } from '@/types';
import { HtmlImportOptions, ImportResult, IImporter } from '../types';
import { parseHtmlExamText, createDeckFromHtmlExam } from './htmlExamParser';
import { deckService } from '@/lib/services/deckService';

export class HtmlImporter implements IImporter<File | string, HtmlImportOptions> {
  public canHandle(fileOrData: File | string, filename?: string): boolean {
    if (filename) {
      const lower = filename.toLowerCase();
      return lower.endsWith('.html') || lower.endsWith('.htm');
    }
    if (typeof File !== 'undefined' && fileOrData instanceof File) {
      const lower = fileOrData.name.toLowerCase();
      return lower.endsWith('.html') || lower.endsWith('.htm');
    }
    if (typeof fileOrData === 'string') {
      return (
        fileOrData.includes('<html') ||
        fileOrData.includes('<!DOCTYPE html') ||
        (fileOrData.includes('<script') && (fileOrData.includes('data=') || fileOrData.includes('questions=')))
      );
    }
    return false;
  }

  /**
   * Import flashcards from an Interactive Exam HTML file or HTML string
   */
  public async importData(
    fileOrData: File | string,
    options?: HtmlImportOptions
  ): Promise<ImportResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const { onProgress, deckTitle, category: overrideCategory } = options || {};

    try {
      onProgress?.({
        stage: 'reading',
        progress: 15,
        message: 'Reading Interactive Exam HTML document...'
      });

      let htmlText = '';
      let fallbackTitle = 'Interactive Exam Deck';

      if (typeof fileOrData === 'string') {
        htmlText = fileOrData;
      } else {
        fallbackTitle = fileOrData.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        htmlText = await fileOrData.text();
      }

      onProgress?.({
        stage: 'processing_cards',
        progress: 55,
        message: 'Parsing questions, multiple-choice choices, and aligning answer keys...'
      });

      const parsed = parseHtmlExamText(htmlText, deckTitle || fallbackTitle, overrideCategory);
      const title = deckTitle || parsed.title;
      const category = overrideCategory || parsed.category;

      if (parsed.cards.length === 0) {
        warnings.push('No questions or multiple choice items could be parsed from the HTML exam.');
        return {
          decks: [],
          totalCards: 0,
          warnings,
          errors
        };
      }

      const deck: Deck = createDeckFromHtmlExam(title, category, parsed.description, parsed.cards);

      // Persist the deck to store and IndexedDB
      await deckService.importMultipleDecks([deck]);

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: `Successfully parsed ${deck.cards.length} cards with accurate choices into "${deck.title}"!`
      });

      return {
        decks: [deck],
        totalCards: deck.cards.length,
        warnings,
        errors
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'HTML exam import failed';
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

export const htmlImporter = new HtmlImporter();
