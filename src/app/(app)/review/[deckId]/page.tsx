import { notFound } from "next/navigation";
import { getDeckStats } from "@/actions/decks";
import { getDueCards } from "@/actions/review";
import { ReviewSession } from "@/components/review-session";

interface ReviewDeckPageProps {
  params: Promise<{ deckId: string }>;
}

export default async function ReviewDeckPage({ params }: ReviewDeckPageProps) {
  const { deckId } = await params;

  if (deckId === "all") {
    const cards = await getDueCards();
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review All</h1>
          <p className="text-muted-foreground">All due cards across decks</p>
        </div>
        <ReviewSession initialCards={cards} />
      </div>
    );
  }

  const [deck, cards] = await Promise.all([
    getDeckStats(deckId),
    getDueCards(deckId),
  ]);

  if (!deck) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{deck.name}</h1>
        <p className="text-muted-foreground">
          {cards.length} card{cards.length === 1 ? "" : "s"} due
        </p>
      </div>
      <ReviewSession initialCards={cards} deckName={deck.name} />
    </div>
  );
}
