import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { GlobalMusicHost } from "@/components/music/GlobalMusicHost";
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
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col selection:bg-emerald-200 selection:text-emerald-900"
      >
        {children}
        <GlobalMusicHost />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}

