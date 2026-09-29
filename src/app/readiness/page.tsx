"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BoardReadinessView } from "@/components/study/BoardReadinessView";

export default function BoardReadinessPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Nutriboard Hub</span>
          </Link>
        </div>

        <BoardReadinessView />
      </div>
    </div>
  );
}
