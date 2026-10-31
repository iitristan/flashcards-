"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { applyReview, getEndOfToday } from "@/lib/sm2";
import { INITIAL_DECKS } from "@/lib/data/sampleDecks";
import type { ReviewCard, ReviewRating } from "@/types";

export async function getDueCards(deckId?: string): Promise<ReviewCard[]> {
  try {
    let sql = `
      SELECT f.id, f.front, f.back, f.deck_id, f.sm2, d.title as deck_name
      FROM public.flashcards f
      JOIN public.decks d ON f.deck_id = d.id
    `;
    const params: any[] = [];

    if (deckId) {
      sql += " WHERE f.deck_id = $1";
      params.push(deckId);
    }

    const cards = await query<{
      id: string;
      front: string;
      back: string;
      deck_id: string;
      deck_name: string;
      sm2: { interval?: number; easeFactor?: number; repetitions?: number; dueDate?: string } | null;
    }>(sql, params);

    const endOfToday = getEndOfToday().getTime();

    const dueCards: ReviewCard[] = [];
    for (const c of cards) {
      const sm2 = c.sm2 || {};
      const dueTime = sm2.dueDate ? new Date(sm2.dueDate).getTime() : 0;
      if (dueTime <= endOfToday || !sm2.dueDate) {
        dueCards.push({
          id: c.id,
          front: c.front,
          back: c.back,
          deckId: c.deck_id,
          deckName: c.deck_name,
          interval: sm2.interval || 1,
          easeFactor: sm2.easeFactor || 2.5,
          repetitions: sm2.repetitions || 0,
        });
      }
    }

    if (dueCards.length === 0 && cards.length === 0) {
      const decks = deckId ? INITIAL_DECKS.filter((d) => d.id === deckId) : INITIAL_DECKS;
      for (const d of decks) {
        for (const c of d.cards) {
          dueCards.push({
            id: c.id,
            front: c.front,
            back: c.back,
            deckId: d.id,
            deckName: d.title,
            interval: c.sm2?.interval || 1,
            easeFactor: c.sm2?.easeFactor || 2.5,
            repetitions: c.sm2?.repetitions || 0,
          });
        }
      }
    }

    return dueCards;
  } catch (err) {
    console.error("Error fetching due cards:", err);
    return [];
  }
}

export async function getDueCountByDeck(): Promise<
  { id: string; name: string; dueCount: number }[]
> {
  try {
    const decks = await query<{ id: string; title: string }>(
      "SELECT id, title FROM public.decks ORDER BY title ASC"
    );

    const allCards = await query<{
      id: string;
      deck_id: string;
      sm2: { dueDate?: string } | null;
    }>("SELECT id, deck_id, sm2 FROM public.flashcards");

    const endOfToday = getEndOfToday().getTime();
    const countByDeck = new Map<string, number>();

    for (const c of allCards) {
      const dueTime = c.sm2?.dueDate ? new Date(c.sm2.dueDate).getTime() : 0;
      if (dueTime <= endOfToday || !c.sm2?.dueDate) {
        countByDeck.set(c.deck_id, (countByDeck.get(c.deck_id) || 0) + 1);
      }
    }

    return decks.map((deck) => ({
      id: deck.id,
      name: deck.title,
      dueCount: countByDeck.get(deck.id) || 0,
    }));
  } catch (err) {
    console.error("Error fetching due count by deck from PostgreSQL:", err);
    return [];
  }
}

export async function submitReview(cardId: string, rating: ReviewRating) {
  const card = await queryOne<{
    id: string;
    leitner_box: number;
    sm2: { interval: number; easeFactor: number; repetitions: number; dueDate: string } | null;
  }>("SELECT id, leitner_box, sm2 FROM public.flashcards WHERE id = $1", [cardId]);

  if (!card) {
    throw new Error("Card not found");
  }

  const currentSm2 = card.sm2 || {
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    dueDate: new Date().toISOString(),
  };

  const updated = applyReview(
    {
      interval: currentSm2.interval || 0,
      easeFactor: currentSm2.easeFactor || 2.5,
      repetitions: currentSm2.repetitions || 0,
      dueDate: new Date(currentSm2.dueDate || new Date().toISOString()),
    },
    rating
  );

  const newLeitner = rating === "again" ? 1 : Math.min(5, (card.leitner_box || 1) + 1);

  await query(`
    UPDATE public.flashcards
    SET sm2 = $1,
        leitner_box = $2,
        last_reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = $3
  `, [JSON.stringify(updated), newLeitner, cardId]);

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidatePath("/review");

  return updated;
}
