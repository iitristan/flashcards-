'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Cloud, 
  CheckCircle2, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud,
  Smartphone,
  Laptop,
  Heart,
  ShieldCheck,
  Zap,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface AuthModalProps {
  user: { id: string; email?: string } | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  localDecksCount: number;
  onSyncNow: () => Promise<void>;
  onApplyThisDeviceToCloud: () => Promise<{ success: boolean; decksUploaded: number; totalCards: number }>;
  onResetLocalAndPullFromCloud: () => Promise<void>;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  syncStatus,
  localDecksCount,
  onSyncNow,
  onApplyThisDeviceToCloud,
  onResetLocalAndPullFromCloud,
  onClose,
}) => {
  const [isBusy, setIsBusy] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);

  const handleSync = async () => {
    setIsBusy(true);
    setActionType('sync');
    try {
      await onSyncNow();
      toast.success('Successfully synchronized with shared cloud!');
    } catch {
      toast.error('Sync failed. Please check network connection.');
    } finally {
      setIsBusy(false);
      setActionType(null);
    }
  };

  const handleApplyThisDevice = async () => {
    setIsBusy(true);
    setActionType('apply');
    try {
      const res = await onApplyThisDeviceToCloud();
      if (res.success) {
        toast.success(
          `Applied this device as master! ${res.decksUploaded} decks (${res.totalCards} cards) saved to Cloud.`
        );
      } else {
        toast.error('Failed to apply data to cloud. Please try again.');
      }
    } catch {
      toast.error('Error applying data to cloud.');
    } finally {
      setIsBusy(false);
      setActionType(null);
    }
  };

  const handleResetAndPull = async () => {
    const confirmed = window.confirm(
      'This will remove any local-only decks on this device and replace them with the latest data from the Cloud. Continue?'
    );
    if (!confirmed) return;

    setIsBusy(true);
    setActionType('pull');
    try {
      await onResetLocalAndPullFromCloud();
      toast.success('Local data refreshed and synced directly from Cloud!');
    } catch {
      toast.error('Failed to download from cloud.');
    } finally {
      setIsBusy(false);
      setActionType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <span>Shared Cloud Sync</span>
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Couple multi-device synchronization & real-time updates
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Status Tile */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-[var(--text-subtle)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span>Cloud Status</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Zap className="w-2.5 h-2.5" /> Realtime Active
                  </span>
                </div>
                <div className="text-xs font-semibold text-[var(--text-main)] truncate">
                  {syncStatus === 'syncing' ? 'Synchronizing with cloud...' : 'Connected • Single Source of Truth'}
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="text-xs font-bold text-[var(--primary)]">{localDecksCount}</span>
              <span className="text-[11px] text-[var(--text-muted)] block">Decks loaded</span>
            </div>
          </div>

          {/* Devices diagram */}
          <div className="flex items-center justify-center gap-3 py-1 text-xs font-medium text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
              <Laptop className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Device A (e.g. Laptop)</span>
            </div>
            <span className="text-[var(--primary)] font-bold text-sm">↔</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
              <Smartphone className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Device B (e.g. Phone)</span>
            </div>
          </div>

          {/* Master Push Action Box */}
          <div className="p-4 rounded-xl border-2 border-[var(--primary)]/30 bg-[var(--primary)]/5 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-[var(--primary)] text-white mt-0.5">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold text-[var(--text-main)]">
                  Apply This Device's Data to All Devices
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-0.5">
                  Overwrites the cloud database with all decks, flashcards, playlists, and study history from <strong>this device</strong>. Other devices will immediately sync to this exact dataset.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyThisDevice}
              disabled={isBusy}
              className="w-full py-2.5 px-4 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <UploadCloud className={`w-4 h-4 ${actionType === 'apply' ? 'animate-bounce' : ''}`} />
              <span>
                {actionType === 'apply' ? 'Pushing All Data to Cloud...' : 'Set This Device as Master & Overwrite Cloud'}
              </span>
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleSync}
              disabled={isBusy || syncStatus === 'syncing'}
              className="py-2 px-3 rounded-lg bg-[var(--bg-surface-subtle)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-[var(--border-subtle)] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' || actionType === 'sync' ? 'animate-spin' : ''}`} />
              <span>{actionType === 'sync' ? 'Syncing...' : 'Sync with Cloud'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetAndPull}
              disabled={isBusy}
              className="py-2 px-3 rounded-lg bg-[var(--bg-surface-subtle)] hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 text-[var(--text-main)] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-[var(--border-subtle)] disabled:opacity-50"
              title="Clears local cache and downloads fresh cloud copy"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Replace Local with Cloud</span>
            </button>
          </div>

          <div className="pt-2 text-[11px] text-center text-[var(--text-muted)] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span>Zero-configuration couple sync • Changes reflect automatically in real-time.</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

