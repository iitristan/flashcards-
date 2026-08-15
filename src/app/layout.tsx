import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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
  title: "NutriAnki 🥑 — Cute Nutrition & Dietetics Board Exam Reviewer",
  description: "Aesthetic, cozy, and AI-powered flashcard reviewer for Nutrition and Dietetics board exam candidates. Master Clinical MNT, Biochemistry, and Food Service Systems with Spaced Repetition.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥑</text></svg>",
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
      className={`${plusJakarta.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col selection:bg-emerald-200 selection:text-emerald-900">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
