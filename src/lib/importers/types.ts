import { Deck, DeckCategory } from '@/types';

export interface ImportProgress {
  stage: 'reading' | 'extracting' | 'parsing_database' | 'processing_cards' | 'extracting_media' | 'completed' | 'error';
  progress: number; // 0 to 100
  message: string;
}

export interface AnkiImportOptions {
  categoryMapping?: Record<string, DeckCategory>;
  defaultCategory?: DeckCategory;
  includeMedia?: boolean;
  selectedDeckIds?: (string | number)[];
  onProgress?: (progress: ImportProgress) => void;
}

export interface PdfImportOptions {
  deckTitle?: string;
  category?: DeckCategory;
  tags?: string[];
  onProgress?: (progress: ImportProgress) => void;
}

export interface ImportResult {
  decks: Deck[];
  totalCards: number;
  warnings: string[];
  errors: string[];
}

export type ImportableFileFormat = 'anki' | 'pdf' | 'csv' | 'json' | 'unknown';

export interface BulkImportItem {
  id: string;
  file: File;
  filename: string;
  fileSize: number;
  format: ImportableFileFormat;
  status: 'pending' | 'previewing' | 'ready' | 'importing' | 'success' | 'error';
  deckTitle: string;
  category: DeckCategory;
  estimatedCards: number;
  detectedDecksCount: number;
  selected: boolean;
  progress: number;
  progressMessage?: string;
  errorMessage?: string;
}

export interface BulkImportResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalDecks: number;
  totalCards: number;
  decks: Deck[];
  errors: { filename: string; error: string }[];
}

export interface AnkiRawDeck {
  id: number | string;
  name: string;
  desc?: string;
  mtime_secs?: number;
}

export interface AnkiRawModel {
  id: number | string;
  name: string;
  flds: { name: string; ord: number }[];
  tmpls: { name: string; ord: number; qfmt?: string; afmt?: string }[];
  css?: string;
}

export interface AnkiRawNote {
  id: number;
  mid: number;
  tags: string[];
  flds: string[];
  sfld?: string;
}

export interface AnkiRawCard {
  id: number;
  nid: number;
  did: number | string;
  ord: number;
  type: number;
  queue: number;
  due: number;
  ivl: number;
  factor: number;
  reps: number;
  lapses: number;
}

export interface AnkiCollectionData {
  decks: AnkiRawDeck[];
  models: Map<number | string, AnkiRawModel>;
  notes: Map<number, AnkiRawNote>;
  cards: AnkiRawCard[];
  mediaMap: Map<string, string>; // numeric zip filename (e.g. "0") -> real filename (e.g. "image.jpg")
  crt: number; // collection creation timestamp in seconds
}

export interface IImporter<TInput = File | ArrayBuffer | Uint8Array, TOptions = unknown> {
  canHandle(fileOrData: TInput, filename?: string): boolean;
  importData(fileOrData: TInput, options?: TOptions): Promise<ImportResult>;
}
