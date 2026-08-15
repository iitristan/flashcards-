"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GeneratedFlashcard } from "@/types/gemini";

export async function bulkCreateCards(
  deckId: string,
  cards: GeneratedFlashcard[]
) {
  const user = await getAuthUser();

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: user.id },
  });

  if (!deck) {
    throw new Error("Deck not found");
  }

  const validCards = cards.filter(
    (c) => c.front.trim().length > 0 && c.back.trim().length > 0
  );

  if (validCards.length === 0) {
    throw new Error("No valid cards to save");
  }

  await prisma.flashcard.createMany({
    data: validCards.map((card) => ({
      deckId,
      front: card.front.trim(),
      back: card.back.trim(),
    })),
  });

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidatePath("/review");
  revalidatePath("/create");

  return { count: validCards.length };
}
