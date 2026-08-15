import { DeckCategory } from '@/types';
import { ankiImporter } from './anki';
import { pdfImporter } from './pdf/pdfImporter';
import { ImportResult } from './types';
import { deckService } from '@/lib/services/deckService';

export class ImportService {
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
      return ankiImporter.importData(file, {
        defaultCategory: options?.category,
        selectedDeckIds: options?.selectedDeckIds,
        onProgress: options?.onProgress
      });
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
      const deck = await deckService.importDeckFromJson(text);
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
   * Preview contents of an Anki package file
   */
  public async previewAnkiPackage(file: File) {
    return ankiImporter.previewPackage(file);
  }
}

export const importService = new ImportService();
