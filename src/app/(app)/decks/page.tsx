import { getDecksWithStats } from "@/actions/decks";
import { CreateDeckCard, DeckCard } from "@/components/deck-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { DeckFormDialog } from "@/components/deck-form-dialog";
import { createDeck } from "@/actions/decks";

export default async function DecksPage() {
  const decks = await getDecksWithStats();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Decks</h1>
          <p className="text-muted-foreground">
            Create, rename, or delete your flashcard decks
          </p>
        </div>
        <DeckFormDialog
          trigger={<Button>New deck</Button>}
          title="Create deck"
          description="Give your new deck a name."
          submitLabel="Create"
          onSubmit={createDeck}
        />
      </div>

      {decks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">
              You don&apos;t have any decks yet.
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
  );
}
