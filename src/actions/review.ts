"use server";

import { revalidatePath } from "next/cache";
import { getNeonPool, hasNeonDatabaseUrl } from "@/lib/neon";
import { applyReview } from "@/lib/sm2";
import { INITIAL_DECKS } from "@/lib/data/sampleDecks";
import type { ReviewCard, ReviewRating, Sm2Data } from "@/types";

function parseSm2(value: unknown): Sm2Data {
  if (typeof value === "string") {
    try {
      return parseSm2(JSON.parse(value));
    } catch {
      return { interval: 0, easeFactor: 2.5, repetitions: 0, dueDate: new Date().toISOString() };
    }
  }
  if (value && typeof value === "object") {
    const data = value as Partial<Sm2Data>;
    if (typeof data.dueDate === "string" && !Number.isNaN(Date.parse(data.dueDate))) {
      return {
        interval: Number(data.interval) || 0,
        easeFactor: Number(data.easeFactor) || 2.5,
        repetitions: Number(data.repetitions) || 0,
        dueDate: data.dueDate,
      };
    }
  }
  return { interval: 0, easeFactor: 2.5, repetitions: 0, dueDate: new Date().toISOString() };
}

export async function getDueCards(deckId?: string): Promise<ReviewCard[]> {
  if (!hasNeonDatabaseUrl) {
    const decks = deckId
      ? INITIAL_DECKS.filter((deck) => deck.id === deckId)
      : INITIAL_DECKS;
    return decks.flatMap((deck) =>
      deck.cards.map((card) => ({
        id: card.id,
        front: card.front,
        back: card.back,
        deckId: deck.id,
        deckName: deck.title,
        interval: card.sm2?.interval || 1,
        easeFactor: card.sm2?.easeFactor || 2.5,
        repetitions: card.sm2?.repetitions || 0,
      })),
    );
  }

  const { rows } = await getNeonPool().query<{
    id: string;
    front: string;
    back: string;
    deck_id: string;
    deck_name: string;
    sm2: unknown;
  }>(
    `SELECT f.id, f.front, f.back, f.deck_id, d.title AS deck_name, f.sm2
     FROM public.flashcards f
     JOIN public.decks d ON d.id = f.deck_id
     WHERE ($1::text IS NULL OR f.deck_id = $1)
     ORDER BY f.created_at ASC`,
    [deckId ?? null],
  );
  const now = Date.now();

  return rows.flatMap((card) => {
    const sm2 = parseSm2(card.sm2);
    if (new Date(sm2.dueDate).getTime() > now) return [];
    return [{
      id: card.id,
      front: card.front,
      back: card.back,
      deckId: card.deck_id,
      deckName: card.deck_name,
      interval: sm2.interval,
      easeFactor: sm2.easeFactor,
      repetitions: sm2.repetitions,
    }];
  });
}

export async function getDueCountByDeck(): Promise<
  { id: string; name: string; dueCount: number }[]
> {
  if (!hasNeonDatabaseUrl) {
    return INITIAL_DECKS.map((deck) => ({
      id: deck.id,
      name: deck.title,
      dueCount: deck.cards.length,
    }));
  }

  const { rows } = await getNeonPool().query<{
    id: string;
    name: string;
    sm2: unknown;
  }>(
    `SELECT d.id, d.title AS name, f.sm2
     FROM public.decks d
     LEFT JOIN public.flashcards f ON f.deck_id = d.id
     ORDER BY d.title ASC`,
  );
  const dueCounts = new Map<string, { id: string; name: string; dueCount: number }>();
  const now = Date.now();

  for (const row of rows) {
    const deck = dueCounts.get(row.id) || { id: row.id, name: row.name, dueCount: 0 };
    if (row.sm2 && new Date(parseSm2(row.sm2).dueDate).getTime() <= now) {
      deck.dueCount++;
    }
    dueCounts.set(row.id, deck);
  }

  return Array.from(dueCounts.values());
}

export async function submitReview(cardId: string, rating: ReviewRating) {
  const { rows } = await getNeonPool().query<{ sm2: unknown }>(
    "SELECT sm2 FROM public.flashcards WHERE id = $1",
    [cardId],
  );
  if (!rows[0]) throw new Error("Card not found");

  const sm2 = parseSm2(rows[0].sm2);
  const updated = applyReview({ ...sm2, dueDate: new Date(sm2.dueDate) }, rating);
  const result = await getNeonPool().query(
    `UPDATE public.flashcards
     SET sm2 = $2::jsonb, updated_at = NOW()
     WHERE id = $1`,
    [cardId, JSON.stringify(updated)],
  );
  if (result.rowCount !== 1) throw new Error("Card not found");

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidatePath("/review");
  return updated;
}
