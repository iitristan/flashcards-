import { Deck, DeckCategory } from '@/types';
import { ankiImporter } from './anki';
import { pdfImporter } from './pdf/pdfImporter';
import { ImportResult, ImportableFileFormat, BulkImportResult } from './types';
import { deckService } from '@/lib/services/deckService';
import { inferCategoryFromName } from './anki/ankiConverter';
import { parseQuizletExamText } from './pdf/quizletPdfParser';

export interface FilePreviewSummary {
  format: ImportableFileFormat;
  title: string;
  category: DeckCategory;
  cardsCount: number;
  decksCount: number;
  error?: string;
}

export class ImportService {
  /**
   * Detect format from file name or extension
   */
  public detectFormat(filename: string): ImportableFileFormat {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.colpkg') || lower.endsWith('.apkg') || lower.endsWith('.zip')) {
      return 'anki';
    }
    if (lower.endsWith('.pdf')) {
      return 'pdf';
    }
    if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
      return 'csv';
    }
    if (lower.endsWith('.json')) {
      return 'json';
    }
    return 'unknown';
  }

  /**
   * Check if file extension is supported
   */
  public isSupportedFile(filename: string): boolean {
    return this.detectFormat(filename) !== 'unknown';
  }

  /**
   * Quick preview and inspection of an uploaded file without full ingestion
   */
  public async previewFile(file: File): Promise<FilePreviewSummary> {
    const format = this.detectFormat(file.name);
    const fallbackTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

    if (format === 'unknown') {
      return {
        format: 'unknown',
        title: fallbackTitle,
        category: 'General Dietetics',
        cardsCount: 0,
        decksCount: 0,
        error: `Unsupported file type (${file.name}). Please upload .colpkg, .apkg, .pdf, .csv, .tsv, or .json.`
      };
    }

    if (format === 'anki') {
      try {
        const preview = await ankiImporter.previewPackage(file);
        const title = preview.decks[0]?.name || fallbackTitle;
        const category = inferCategoryFromName(title, 'General Dietetics');
        return {
          format: 'anki',
          title,
          category,
          cardsCount: preview.totalCards,
          decksCount: preview.decks.length,
          ...(preview.totalCards === 0 ? { error: 'No flashcards found in this Anki package' } : {})
        };
      } catch (err: unknown) {
        return {
          format: 'anki',
          title: fallbackTitle,
          category: 'General Dietetics',
          cardsCount: 0,
          decksCount: 0,
          error: err instanceof Error ? err.message : 'Failed to parse Anki package archive'
        };
      }
    }

    if (format === 'pdf') {
      try {
        const rawText = await pdfImporter.extractTextFromPdf(file);
        const parsed = parseQuizletExamText(rawText);
        const title = parsed.title || fallbackTitle;
        const category = parsed.category || inferCategoryFromName(title, 'Food Service Systems');

        if (parsed.cards.length === 0) {
          return {
            format: 'pdf',
            title,
            category,
            cardsCount: 0,
            decksCount: 0,
            error: 'No flashcard questions found in PDF (needs numbered questions with choices or rationales)'
          };
        }

        return {
          format: 'pdf',
          title,
          category,
          cardsCount: parsed.cards.length,
          decksCount: 1
        };
      } catch (err: unknown) {
        return {
          format: 'pdf',
          title: fallbackTitle,
          category: 'Food Service Systems',
          cardsCount: 0,
          decksCount: 0,
          error: err instanceof Error ? err.message : 'Failed to extract text from PDF'
        };
      }
    }

    if (format === 'csv') {
      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const category = inferCategoryFromName(fallbackTitle, 'General Dietetics');

        if (lines.length === 0) {
          return {
            format: 'csv',
            title: fallbackTitle,
            category,
            cardsCount: 0,
            decksCount: 0,
            error: 'File is empty'
          };
        }

        const isTab = lines[0].includes('\t');
        const startIdx = (lines[0].toLowerCase().includes('question') || lines[0].toLowerCase().includes('front') || lines[0].toLowerCase().includes('term')) ? 1 : 0;
        let count = 0;

        for (let i = startIdx; i < lines.length; i++) {
          const parts = isTab ? lines[i].split('\t') : lines[i].split(',');
          if (parts.length >= 2 && parts[0]?.trim() && parts[1]?.trim()) {
            count++;
          }
        }

        if (count === 0) {
          return {
            format: 'csv',
            title: fallbackTitle,
            category,
            cardsCount: 0,
            decksCount: 0,
            error: 'No valid flashcard pairs found (requires Question and Answer columns)'
          };
        }

        return {
          format: 'csv',
          title: fallbackTitle,
          category,
          cardsCount: count,
          decksCount: 1
        };
      } catch (err: unknown) {
        return {
          format: 'csv',
          title: fallbackTitle,
          category: 'General Dietetics',
          cardsCount: 0,
          decksCount: 0,
          error: err instanceof Error ? err.message : 'Failed to read CSV/TSV file'
        };
      }
    }

    if (format === 'json') {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (Array.isArray(parsed)) {
          let totalCards = 0;
          let validDecks = 0;
          for (const item of parsed) {
            if (item && Array.isArray(item.cards)) {
              totalCards += item.cards.length;
              validDecks++;
            }
          }
          const title = parsed[0]?.title || fallbackTitle;
          const category = parsed[0]?.category || 'General Dietetics';
          return {
            format: 'json',
            title,
            category,
            cardsCount: totalCards,
            decksCount: validDecks,
            ...(totalCards === 0 ? { error: 'No flashcards found in JSON deck array' } : {})
          };
        } else if (parsed && Array.isArray(parsed.decks)) {
          let totalCards = 0;
          let validDecks = 0;
          for (const item of parsed.decks) {
            if (item && Array.isArray(item.cards)) {
              totalCards += item.cards.length;
              validDecks++;
            }
          }
          const title = parsed.decks[0]?.title || fallbackTitle;
          const category = parsed.decks[0]?.category || 'General Dietetics';
          return {
            format: 'json',
            title,
            category,
            cardsCount: totalCards,
            decksCount: validDecks,
            ...(totalCards === 0 ? { error: 'No flashcards found in JSON decks' } : {})
          };
        } else if (parsed && Array.isArray(parsed.cards)) {
          const title = parsed.title || fallbackTitle;
          const category = parsed.category || inferCategoryFromName(title, 'General Dietetics');
          return {
            format: 'json',
            title,
            category,
            cardsCount: parsed.cards.length,
            decksCount: 1,
            ...(parsed.cards.length === 0 ? { error: 'Deck contains 0 cards' } : {})
          };
        } else {
          return {
            format: 'json',
            title: fallbackTitle,
            category: 'General Dietetics',
            cardsCount: 0,
            decksCount: 0,
            error: 'Invalid JSON deck format (must contain "cards" array or list of decks)'
          };
        }
      } catch (err: unknown) {
        return {
          format: 'json',
          title: fallbackTitle,
          category: 'General Dietetics',
          cardsCount: 0,
          decksCount: 0,
          error: err instanceof Error ? err.message : 'Invalid JSON file syntax'
        };
      }
    }

    return {
      format: 'unknown',
      title: fallbackTitle,
      category: 'General Dietetics',
      cardsCount: 0,
      decksCount: 0,
      error: 'Unsupported format'
    };
  }

  /**
   * Automatically detect format and import file
   */
  public async importFile(
    file: File,
    options?: {
      title?: string;
      category?: DeckCategory;
      selectedDeckIds?: string[];
      onProgress?: (progress: { stage: string; progress: number; message: string }) => void;
    }
  ): Promise<ImportResult> {
    const filename = file.name.toLowerCase();

    if (filename.endsWith('.colpkg') || filename.endsWith('.apkg') || filename.endsWith('.zip')) {
      const result = await ankiImporter.importData(file, {
        defaultCategory: options?.category,
        selectedDeckIds: options?.selectedDeckIds,
        onProgress: options?.onProgress
      });
      // If a custom title was passed and there is exactly 1 deck imported, rename it
      if (options?.title && result.decks.length === 1) {
        result.decks[0].title = options.title;
      }
      return result;
    }

    if (filename.endsWith('.pdf')) {
      return pdfImporter.importData(file, {
        deckTitle: options?.title,
        category: options?.category,
        onProgress: options?.onProgress
      });
    }

    if (filename.endsWith('.json')) {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`Failed to parse JSON file "${file.name}": syntax error.`);
      }

      // Check if it's an array of decks
      const deckArray = Array.isArray(parsed)
        ? parsed
        : (parsed && typeof parsed === 'object' && 'decks' in parsed && Array.isArray((parsed as Record<string, unknown>).decks))
          ? (parsed as { decks: unknown[] }).decks
          : null;

      if (deckArray) {
        const importedDecks: Deck[] = [];
        for (const item of deckArray) {
          if (item && typeof item === 'object' && 'title' in item && Array.isArray((item as Record<string, unknown>).cards)) {
            const castItem = item as {
              title: string;
              description?: string;
              category?: DeckCategory;
              icon?: string;
              color?: string;
              tags?: string[];
              cards: unknown[];
            };
            const deck = await deckService.createDeck(
              {
                title: castItem.title,
                description: castItem.description || `Imported deck with ${castItem.cards.length} cards.`,
                category: castItem.category || options?.category || 'General Dietetics',
                icon: castItem.icon || 'Sparkles',
                color: castItem.color || '#FF9A76',
                tags: castItem.tags || ['Imported']
              },
              castItem.cards as Parameters<typeof deckService.createDeck>[1]
            );
            importedDecks.push(deck);
          }
        }

        if (importedDecks.length === 0) {
          throw new Error('No valid decks found in JSON array. Each deck requires "title" and "cards".');
        }

        return {
          decks: importedDecks,
          totalCards: importedDecks.reduce((sum, d) => sum + d.cards.length, 0),
          warnings: [],
          errors: []
        };
      }

      // Single deck JSON
      const deck = await deckService.importDeckFromJson(text);
      if (options?.title) {
        deck.title = options.title;
      }
      if (options?.category) {
        deck.category = options.category;
      }
      return {
        decks: [deck],
        totalCards: deck.cards.length,
        warnings: [],
        errors: []
      };
    }

    if (filename.endsWith('.csv') || filename.endsWith('.tsv') || filename.endsWith('.txt')) {
      const text = await file.text();
      const deck = await deckService.importDeckFromCsvOrTsv(
        options?.title || file.name.replace(/\.[^/.]+$/, ''),
        options?.category || 'General Dietetics',
        text
      );
      return {
        decks: [deck],
        totalCards: deck.cards.length,
        warnings: [],
        errors: []
      };
    }

    throw new Error(`Unsupported file type: ${file.name}. Please upload a .colpkg, .apkg, .pdf, .json, or .csv file.`);
  }

  /**
   * Bulk import multiple files sequentially with progress reporting and fault tolerance
   */
  public async importMultipleFiles(
    items: {
      file: File;
      deckTitle?: string;
      category?: DeckCategory;
      selectedDeckIds?: string[];
    }[],
    onFileProgress?: (
      fileIndex: number,
      totalFiles: number,
      filename: string,
      progress: { stage: string; progress: number; message: string }
    ) => void
  ): Promise<BulkImportResult> {
    const allDecks: Deck[] = [];
    const errors: { filename: string; error: string }[] = [];
    let successfulFiles = 0;
    let failedFiles = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const filename = item.file.name;

      onFileProgress?.(i, items.length, filename, {
        stage: 'reading',
        progress: 10,
        message: `Importing file ${i + 1} of ${items.length}: ${filename}...`
      });

      try {
        const result = await this.importFile(item.file, {
          title: item.deckTitle,
          category: item.category,
          selectedDeckIds: item.selectedDeckIds,
          onProgress: (p) => {
            onFileProgress?.(i, items.length, filename, p);
          }
        });

        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors.join('; '));
        }

        if (result.decks.length === 0) {
          throw new Error(`No cards could be imported from ${filename}`);
        }

        allDecks.push(...result.decks);
        successfulFiles++;

        onFileProgress?.(i, items.length, filename, {
          stage: 'completed',
          progress: 100,
          message: `Successfully imported ${filename} (${result.totalCards} cards)!`
        });
      } catch (err: unknown) {
        failedFiles++;
        const msg = err instanceof Error ? err.message : 'Unknown import error';
        errors.push({ filename, error: msg });
        onFileProgress?.(i, items.length, filename, {
          stage: 'error',
          progress: 100,
          message: `Error importing ${filename}: ${msg}`
        });
      }
    }

    return {
      totalFiles: items.length,
      successfulFiles,
      failedFiles,
      totalDecks: allDecks.length,
      totalCards: allDecks.reduce((sum, d) => sum + d.cards.length, 0),
      decks: allDecks,
      errors
    };
  }

  /**
   * Preview contents of an Anki package file
   */
  public async previewAnkiPackage(file: File) {
    return ankiImporter.previewPackage(file);
  }
}

export const importService = new ImportService();
