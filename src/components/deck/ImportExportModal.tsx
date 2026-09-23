'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Upload,
  Download, 
  FileText,
  Check, 
  Package, 
  FileCheck, 
  Loader2, 
  Sparkles 
} from 'lucide-react';
import { Deck, DeckCategory } from '@/types';
import { deckService } from '@/lib/services/deckService';
import { useNutriStore } from '@/lib/store/useNutriStore';
import { ankiImporter, AnkiDeckPreview } from '@/lib/importers/anki';
import { pdfImporter } from '@/lib/importers/pdf/pdfImporter';
import { parseQuizletExamText } from '@/lib/importers/pdf/quizletPdfParser';
import { toast } from 'sonner';

interface ImportExportModalProps {
  decks: Deck[];
  selectedDeckId?: string | null;
  onImportSuccess: () => void;
  onClose: () => void;
}

type ImportTabMode = 'anki' | 'pdf';

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  decks,
  selectedDeckId,
  onImportSuccess,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importType, setImportType] = useState<ImportTabMode>('anki');
  
  // Anki Import State
  const ankiFileInputRef = useRef<HTMLInputElement>(null);
  const [ankiFile, setAnkiFile] = useState<File | null>(null);
  const [ankiPreview, setAnkiPreview] = useState<{ decks: AnkiDeckPreview[]; totalCards: number; hasMedia: boolean } | null>(null);
  const [selectedAnkiDeckIds, setSelectedAnkiDeckIds] = useState<string[]>([]);
  const [ankiProgressMsg, setAnkiProgressMsg] = useState<string>('');
  const [ankiProgressPercent, setAnkiProgressPercent] = useState<number>(0);

  // PDF Import State
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDeckTitle, setPdfDeckTitle] = useState('Food Service - NDLE 2021 Exam');
  const [pdfCategory, setPdfCategory] = useState<DeckCategory>('Food Service Systems');
  const [pdfExtractedCards, setPdfExtractedCards] = useState<number>(0);

  // Export state
  const [exportDeckId, setExportDeckId] = useState<string>(selectedDeckId || decks[0]?.id || '');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle Anki file selection and preview
  const handleAnkiFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnkiFile(file);
    setIsProcessing(true);
    setAnkiProgressMsg('Analyzing collection database...');

    try {
      const preview = await ankiImporter.previewPackage(file);
      setAnkiPreview(preview);
      setSelectedAnkiDeckIds(preview.decks.map(d => d.id));
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

  // Handle Anki Import Execution
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

  // Handle PDF File Selection and Parsing
  const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  // Handle PDF Import Execution
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

  // One-click preload Food Service deck
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

  // Handle Export
  const handleExport = async () => {
    if (!exportDeckId) {
      toast.error('Please select a deck to export');
      return;
    }

    try {
      const targetDeck = decks.find(d => d.id === exportDeckId);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-export-title"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-[var(--modal-shadow)] overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="import-export-title" className="text-lg font-black text-[var(--text-main)]">
                Import & Export Flashcards
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Anki collection (.colpkg) and Quizlet Exam PDFs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close import and export modal"
            className="p-2 rounded-2xl text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div
          role="tablist"
          aria-label="Import or export options"
          className="flex border-b border-[var(--border-subtle)] px-6 pt-2 bg-[var(--bg-surface-subtle)]/50"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'import'}
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
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
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
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
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {activeTab === 'import' ? (
            <div className="space-y-4">
              {/* Import Type Selector Pills */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportType('anki')}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                    importType === 'anki'
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)]'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Anki (.colpkg / .apkg)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportType('pdf')}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                    importType === 'pdf'
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)]'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Quizlet PDF</span>
                </button>
              </div>

              {/* 1. ANKI (.colpkg / .apkg) TAB */}
              {importType === 'anki' && (
                <div className="space-y-4">
                  <div className="relative border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)] rounded-3xl p-6 text-center cursor-pointer bg-[var(--bg-surface-subtle)]/40 hover:bg-[var(--primary-light)]/20 transition-all space-y-2 group overflow-hidden">
                    <input
                      ref={ankiFileInputRef}
                      type="file"
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
                        Supports .colpkg, .apkg, media & SQLite
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
                            onClick={() => setSelectedAnkiDeckIds(ankiPreview.decks.map(d => d.id))}
                            className="text-[11px] text-[var(--primary)] hover:underline"
                          >
                            Select All
                          </button>
                          <span className="text-[var(--text-subtle)]">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedAnkiDeckIds([])}
                            className="text-[11px] text-[var(--text-subtle)] hover:underline"
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
                                      setSelectedAnkiDeckIds(selectedAnkiDeckIds.filter(id => id !== d.id));
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

              {/* 2. QUIZLET / EXAM PDF TAB */}
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
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all flex-shrink-0 active:scale-95"
                    >
                      Import 200 Cards
                    </button>
                  </div>

                  {/* Dropzone for custom PDFs */}
                  <div className="relative border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)] rounded-3xl p-6 text-center cursor-pointer bg-[var(--bg-surface-subtle)]/40 hover:bg-[var(--primary-light)]/20 transition-all space-y-2 group overflow-hidden">
                    <input
                      ref={pdfFileInputRef}
                      type="file"
                      accept=".pdf,application/pdf,*/*"
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
                        Auto-detects numbered questions, choices A–D, answer keys & explanations
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
                          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] outline-none"
                        >
                          <option value="Food Service Systems">Food Service Systems</option>
                          <option value="Clinical Nutrition">Clinical Nutrition</option>
                          <option value="Nutritional Biochemistry">Nutritional Biochemistry</option>
                          <option value="Public Health & Community">Public Health & Community</option>
                          <option value="Maternal & Child Nutrition">Maternal & Child Nutrition</option>
                          <option value="General Dietetics">General Dietetics</option>
                        </select>
                      </div>
                      <div className="col-span-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
                        <Check className="w-3.5 h-3.5" /> Ready to import {pdfExtractedCards} parsed questions
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Export tab */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1">
                  Select Deck to Export
                </label>
                <select
                  value={exportDeckId}
                  onChange={(e) => setExportDeckId(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
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
                    className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all ${
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
                    className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all ${
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
        <div className="flex items-center justify-between p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/30">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
          >
            Close
          </button>

          {activeTab === 'import' ? (
            importType === 'anki' ? (
              <button
                onClick={handleImportAnki}
                disabled={isProcessing || !ankiFile || selectedAnkiDeckIds.length === 0}
                className="px-6 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isProcessing ? 'Importing Anki Decks...' : `Import ${selectedAnkiDeckIds.length} Selected Decks`}</span>
              </button>
            ) : (
              <button
                onClick={handleImportPdf}
                disabled={isProcessing || !pdfFile}
                className="px-6 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isProcessing ? 'Importing PDF...' : 'Import Parsed PDF Cards'}</span>
              </button>
            )
          ) : (
            <button
              onClick={handleExport}
              disabled={!exportDeckId}
              className="px-6 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
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
