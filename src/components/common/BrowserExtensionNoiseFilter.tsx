'use client';

import { useEffect } from 'react';

/**
 * Filter out unhandled rejections and runtime errors originating from third-party
 * browser extensions (such as MetaMask inpage.js) that would otherwise trigger
 * Next.js dev overlay with "[object Object]" via coerceError / onUnhandledRejection.
 */
function shouldSuppress(err: unknown): boolean {
  if (!err) return true;

  let text = '';
  try {
    if (typeof err === 'string') {
      text = err;
    } else if (err instanceof Error) {
      text = `${err.name || ''} ${err.message || ''} ${err.stack || ''}`;
    } else if (typeof err === 'object') {
      // Safely extract properties without JSON.stringify to avoid circular reference exceptions
      const parts: string[] = [];
      const keys = ['message', 'stack', 'name', 'details', 'reason', 'code', 'data', 'description'];
      const record = err as Record<string, unknown>;
      for (const k of keys) {
        if (record[k] !== undefined && record[k] !== null) {
          parts.push(String(record[k]));
        }
      }
      text = parts.join(' ');
    }
  } catch {
    text = '';
  }

  const lower = text.toLowerCase();
  if (
    lower.includes('metamask') ||
    lower.includes('nkbihfbeogaeaoehlefnkodbefgpgknn') ||
    lower.includes('chrome-extension') ||
    lower.includes('moz-extension') ||
    lower.includes('failed to connect') ||
    lower.includes('error restoring session') ||
    lower.includes('inpage.js')
  ) {
    return true;
  }

  // Non-Error plain objects that would coerce to "[object Object]" and lack internal application stack
  if (typeof err === 'object' && !(err instanceof Error)) {
    const errorWithStack = err as { stack?: string };
    if (!errorWithStack.stack || !String(errorWithStack.stack).includes('/src/')) {
      return true;
    }
  }

  return false;
}

export function BrowserExtensionNoiseFilter() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (shouldSuppress(event.reason)) {
        try {
          event.preventDefault();
          event.stopImmediatePropagation();
        } catch {
          /* noop */
        }
      }
    };

    const handleError = (event: ErrorEvent) => {
      const isExt =
        Boolean(event.filename) &&
        (event.filename.includes('chrome-extension://') || event.filename.includes('moz-extension://'));
      if (isExt || shouldSuppress(event.error)) {
        try {
          event.preventDefault();
          event.stopImmediatePropagation();
        } catch {
          /* noop */
        }
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    window.addEventListener('error', handleError, true);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      window.removeEventListener('error', handleError, true);
    };
  }, []);

  return null;
}
