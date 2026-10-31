"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne, withTransaction } from "@/lib/db";
import type { GeneratedFlashcard } from "@/types/gemini";

export async function bulkCreateCards(
  deckId: string,
  cards: GeneratedFlashcard[]
) {
  const validCards = cards.filter(
    (c) => c.front.trim().length > 0 && c.back.trim().length > 0
  );

  if (validCards.length === 0) {
    throw new Error("No valid cards to save");
  }

  const deck = await queryOne<{ id: string }>(
    "SELECT id FROM public.decks WHERE id = $1",
    [deckId]
  );

  if (!deck) {
    throw new Error("Deck not found");
  }

  await withTransaction(async (client) => {
    for (const card of validCards) {
      const cardId = `card-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await client.query(`
        INSERT INTO public.flashcards (
          id, deck_id, front, back, rationale, options, tags, sm2, updated_at
        ) VALUES (
          $1, $2, $3, $4, '', '[]'::jsonb, '[]'::jsonb,
          '{"interval":0,"easeFactor":2.5,"repetitions":0,"dueDate":""}'::jsonb,
          NOW()
        )
      `, [cardId, deckId, card.front.trim(), card.back.trim()]);
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidatePath("/review");
  revalidatePath("/create");

  return { count: validCards.length };
}
