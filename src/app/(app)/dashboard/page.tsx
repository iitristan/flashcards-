import Link from "next/link";
import { Layers, Play, Sparkles } from "lucide-react";
import { getDecksWithStats } from "@/actions/decks";
import { getDueCards } from "@/actions/review";
import { CreateDeckCard, DeckCard } from "@/components/deck-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

async function DashboardStats() {
  const [decks, dueCards] = await Promise.all([
    getDecksWithStats(),
    getDueCards(),
  ]);

  const totalCards = decks.reduce((sum, d) => sum + d.totalCards, 0);
  const dueToday = dueCards.length;
  const avgMastery =
    decks.length === 0
      ? 0
      : Math.round(
          decks.reduce((sum, d) => sum + d.masteryPercent, 0) / decks.length
        );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total cards</CardDescription>
            <CardTitle className="text-3xl">{totalCards}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Due today</CardDescription>
            <CardTitle className="text-3xl">{dueToday}</CardTitle>
          </CardHeader>
          <CardContent>
            {dueToday > 0 && (
              <Link href="/review" className={buttonVariants({ size: "sm" })}>
                <Play className="mr-2 h-4 w-4" />
                Start review
              </Link>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg mastery</CardDescription>
            <CardTitle className="text-3xl">{avgMastery}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your decks</h2>
          <div className="flex gap-2">
            <Link
              href="/create"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Create with AI
            </Link>
            <Link
              href="/decks"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Layers className="mr-2 h-4 w-4" />
              Manage decks
            </Link>
          </div>
        </div>

        {decks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-muted-foreground">
                No decks yet. Create one to get started.
              </p>
              <CreateDeckCard />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
            <CreateDeckCard />
          </div>
        )}
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your study progress
        </p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  );
}
