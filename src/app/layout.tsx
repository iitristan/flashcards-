import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { GlobalMusicHost } from "@/components/music/GlobalMusicHost";
import { BrowserExtensionNoiseFilter } from "@/components/common/BrowserExtensionNoiseFilter";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NutriAnki — Nutrition & Dietetics Board Reviewer",
  description: "High-yield academic flashcard review and board examination workspace. Master Clinical MNT, Nutritional Biochemistry, and Food Service Systems with Spaced Repetition and Cloud Sync.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230F766E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3'/><path d='M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4'/><circle cx='20' cy='10' r='2'/></svg>",
  }
};

const NOISE_FILTER_SCRIPT = `
(function() {
  if (typeof window === 'undefined') return;

  function shouldSuppress(err) {
    if (!err) return true;
    var text = '';
    try {
      if (typeof err === 'string') {
        text = err;
      } else if (err instanceof Error) {
        text = (err.name || '') + ' ' + (err.message || '') + ' ' + (err.stack || '');
      } else if (typeof err === 'object') {
        var parts = [];
        var keys = ['message', 'stack', 'name', 'details', 'reason', 'code', 'data', 'description'];
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          if (err[k] !== undefined && err[k] !== null) {
            parts.push(String(err[k]));
          }
        }
        text = parts.join(' ');
      }
    } catch (e) {
      text = '';
    }

    var lower = text.toLowerCase();
    if (
      lower.indexOf('metamask') !== -1 ||
      lower.indexOf('nkbihfbeogaeaoehlefnkodbefgpgknn') !== -1 ||
      lower.indexOf('chrome-extension') !== -1 ||
      lower.indexOf('moz-extension') !== -1 ||
      lower.indexOf('failed to connect') !== -1 ||
      lower.indexOf('error restoring session') !== -1 ||
      lower.indexOf('inpage.js') !== -1
    ) {
      return true;
    }

    if (typeof err === 'object' && !(err instanceof Error)) {
      if (!err.stack || String(err.stack).indexOf('/src/') === -1) {
        return true;
      }
    }

    return false;
  }

  // Intercept addEventListener so Next.js onUnhandledRejection / onUnhandledError never receives extension noise
  var originalAdd = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    if (type === 'unhandledrejection' && typeof listener === 'function') {
      var wrapped = function(event) {
        if (shouldSuppress(event && event.reason)) {
          try {
            if (event.preventDefault) event.preventDefault();
            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          } catch(e) {}
          return;
        }
        return listener.apply(this, arguments);
      };
      return originalAdd.call(this, type, wrapped, options);
    }
    if (type === 'error' && typeof listener === 'function') {
      var wrappedErr = function(event) {
        var isExt = Boolean(event && event.filename && (event.filename.indexOf('chrome-extension://') !== -1 || event.filename.indexOf('moz-extension://') !== -1));
        if (isExt || shouldSuppress(event && event.error)) {
          try {
            if (event.preventDefault) event.preventDefault();
            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          } catch(e) {}
          return;
        }
        return listener.apply(this, arguments);
      };
      return originalAdd.call(this, type, wrappedErr, options);
    }
    return originalAdd.apply(this, arguments);
  };

  // Direct capture-phase listeners on window
  originalAdd.call(window, 'unhandledrejection', function(event) {
    if (shouldSuppress(event && event.reason)) {
      try {
        if (event.preventDefault) event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      } catch(e) {}
    }
  }, true);

  originalAdd.call(window, 'error', function(event) {
    var isExt = Boolean(event && event.filename && (event.filename.indexOf('chrome-extension://') !== -1 || event.filename.indexOf('moz-extension://') !== -1));
    if (isExt || shouldSuppress(event && event.error)) {
      try {
        if (event.preventDefault) event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      } catch(e) {}
    }
  }, true);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="matcha"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${nunito.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NOISE_FILTER_SCRIPT }} />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col selection:bg-emerald-200 selection:text-emerald-900"
      >
        <script dangerouslySetInnerHTML={{ __html: NOISE_FILTER_SCRIPT }} />
        <BrowserExtensionNoiseFilter />
        {children}
        <GlobalMusicHost />
        <Toaster
          position="bottom-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              maxWidth: 'calc(100vw - 32px)',
              margin: '0 auto',
              fontSize: '13px',
              lineHeight: '1.4',
              borderRadius: '14px',
            },
          }}
        />
      </body>
    </html>
  );
}
