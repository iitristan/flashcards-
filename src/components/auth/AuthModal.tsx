'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Cloud, 
  CheckCircle2, 
  RefreshCw, 
  UploadCloud, 
  Smartphone,
  Laptop,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';

interface AuthModalProps {
  user: { id: string; email?: string } | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  localDecksCount: number;
  onSyncNow: () => Promise<void>;
  onUploadLocalToCloud: () => Promise<void>;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  syncStatus,
  localDecksCount,
  onSyncNow,
  onUploadLocalToCloud,
  onClose,
}) => {
  const [isBusy, setIsBusy] = useState(false);

  const handleSync = async () => {
    setIsBusy(true);
    try {
      await onSyncNow();
      toast.success('Successfully synchronized with shared cloud!');
    } catch {
      toast.error('Sync failed. Please check network connection.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpload = async () => {
    setIsBusy(true);
    try {
      await onUploadLocalToCloud();
      toast.success('Local decks uploaded to shared cloud!');
    } catch {
      toast.error('Upload failed. Please check network connection.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 flex items-center justify-center text-lg">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <span>Shared Cloud Sync</span>
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Instant sync across your phone & laptop
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Status Tile */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-[var(--text-subtle)] font-bold uppercase tracking-wider">
                Workspace Status
              </div>
              <div className="text-xs font-semibold text-[var(--text-main)] truncate">
                {syncStatus === 'syncing' ? 'Synchronizing with cloud...' : 'Connected & Ready'}
              </div>
            </div>
          </div>

          {/* Devices diagram */}
          <div className="flex items-center justify-center gap-3 py-2 text-xs font-medium text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
              <Laptop className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Laptop</span>
            </div>
            <span className="text-[var(--primary)] font-bold">↔</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
              <Smartphone className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Phone / Tablet</span>
            </div>
          </div>

          {/* Sync Actions */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleSync}
              disabled={isBusy || syncStatus === 'syncing'}
              className="w-full py-2.5 px-4 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' || isBusy ? 'animate-spin' : ''}`} />
              <span>{syncStatus === 'syncing' || isBusy ? 'Syncing with Cloud...' : 'Sync Now'}</span>
            </button>

            {localDecksCount > 0 && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={isBusy}
                className="w-full py-2 px-4 rounded-lg bg-[var(--bg-surface-subtle)] hover:bg-[var(--border-color)] text-[var(--text-main)] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-[var(--border-subtle)]"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Upload Local Decks ({localDecksCount}) to Cloud</span>
              </button>
            )}
          </div>

          <div className="pt-1 text-[11px] text-center text-[var(--text-muted)] leading-relaxed">
            No login or password required. Your study progress and cards are automatically shared between both of your devices.
          </div>
        </div>
      </motion.div>
    </div>
  );
};
