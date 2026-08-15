import Link from "next/link";
import { getDueCountByDeck } from "@/actions/review";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ReviewPage() {
  const decks = await getDueCountByDeck();
  const totalDue = decks.reduce((sum, d) => sum + d.dueCount, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Review Session</h1>
        <p className="text-muted-foreground">
          Choose a deck or review all due cards
        </p>
      </div>

      {totalDue === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium">No cards due right now</p>
            <p className="mt-2 text-muted-foreground">
              Come back later or add new cards with AI.
            </p>
            <Link href="/create" className={buttonVariants({ className: "mt-6" })}>
              Create with AI
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All decks</CardTitle>
              <CardDescription>
                Review every card that is due across all decks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/review/all" className={buttonVariants()}>
                Study all ({totalDue} cards)
              </Link>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {decks
              .filter((d) => d.dueCount > 0)
              .map((deck) => (
                <Card key={deck.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{deck.name}</p>
                      <Badge variant="secondary" className="mt-1">
                        {deck.dueCount} due
                      </Badge>
                    </div>
                    <Link href={`/review/${deck.id}`} className={buttonVariants()}>
                      Study
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
