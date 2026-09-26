'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload,
  Download, 
  FileText,
  Check, 
  Package, 
  FileCheck, 
  Loader2, 
  Sparkles,
  Files,
  FileSpreadsheet,
  Code2,
  Trash2,
  AlertCircle,
  Plus,
  CheckCircle2,
  FolderUp,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Deck, DeckCategory } from '@/types';
import { deckService } from '@/lib/services/deckService';
import { useNutriStore } from '@/lib/store/useNutriStore';
import { ankiImporter, AnkiDeckPreview } from '@/lib/importers/anki';
import { pdfImporter } from '@/lib/importers/pdf/pdfImporter';
import { parseQuizletExamText } from '@/lib/importers/pdf/quizletPdfParser';
import { importService } from '@/lib/importers/importService';
import { ImportableFileFormat } from '@/lib/importers/types';
import { toast } from 'sonner';

interface ImportExportModalProps {
  decks: Deck[];
  selectedDeckId?: string | null;
  onImportSuccess: () => void;
  onClose: () => void;
}

type ImportTabMode = 'bulk' | 'anki' | 'pdf' | 'csv_json';

export interface QueuedImportFile {
  id: string;
  file: File;
  name: string;
  size: number;
  format: ImportableFileFormat;
  status: 'pending' | 'previewing' | 'ready' | 'importing' | 'success' | 'error';
  deckTitle: string;
  category: DeckCategory;
  estimatedCards: number;
  detectedDecksCount: number;
  selected: boolean;
  progress: number;
  progressMessage?: string;
  error?: string;
}

const CATEGORIES: DeckCategory[] = [
  'Food Service Systems',
  'Clinical Nutrition',
  'Nutritional Biochemistry',
  'Public Health & Community',
  'Maternal & Child Nutrition',
  'General Dietetics'
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFormatBadge(format: ImportableFileFormat) {
  switch (format) {
    case 'anki':
      return {
        label: 'Anki (.apkg)',
        bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        icon: Package
      };
    case 'pdf':
      return {
        label: 'PDF Exam',
        bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        icon: FileText
      };
    case 'csv':
      return {
        label: 'CSV / TSV',
        bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        icon: FileSpreadsheet
      };
    case 'json':
      return {
        label: 'JSON Deck',
        bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        icon: Code2
      };
    default:
      return {
        label: 'Unknown',
        bg: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
        icon: AlertCircle
      };
  }
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  decks,
  selectedDeckId,
  onImportSuccess,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importType, setImportType] = useState<ImportTabMode>('bulk');

  // Bulk Upload State
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [queuedFiles, setQueuedFiles] = useState<QueuedImportFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkOverallMessage, setBulkOverallMessage] = useState<string>('');
  const [bulkImportCompletedSummary, setBulkImportCompletedSummary] = useState<{
    successfulFiles: number;
    totalDecks: number;
    totalCards: number;
  } | null>(null);

  // Anki Single/Detailed Import State
  const ankiFileInputRef = useRef<HTMLInputElement>(null);
  const [ankiFile, setAnkiFile] = useState<File | null>(null);
  const [ankiPreview, setAnkiPreview] = useState<{ decks: AnkiDeckPreview[]; totalCards: number; hasMedia: boolean } | null>(null);
  const [selectedAnkiDeckIds, setSelectedAnkiDeckIds] = useState<string[]>([]);
  const [ankiProgressMsg, setAnkiProgressMsg] = useState<string>('');
  const [ankiProgressPercent, setAnkiProgressPercent] = useState<number>(0);

  // PDF Single Import State
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDeckTitle, setPdfDeckTitle] = useState('Food Service - NDLE 2021 Exam');
  const [pdfCategory, setPdfCategory] = useState<DeckCategory>('Food Service Systems');
  const [pdfExtractedCards, setPdfExtractedCards] = useState<number>(0);

  // CSV/JSON Single/Direct Import State
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvDeckTitle, setCsvDeckTitle] = useState('');
  const [csvCategory, setCsvCategory] = useState<DeckCategory>('General Dietetics');
  const [csvDetectedCards, setCsvDetectedCards] = useState<number>(0);

  // Export state
  const [exportDeckId, setExportDeckId] = useState<string>(selectedDeckId || decks[0]?.id || '');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');
  const [isProcessing, setIsProcessing] = useState(false);

  // ---------------------------------------------------------------------------
  // Bulk File Queue Management & Preview Pipeline
  // ---------------------------------------------------------------------------
  const handleFilesAdded = (files: File[]) => {
    if (!files || files.length === 0) return;

    setBulkImportCompletedSummary(null);

    const newItems: QueuedImportFile[] = files.map((file) => {
      const format = importService.detectFormat(file.name);
      const fallbackTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        file,
        name: file.name,
        size: file.size,
        format,
        status: 'pending',
        deckTitle: fallbackTitle,
        category: 'General Dietetics',
        estimatedCards: 0,
        detectedDecksCount: 1,
        selected: true,
        progress: 0
      };
    });

    setQueuedFiles((prev) => [...prev, ...newItems]);
  };

  // Preview pending items in background
  useEffect(() => {
    const pendingItem = queuedFiles.find((f) => f.status === 'pending');
    if (!pendingItem) return;

    let isMounted = true;

    // Mark as previewing
    setQueuedFiles((prev) =>
      prev.map((item) => (item.id === pendingItem.id ? { ...item, status: 'previewing' } : item))
    );

    importService
      .previewFile(pendingItem.file)
      .then((preview) => {
        if (!isMounted) return;
        setQueuedFiles((prev) =>
          prev.map((item) => {
            if (item.id !== pendingItem.id) return item;
            return {
              ...item,
              status: preview.error ? 'error' : 'ready',
              deckTitle: preview.title || item.deckTitle,
              category: preview.category || item.category,
              estimatedCards: preview.cardsCount,
              detectedDecksCount: preview.decksCount || 1,
              error: preview.error
            };
          })
        );
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to analyze file';
        setQueuedFiles((prev) =>
          prev.map((item) => (item.id === pendingItem.id ? { ...item, status: 'error', error: msg } : item))
        );
      });

    return () => {
      isMounted = false;
    };
  }, [queuedFiles]);

  const handleRemoveQueueItem = (id: string) => {
    setQueuedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleSelectAll = (select: boolean) => {
    setQueuedFiles((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const handleClearQueue = () => {
    setQueuedFiles([]);
    setBulkImportCompletedSummary(null);
  };

  // ---------------------------------------------------------------------------
  // Bulk Import Execution
  // ---------------------------------------------------------------------------
  const handleExecuteBulkImport = async () => {
    const toImport = queuedFiles.filter((item) => item.selected && item.status !== 'error');
    if (toImport.length === 0) {
      toast.error('No valid files selected for import');
      return;
    }

    setIsProcessing(true);
    setBulkImportCompletedSummary(null);

    const allImportedDecks: Deck[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toImport.length; i++) {
      const current = toImport[i];

      // Update current item to importing
      setQueuedFiles((prev) =>
        prev.map((it) =>
          it.id === current.id
            ? { ...it, status: 'importing', progress: 15, progressMessage: 'Preparing...' }
            : it
        )
      );

      setBulkOverallMessage(`Importing ${i + 1} of ${toImport.length}: ${current.name}...`);

      try {
        const res = await importService.importFile(current.file, {
          title: current.deckTitle,
          category: current.category,
          onProgress: (p) => {
            setQueuedFiles((prev) =>
              prev.map((it) =>
                it.id === current.id
                  ? { ...it, progress: p.progress, progressMessage: p.message }
                  : it
              )
            );
          }
        });

        if (res.errors.length > 0) {
          throw new Error(res.errors.join('; '));
        }

        if (res.decks.length === 0) {
          throw new Error('No flashcards found in this file');
        }

        allImportedDecks.push(...res.decks);
        successCount++;

        setQueuedFiles((prev) =>
          prev.map((it) =>
            it.id === current.id
              ? { ...it, status: 'success', progress: 100, progressMessage: 'Imported!' }
              : it
          )
        );
      } catch (err: unknown) {
        failCount++;
        const msg = err instanceof Error ? err.message : 'Import failed';
        setQueuedFiles((prev) =>
          prev.map((it) =>
            it.id === current.id
              ? { ...it, status: 'error', error: msg, progressMessage: 'Failed' }
              : it
          )
        );
      }
    }

    setIsProcessing(false);
    setBulkOverallMessage('');

    if (allImportedDecks.length > 0) {
      await useNutriStore.getState().importMultipleDecks(allImportedDecks);

      const totalCards = allImportedDecks.reduce((sum, d) => sum + d.cards.length, 0);
      setBulkImportCompletedSummary({
        successfulFiles: successCount,
        totalDecks: allImportedDecks.length,
        totalCards
      });

      toast.success(
        `Bulk import complete! Added ${allImportedDecks.length} deck${
          allImportedDecks.length > 1 ? 's' : ''
        } with ${totalCards} cards! 🎉`
      );

      onImportSuccess();
    } else {
      toast.error(`All ${failCount} files failed to import. Please check file contents.`);
    }
  };

  // ---------------------------------------------------------------------------
  // Dedicated Tab Handlers (Anki / PDF / CSV) with multi-file auto routing
  // ---------------------------------------------------------------------------
  const handleAnkiFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 1) {
      // Multiple Anki files selected: route directly to Bulk Upload
      handleFilesAdded(files);
      setImportType('bulk');
      toast.info(`Added ${files.length} Anki packages to the Bulk Upload queue!`);
      e.target.value = '';
      return;
    }

    const file = files[0];
    setAnkiFile(file);
    setIsProcessing(true);
    setAnkiProgressMsg('Analyzing collection database...');

    try {
      const preview = await ankiImporter.previewPackage(file);
      setAnkiPreview(preview);
      setSelectedAnkiDeckIds(preview.decks.map((d) => d.id));
      toast.success(`Found ${preview.decks.length} decks with ${preview.totalCards} cards!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse Anki package';
      toast.error(msg);
      setAnkiFile(null);
      setAnkiPreview(null);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleImportAnki = async () => {
    if (!ankiFile) {
      toast.error('Please select an Anki .colpkg or .apkg file');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await ankiImporter.importData(ankiFile, {
        selectedDeckIds: selectedAnkiDeckIds,
        onProgress: (p) => {
          setAnkiProgressMsg(p.message);
          setAnkiProgressPercent(p.progress);
        }
      });

      if (result.errors.length > 0) {
        throw new Error(result.errors.join('; '));
      }

      await useNutriStore.getState().importMultipleDecks(result.decks);
      toast.success(`Imported ${result.decks.length} decks (${result.totalCards} cards) successfully! 🎉`);
      onImportSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Anki import failed';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 1) {
      // Multiple PDFs selected: route directly to Bulk Upload
      handleFilesAdded(files);
      setImportType('bulk');
      toast.info(`Added ${files.length} exam PDFs to the Bulk Upload queue!`);
      e.target.value = '';
      return;
    }

    const file = files[0];
    setPdfFile(file);
    setIsProcessing(true);

    try {
      const rawText = await pdfImporter.extractTextFromPdf(file);
      const parsed = parseQuizletExamText(rawText);
      if (parsed.cards.length === 0) {
        toast.error('No flashcards found in this PDF. Please ensure it has numbered questions with answers or rationales.');
        setPdfExtractedCards(0);
      } else {
        setPdfExtractedCards(parsed.cards.length);
        setPdfDeckTitle(parsed.title || file.name.replace(/\.[^/.]+$/, ''));
        setPdfCategory(parsed.category);
        toast.success(`Parsed ${parsed.cards.length} questions from ${file.name}!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse PDF';
      toast.error(msg);
      setPdfFile(null);
      setPdfExtractedCards(0);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleImportPdf = async () => {
    if (!pdfFile) {
      toast.error('Please select a PDF file first');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await pdfImporter.importData(pdfFile, {
        deckTitle: pdfDeckTitle,
        category: pdfCategory
      });

      if (result.decks.length === 0 || result.totalCards === 0) {
        throw new Error('No flashcards could be parsed from this PDF');
      }

      await useNutriStore.getState().importMultipleDecks(result.decks);
      toast.success(`Created deck "${result.decks[0]?.title}" with ${result.totalCards} cards! 🎉`);
      onImportSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PDF import failed';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCsvFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 1) {
      handleFilesAdded(files);
      setImportType('bulk');
      toast.info(`Added ${files.length} spreadsheet files to Bulk Upload queue!`);
      e.target.value = '';
      return;
    }

    const file = files[0];
    setCsvFile(file);
    setIsProcessing(true);

    try {
      const preview = await importService.previewFile(file);
      if (preview.error) {
        toast.error(preview.error);
        setCsvFile(null);
        setCsvDetectedCards(0);
      } else {
        setCsvDetectedCards(preview.cardsCount);
        setCsvDeckTitle(preview.title);
        setCsvCategory(preview.category);
        toast.success(`Detected ${preview.cardsCount} cards in ${file.name}!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse file';
      toast.error(msg);
      setCsvFile(null);
      setCsvDetectedCards(0);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleImportCsv = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV or JSON file first');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await importService.importFile(csvFile, {
        title: csvDeckTitle,
        category: csvCategory
      });

      if (result.decks.length === 0 || result.totalCards === 0) {
        throw new Error('No flashcards could be parsed from this file');
      }

      await useNutriStore.getState().importMultipleDecks(result.decks);
      toast.success(`Imported ${result.decks.length} deck(s) with ${result.totalCards} cards! 🎉`);
      onImportSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadFoodServiceDeck = async () => {
    setIsProcessing(true);
    try {
      const deck = await deckService.importQuizletFoodServiceDeck();
      toast.success(`Imported "${deck.title}" with ${deck.cards.length} board exam questions! 🥑`);
      onImportSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load deck';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Export Handling
  // ---------------------------------------------------------------------------
  const handleExport = async () => {
    if (!exportDeckId) {
      toast.error('Please select a deck to export');
      return;
    }

    try {
      const targetDeck = decks.find((d) => d.id === exportDeckId);
      const titleSlug = (targetDeck?.title || 'deck').toLowerCase().replace(/[^a-z0-9]/g, '_');

      let fileData: string;
      let fileType: string;
      let fileName: string;

      if (exportFormat === 'json') {
        fileData = await deckService.exportDeckToJson(exportDeckId);
        fileType = 'application/json';
        fileName = `nutrianki_${titleSlug}.json`;
      } else {
        fileData = await deckService.exportDeckToCsv(exportDeckId);
        fileType = 'text/csv;charset=utf-8;';
        fileName = `nutrianki_${titleSlug}.csv`;
      }

      const blob = new Blob([fileData], { type: fileType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${fileName} successfully!`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Export failed';
      toast.error(errorMsg);
    }
  };

  // Selected files count & total cards in queue
  const selectedQueuedFiles = queuedFiles.filter((f) => f.selected);
  const totalSelectedCards = selectedQueuedFiles.reduce((sum, f) => sum + f.estimatedCards, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-export-title"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="w-full max-w-3xl rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-[var(--modal-shadow)] overflow-hidden my-6 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[var(--border-subtle)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 id="import-export-title" className="text-lg font-black text-[var(--text-main)]">
                Import & Export Flashcards
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Bulk upload Anki collections, exam PDFs, CSV spreadsheets, & JSON decks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close import and export modal"
            className="p-2 rounded-2xl text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: Import vs Export */}
        <div
          role="tablist"
          aria-label="Import or export options"
          className="flex border-b border-[var(--border-subtle)] px-6 pt-2 bg-[var(--bg-surface-subtle)]/40 flex-shrink-0"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'import'}
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'import'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Decks & Cards</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'export'}
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'export'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Deck</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {activeTab === 'import' ? (
            <div className="space-y-4">
              {/* Import Type Selector Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setImportType('bulk')}
                  className={`py-2 px-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                    importType === 'bulk'
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span className="truncate">Bulk Upload</span>
                  {queuedFiles.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-[var(--primary)] text-white text-[10px] rounded-full font-bold">
                      {queuedFiles.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setImportType('anki')}
                  className={`py-2 px-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    importType === 'anki'
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)]'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Anki Package</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportType('pdf')}
                  className={`py-2 px-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    importType === 'pdf'
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)]'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Quizlet PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportType('csv_json')}
                  className={`py-2 px-2.5 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    importType === 'csv_json'
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)]'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">CSV / JSON</span>
                </button>
              </div>

              {/* ----------------------------------------------------------- */}
              {/* TAB 1: BULK MULTI-FORMAT UPLOAD                             */}
              {/* ----------------------------------------------------------- */}
              {importType === 'bulk' && (
                <div className="space-y-4">
                  {/* Multi-File Dropzone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const files = Array.from(e.dataTransfer.files || []);
                      handleFilesAdded(files);
                    }}
                    onClick={() => bulkFileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all space-y-2 group overflow-hidden ${
                      isDragging
                        ? 'border-[var(--primary)] bg-[var(--primary-light)]/40 scale-[1.01]'
                        : 'border-[var(--border-color)] hover:border-[var(--primary)] bg-[var(--bg-surface-subtle)]/40 hover:bg-[var(--primary-light)]/20'
                    }`}
                  >
                    <input
                      ref={bulkFileInputRef}
                      type="file"
                      multiple
                      accept=".colpkg,.apkg,.zip,.bin,.pdf,.csv,.tsv,.txt,.json,application/pdf,application/json,text/csv,text/plain"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        handleFilesAdded(files);
                        e.target.value = '';
                      }}
                      className="hidden"
                      aria-label="Upload multiple importable flashcard files"
                    />

                    <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FolderUp className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-black text-[var(--text-main)]">
                        {isDragging ? 'Drop your files here to import!' : 'Drag & drop multiple files, or click to browse'}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Select any combination of Anki packages, Quizlet PDFs, CSV spreadsheets, and JSON decks
                      </p>
                    </div>

                    {/* Supported file extension badges */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        .apkg / .colpkg
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        .pdf
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        .csv / .tsv
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        .json
                      </span>
                    </div>
                  </div>

                  {/* Summary of Last Bulk Import if completed */}
                  {bulkImportCompletedSummary && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 font-bold">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div>
                          <span>
                            Imported {bulkImportCompletedSummary.totalDecks} deck(s) with{' '}
                            {bulkImportCompletedSummary.totalCards} cards across{' '}
                            {bulkImportCompletedSummary.successfulFiles} file(s)!
                          </span>
                          <p className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 mt-0.5">
                            All cards have been saved and indexed in your local reviewer library.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Bulk Overall Progress Banner */}
                  {isProcessing && bulkOverallMessage && (
                    <div className="p-3.5 rounded-2xl bg-[var(--primary-light)]/40 border border-[var(--primary)]/30 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
                        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                        <span>{bulkOverallMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* Upload Queue Section */}
                  {queuedFiles.length > 0 && (
                    <div className="space-y-3">
                      {/* Queue Controls Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[var(--text-main)] pb-2 border-b border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-[var(--primary)]" />
                            <span>Queued Files ({queuedFiles.length})</span>
                          </span>
                          <span className="text-[11px] font-bold text-[var(--primary)] bg-[var(--primary-light)] px-2.5 py-0.5 rounded-full">
                            ~{totalSelectedCards} cards selected
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectAll(true)}
                            className="text-[var(--primary)] hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-[var(--text-subtle)]">|</span>
                          <button
                            type="button"
                            onClick={() => handleToggleSelectAll(false)}
                            className="text-[var(--text-subtle)] hover:underline cursor-pointer"
                          >
                            Deselect All
                          </button>
                          <span className="text-[var(--text-subtle)]">|</span>
                          <button
                            type="button"
                            onClick={() => bulkFileInputRef.current?.click()}
                            className="text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add More</span>
                          </button>
                          <span className="text-[var(--text-subtle)]">|</span>
                          <button
                            type="button"
                            onClick={handleClearQueue}
                            className="text-rose-500 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Queued Items List */}
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        <AnimatePresence>
                          {queuedFiles.map((item) => {
                            const badge = getFormatBadge(item.format);
                            const BadgeIcon = badge.icon;

                            return (
                              <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`p-3 rounded-2xl border transition-all ${
                                  item.selected
                                    ? 'border-[var(--border-color)] bg-[var(--bg-surface)] shadow-xs'
                                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/30 opacity-60'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  {/* Left: Checkbox & File Info */}
                                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={item.selected}
                                      disabled={isProcessing}
                                      onChange={(e) => {
                                        setQueuedFiles((prev) =>
                                          prev.map((f) =>
                                            f.id === item.id ? { ...f, selected: e.target.checked } : f
                                          )
                                        );
                                      }}
                                      className="mt-1 rounded text-[var(--primary)] cursor-pointer"
                                    />

                                    <div className="space-y-1 min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                                        >
                                          <BadgeIcon className="w-3 h-3" />
                                          <span>{badge.label}</span>
                                        </span>

                                        <span className="text-xs font-bold text-[var(--text-main)] truncate max-w-[200px] sm:max-w-xs">
                                          {item.name}
                                        </span>

                                        <span className="text-[10px] text-[var(--text-subtle)]">
                                          ({formatFileSize(item.size)})
                                        </span>
                                      </div>

                                      {/* Editable Deck Title & Category Picker */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                        <div>
                                          <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-0.5">
                                            Deck Name
                                          </label>
                                          <input
                                            type="text"
                                            value={item.deckTitle}
                                            disabled={isProcessing || item.status === 'success'}
                                            onChange={(e) => {
                                              const newTitle = e.target.value;
                                              setQueuedFiles((prev) =>
                                                prev.map((f) =>
                                                  f.id === item.id ? { ...f, deckTitle: newTitle } : f
                                                )
                                              );
                                            }}
                                            placeholder="Deck title..."
                                            className="w-full px-2.5 py-1 text-xs rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                                          />
                                        </div>

                                        <div>
                                          <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-0.5">
                                            Category
                                          </label>
                                          <select
                                            value={item.category}
                                            disabled={isProcessing || item.status === 'success'}
                                            onChange={(e) => {
                                              const newCat = e.target.value as DeckCategory;
                                              setQueuedFiles((prev) =>
                                                prev.map((f) =>
                                                  f.id === item.id ? { ...f, category: newCat } : f
                                                )
                                              );
                                            }}
                                            className="w-full px-2.5 py-1 text-xs rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-[var(--text-main)] outline-none cursor-pointer"
                                          >
                                            {CATEGORIES.map((cat) => (
                                              <option key={cat} value={cat}>
                                                {cat}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>

                                      {/* Status / Error feedback */}
                                      {item.status === 'error' && item.error && (
                                        <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 pt-1">
                                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                          <span>{item.error}</span>
                                        </p>
                                      )}

                                      {/* Progress Bar during active import */}
                                      {item.status === 'importing' && (
                                        <div className="space-y-1 pt-1">
                                          <div className="flex items-center justify-between text-[10px] text-[var(--primary)] font-bold">
                                            <span>{item.progressMessage || 'Importing...'}</span>
                                            <span>{item.progress}%</span>
                                          </div>
                                          <div className="w-full h-1 bg-black/10 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-[var(--primary)] transition-all duration-300"
                                              style={{ width: `${item.progress}%` }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Card Count Badge & Trash Button */}
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {item.status === 'previewing' ? (
                                      <span className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1 bg-[var(--bg-surface-subtle)] px-2 py-0.5 rounded-full">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Analyzing...</span>
                                      </span>
                                    ) : item.status === 'success' ? (
                                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        <span>Imported</span>
                                      </span>
                                    ) : item.status === 'ready' ? (
                                      <span className="text-[11px] font-bold text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.5 rounded-full">
                                        {item.estimatedCards} cards
                                      </span>
                                    ) : null}

                                    <button
                                      type="button"
                                      disabled={isProcessing}
                                      onClick={() => handleRemoveQueueItem(item.id)}
                                      className="p-1.5 rounded-xl text-[var(--text-subtle)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      title="Remove from queue"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* TAB 2: ANKI (.colpkg / .apkg) TAB                           */}
              {/* ----------------------------------------------------------- */}
              {importType === 'anki' && (
                <div className="space-y-4">
                  <div className="relative border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)] rounded-3xl p-6 text-center cursor-pointer bg-[var(--bg-surface-subtle)]/40 hover:bg-[var(--primary-light)]/20 transition-all space-y-2 group overflow-hidden">
                    <input
                      ref={ankiFileInputRef}
                      type="file"
                      multiple
                      accept=".colpkg,.apkg,.zip,.bin,application/octet-stream,application/zip,application/x-zip-compressed,*/*"
                      onChange={handleAnkiFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      aria-label="Upload Anki collection (.colpkg) or deck package (.apkg)"
                    />
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center group-hover:scale-110 transition-transform pointer-events-none">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 pointer-events-none">
                      <p className="text-xs font-extrabold text-[var(--text-main)]">
                        {ankiFile ? ankiFile.name : 'Tap or drop Anki .colpkg or .apkg file here'}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Supports multiple packages, SQLite parsing, sub-decks, & media
                      </p>
                    </div>
                  </div>

                  {/* Anki Deck Preview & Selective Checkbox List */}
                  {ankiPreview && (
                    <div className="space-y-2 border border-[var(--border-color)] rounded-2xl p-4 bg-[var(--bg-surface)]">
                      <div className="flex items-center justify-between text-xs font-bold text-[var(--text-main)] pb-2 border-b border-[var(--border-subtle)]">
                        <span>Decks in Collection ({ankiPreview.decks.length})</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAnkiDeckIds(ankiPreview.decks.map((d) => d.id))}
                            className="text-[11px] text-[var(--primary)] hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-[var(--text-subtle)]">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedAnkiDeckIds([])}
                            className="text-[11px] text-[var(--text-subtle)] hover:underline cursor-pointer"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {ankiPreview.decks.map((d) => {
                          const isChecked = selectedAnkiDeckIds.includes(d.id);
                          return (
                            <label
                              key={d.id}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-surface-subtle)] cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAnkiDeckIds([...selectedAnkiDeckIds, d.id]);
                                    } else {
                                      setSelectedAnkiDeckIds(selectedAnkiDeckIds.filter((id) => id !== d.id));
                                    }
                                  }}
                                  className="rounded text-[var(--primary)]"
                                />
                                <span className="font-semibold text-[var(--text-main)] truncate">{d.name}</span>
                              </div>
                              <span className="text-[11px] font-bold text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.5 rounded-full flex-shrink-0">
                                {d.cardCount} cards
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Progress Indicator */}
                  {isProcessing && ankiProgressMsg && (
                    <div className="p-3 rounded-2xl bg-[var(--primary-light)]/40 border border-[var(--primary)]/30 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{ankiProgressMsg}</span>
                      </div>
                      {ankiProgressPercent > 0 && (
                        <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--primary)] transition-all duration-300"
                            style={{ width: `${ankiProgressPercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* TAB 3: QUIZLET / EXAM PDF TAB                               */}
              {/* ----------------------------------------------------------- */}
              {importType === 'pdf' && (
                <div className="space-y-4">
                  {/* One click Food Service 2021 button */}
                  <div className="p-4 rounded-3xl bg-gradient-to-tr from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-2 border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Preloaded Reviewer
                      </span>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                        Food Service - NDLE 2021 Exam (200 cards with full rationales)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadFoodServiceDeck}
                      disabled={isProcessing}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all flex-shrink-0 active:scale-95 cursor-pointer"
                    >
                      Import 200 Cards
                    </button>
                  </div>

                  {/* Dropzone for custom PDFs */}
                  <div className="relative border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)] rounded-3xl p-6 text-center cursor-pointer bg-[var(--bg-surface-subtle)]/40 hover:bg-[var(--primary-light)]/20 transition-all space-y-2 group overflow-hidden">
                    <input
                      ref={pdfFileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,application/pdf"
                      onChange={handlePdfFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      aria-label="Upload Quizlet or Exam PDF"
                    />
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center group-hover:scale-110 transition-transform pointer-events-none">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 pointer-events-none">
                      <p className="text-xs font-extrabold text-[var(--text-main)]">
                        {pdfFile ? pdfFile.name : 'Tap or drop any Quizlet or Exam PDF here'}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Auto-detects numbered questions, choices A–D, answer keys & explanations. Multiple PDFs supported!
                      </p>
                    </div>
                  </div>

                  {pdfExtractedCards > 0 && (
                    <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1">
                          Deck Name
                        </label>
                        <input
                          type="text"
                          value={pdfDeckTitle}
                          onChange={(e) => setPdfDeckTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1">
                          Category
                        </label>
                        <select
                          value={pdfCategory}
                          onChange={(e) => setPdfCategory(e.target.value as DeckCategory)}
                          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] outline-none cursor-pointer"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
                        <Check className="w-3.5 h-3.5" /> Ready to import {pdfExtractedCards} parsed questions
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* TAB 4: CSV / TSV / JSON TAB                                 */}
              {/* ----------------------------------------------------------- */}
              {importType === 'csv_json' && (
                <div className="space-y-4">
                  <div className="relative border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)] rounded-3xl p-6 text-center cursor-pointer bg-[var(--bg-surface-subtle)]/40 hover:bg-[var(--primary-light)]/20 transition-all space-y-2 group overflow-hidden">
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      multiple
                      accept=".csv,.tsv,.txt,.json,text/csv,application/json"
                      onChange={handleCsvFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      aria-label="Upload CSV, TSV, or JSON flashcard file"
                    />
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center group-hover:scale-110 transition-transform pointer-events-none">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 pointer-events-none">
                      <p className="text-xs font-extrabold text-[var(--text-main)]">
                        {csvFile ? csvFile.name : 'Tap or drop CSV, TSV, or JSON files here'}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Supports Excel/Quizlet exports (Question, Answer, Rationale) and NutriAnki JSON backups
                      </p>
                    </div>
                  </div>

                  {csvDetectedCards > 0 && (
                    <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1">
                          Deck Name
                        </label>
                        <input
                          type="text"
                          value={csvDeckTitle}
                          onChange={(e) => setCsvDeckTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1">
                          Category
                        </label>
                        <select
                          value={csvCategory}
                          onChange={(e) => setCsvCategory(e.target.value as DeckCategory)}
                          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] outline-none cursor-pointer"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
                        <Check className="w-3.5 h-3.5" /> Ready to import {csvDetectedCards} flashcards
                      </div>
                    </div>
                  )}

                  {/* Format cheat sheet */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[11px] space-y-1 text-[var(--text-muted)]">
                    <p className="font-bold text-[var(--text-main)] flex items-center gap-1">
                      <span>💡 CSV Format Columns</span>
                    </p>
                    <p className="font-mono text-[10px] text-[var(--text-subtle)]">
                      Column 1: Question | Column 2: Answer | Column 3 (opt): Rationale | Column 4: Tags
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ------------------------------------------------------------- */
            /* EXPORT TAB                                                    */
            /* ------------------------------------------------------------- */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1">
                  Select Deck to Export
                </label>
                <select
                  value={exportDeckId}
                  onChange={(e) => setExportDeckId(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] outline-none focus:border-[var(--primary)] cursor-pointer"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.cards.length} cards)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1">
                  Export Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    CSV (Excel / Quizlet / Anki)
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all cursor-pointer ${
                      exportFormat === 'json'
                        ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    JSON (Full NutriAnki Backup)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/30 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
          >
            Close
          </button>

          {activeTab === 'import' ? (
            importType === 'bulk' ? (
              <button
                onClick={handleExecuteBulkImport}
                disabled={isProcessing || selectedQueuedFiles.length === 0}
                className="px-6 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>
                  {isProcessing
                    ? 'Importing Files...'
                    : selectedQueuedFiles.length === 0
                    ? 'Select Files to Import'
                    : `Import ${selectedQueuedFiles.length} Selected File${
                        selectedQueuedFiles.length > 1 ? 's' : ''
                      } (~${totalSelectedCards} cards)`}
                </span>
              </button>
            ) : importType === 'anki' ? (
              <button
                onClick={handleImportAnki}
                disabled={isProcessing || !ankiFile || selectedAnkiDeckIds.length === 0}
                className="px-6 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>
                  {isProcessing
                    ? 'Importing Anki Decks...'
                    : `Import ${selectedAnkiDeckIds.length} Selected Decks`}
                </span>
              </button>
            ) : importType === 'pdf' ? (
              <button
                onClick={handleImportPdf}
                disabled={isProcessing || !pdfFile || pdfExtractedCards === 0}
                className="px-6 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isProcessing ? 'Importing PDF...' : `Import ${pdfExtractedCards} Parsed Cards`}</span>
              </button>
            ) : (
              <button
                onClick={handleImportCsv}
                disabled={isProcessing || !csvFile || csvDetectedCards === 0}
                className="px-6 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isProcessing ? 'Importing...' : `Import ${csvDetectedCards} Cards`}</span>
              </button>
            )
          ) : (
            <button
              onClick={handleExport}
              disabled={!exportDeckId}
              className="px-6 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
