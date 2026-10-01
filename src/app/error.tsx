'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, Home, AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console for diagnostic purposes
    console.error('[Nutriboard Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-main,#f8fafc)] text-[var(--text-main,#0f172a)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--bg-surface,#ffffff)] border border-[var(--border-color,#e2e8f0)] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shadow-xs">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main,#0f172a)]">
            This page couldn't load
          </h1>
          <p className="text-xs text-[var(--text-muted,#64748b)] leading-relaxed">
            A temporary problem occurred while preparing this part of the app. Your flashcard progress is securely stored locally.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle,#f1f5f9)] border border-[var(--border-subtle,#cbd5e1)] text-[11px] text-[var(--text-subtle,#475569)] font-mono text-left max-h-24 overflow-y-auto break-all">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              try {
                reset();
              } catch {
                window.location.reload();
              }
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--primary,#0f766e)] hover:bg-[var(--primary-hover,#115e59)] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload to Try Again</span>
          </button>

          <Link
            href="/"
            onClick={() => {
              try {
                reset();
              } catch {}
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--bg-surface-subtle,#f1f5f9)] hover:bg-[var(--border-color,#e2e8f0)] text-[var(--text-main,#0f172a)] border border-[var(--border-color,#cbd5e1)] text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go Back Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
