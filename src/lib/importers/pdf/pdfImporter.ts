import { Deck } from '@/types';
import { PdfImportOptions, ImportResult, IImporter } from '../types';
import { parseQuizletExamText, createDeckFromQuizletItems } from './quizletPdfParser';

export class PdfImporter implements IImporter<File | string, PdfImportOptions> {
  public canHandle(fileOrData: File | string, filename?: string): boolean {
    if (filename) {
      return filename.toLowerCase().endsWith('.pdf');
    }
    if (typeof File !== 'undefined' && fileOrData instanceof File) {
      return fileOrData.name.toLowerCase().endsWith('.pdf');
    }
    return false;
  }

  /**
   * Extracts text from a PDF file
   */
  public async extractTextFromPdf(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/extract-pdf', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error || 'Failed to extract text from PDF file');
    }

    const data = await response.json();
    return data.text || '';
  }

  /**
   * Import flashcards from a PDF file or extracted text
   */
  public async importData(
    fileOrData: File | string,
    options?: PdfImportOptions
  ): Promise<ImportResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const { onProgress, deckTitle, category: overrideCategory } = options || {};

    try {
      onProgress?.({
        stage: 'reading',
        progress: 15,
        message: 'Reading PDF document...'
      });

      let rawText = '';
      if (typeof fileOrData === 'string') {
        rawText = fileOrData;
      } else {
        rawText = await this.extractTextFromPdf(fileOrData);
      }

      onProgress?.({
        stage: 'processing_cards',
        progress: 55,
        message: 'Parsing questions, multiple-choice options, and rationales...'
      });

      const parsed = parseQuizletExamText(rawText);
      const title = deckTitle || parsed.title;
      const category = overrideCategory || parsed.category;

      if (parsed.cards.length === 0) {
        warnings.push('No multiple-choice questions or flashcards could be parsed from the PDF.');
        return {
          decks: [],
          totalCards: 0,
          warnings,
          errors
        };
      }

      const deck: Deck = createDeckFromQuizletItems(title, category, parsed.cards);

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: `Successfully parsed ${deck.cards.length} cards into "${deck.title}"!`
      });

      return {
        decks: [deck],
        totalCards: deck.cards.length,
        warnings,
        errors
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'PDF import failed';
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

export const pdfImporter = new PdfImporter();
