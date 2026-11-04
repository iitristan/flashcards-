"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getNeonPool, hasNeonDatabaseUrl } from "@/lib/neon";
import type { GeneratedFlashcard } from "@/types/gemini";

export async function bulkCreateCards(
  deckId: string,
  cards: GeneratedFlashcard[],
) {
  const validCards = cards.filter(
    (card) => card.front.trim().length > 0 && card.back.trim().length > 0,
  );
  if (validCards.length === 0) throw new Error("No valid cards to save");

  if (!hasNeonDatabaseUrl) throw new Error("DATABASE_URL is not configured.");

  const pool = getNeonPool();
  const deck = await pool.query(
    "SELECT id FROM public.decks WHERE id = $1",
    [deckId],
  );
  if (deck.rowCount !== 1) throw new Error("Deck not found");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let offset = 0; offset < validCards.length; offset += 100) {
      const chunk = validCards.slice(offset, offset + 100);
      const values: string[] = [];
      const rows = chunk.map((card, index) => {
        const start = index * 4;
        values.push(
          randomUUID(),
          deckId,
          card.front.trim(),
          card.back.trim(),
        );
        return `($${start + 1}, $${start + 2}, $${start + 3}, $${start + 4})`;
      });
      await client.query(
        `INSERT INTO public.flashcards (id, deck_id, front, back)
         VALUES ${rows.join(",")}`,
        values,
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidatePath("/review");
  revalidatePath("/create");
  return { count: validCards.length };
}
