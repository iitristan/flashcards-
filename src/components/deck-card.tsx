"use client";

import Link from "next/link";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { createDeck, deleteDeck, renameDeck } from "@/actions/decks";
import type { DeckWithStats } from "@/types";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { DeckFormDialog } from "@/components/deck-form-dialog";

interface DeckCardProps {
  deck: DeckWithStats;
}

export function DeckCard({ deck }: DeckCardProps) {
  async function handleDelete() {
    if (!confirm(`Delete "${deck.name}" and all its cards?`)) return;
    await deleteDeck(deck.id);
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">
            <Link href={`/review/${deck.id}`} className="hover:underline">
              {deck.name}
            </Link>
          </CardTitle>
          <CardDescription>{deck.totalCards} cards</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={buttonVariants({
              variant: "ghost",
              size: "icon",
              className: "h-8 w-8",
            })}
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DeckFormDialog
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
              }
              title="Rename deck"
              description="Choose a new name for this deck."
              defaultName={deck.name}
              submitLabel="Save"
              onSubmit={async (name) => renameDeck(deck.id, name)}
            />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={deck.dueToday > 0 ? "default" : "secondary"}>
            {deck.dueToday} due today
          </Badge>
          <Badge variant="outline">{deck.masteryPercent}% mastery</Badge>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Mastery</span>
            <span>{deck.masteryPercent}%</span>
          </div>
          <Progress value={deck.masteryPercent} />
        </div>
        {deck.dueToday > 0 && (
          <Link
            href={`/review/${deck.id}`}
            className={buttonVariants({ className: "w-full" })}
          >
            Study now
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export function CreateDeckCard() {
  return (
    <DeckFormDialog
      trigger={
        <Card className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:bg-muted/50">
          <CardContent className="flex flex-col items-center gap-2 py-10">
            <span className="text-3xl text-muted-foreground">+</span>
            <span className="text-sm font-medium">Create deck</span>
          </CardContent>
        </Card>
      }
      title="Create deck"
      description="Give your new deck a name."
      submitLabel="Create"
      onSubmit={createDeck}
    />
  );
}
