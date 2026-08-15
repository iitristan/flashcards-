"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyReview } from "@/lib/sm2";
import type { ReviewCard, ReviewRating } from "@/types";

export async function getDueCards(deckId?: string): Promise<ReviewCard[]> {
  const user = await getAuthUser();
  const now = new Date();

  const cards = await prisma.flashcard.findMany({
    where: {
      dueDate: { lte: now },
      deck: {
        userId: user.id,
        ...(deckId ? { id: deckId } : {}),
      },
    },
    include: { deck: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
  });

  return cards.map((card) => ({
    id: card.id,
    front: card.front,
    back: card.back,
    deckId: card.deckId,
    deckName: card.deck.name,
    interval: card.interval,
    easeFactor: card.easeFactor,
    repetitions: card.repetitions,
  }));
}

export async function getDueCountByDeck(): Promise<
  { id: string; name: string; dueCount: number }[]
> {
  const user = await getAuthUser();
  const now = new Date();

  const decks = await prisma.deck.findMany({
    where: { userId: user.id },
    include: {
      cards: {
        where: { dueDate: { lte: now } },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return decks.map((deck) => ({
    id: deck.id,
    name: deck.name,
    dueCount: deck.cards.length,
  }));
}

export async function submitReview(cardId: string, rating: ReviewRating) {
  const user = await getAuthUser();

  const card = await prisma.flashcard.findFirst({
    where: {
      id: cardId,
      deck: { userId: user.id },
    },
  });

  if (!card) {
    throw new Error("Card not found");
  }

  const updated = applyReview(
    {
      interval: card.interval,
      easeFactor: card.easeFactor,
      repetitions: card.repetitions,
      dueDate: card.dueDate,
    },
    rating
  );

  await prisma.flashcard.update({
    where: { id: cardId },
    data: {
      interval: updated.interval,
      easeFactor: updated.easeFactor,
      repetitions: updated.repetitions,
      dueDate: updated.dueDate,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidatePath("/review");

  return updated;
}
