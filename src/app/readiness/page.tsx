"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BoardReadinessView } from "@/components/study/BoardReadinessView";

import { useRouter } from "next/navigation";
import { useNutriStore } from "@/lib/store/useNutriStore";
import { toast } from "sonner";

export default function BoardReadinessPage() {
  const router = useRouter();
  const { startPracticeAreaSession } = useNutriStore();

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

        <BoardReadinessView
          onStartSubjectPractice={async (subject, searchTxt, filter, sort, options) => {
            try {
              await startPracticeAreaSession(subject, {
                searchQuery: searchTxt,
                filter,
                sort,
                resume: options?.resume,
                startFresh: options?.startFresh,
                missedOnly: options?.missedOnly,
                limit: options?.limit,
              });
              router.push("/");
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Failed to launch practice";
              toast.error(msg);
            }
          }}
        />
      </div>
    </div>
  );
}
