"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getNeonPool, hasNeonDatabaseUrl } from "@/lib/neon";
import { getEndOfToday } from "@/lib/sm2";
import { INITIAL_DECKS } from "@/lib/data/sampleDecks";
import type { DeckWithStats } from "@/types";

type DeckStatsRow = {
  id: string;
  name: string;
  total_cards: number;
  due_today: number;
  mastered_cards: number;
};

async function getDeckStatsRows(deckId?: string): Promise<DeckStatsRow[]> {
  const { rows } = await getNeonPool().query<DeckStatsRow>(
    `SELECT d.id,
            d.title AS name,
            COUNT(f.id)::int AS total_cards,
            COUNT(f.id) FILTER (
              WHERE COALESCE(NULLIF(f.sm2->>'dueDate', '')::timestamptz, NOW()) <= $1
            )::int AS due_today,
            COUNT(f.id) FILTER (
              WHERE COALESCE(NULLIF(f.sm2->>'interval', '')::int, 0) >= 21
                 OR COALESCE(NULLIF(f.sm2->>'repetitions', '')::int, 0) >= 3
            )::int AS mastered_cards
     FROM public.decks d
     LEFT JOIN public.flashcards f ON f.deck_id = d.id
     WHERE ($2::text IS NULL OR d.id = $2)
     GROUP BY d.id
     ORDER BY d.updated_at DESC NULLS LAST`,
    [getEndOfToday(), deckId ?? null],
  );
  return rows;
}

function toDeckWithStats(row: DeckStatsRow): DeckWithStats {
  return {
    id: row.id,
    name: row.name,
    totalCards: row.total_cards,
    dueToday: row.due_today,
    masteryPercent:
      row.total_cards === 0
        ? 0
        : Math.round((row.mastered_cards / row.total_cards) * 100),
  };
}

export async function getDecksWithStats(): Promise<DeckWithStats[]> {
  if (!hasNeonDatabaseUrl) {
    return INITIAL_DECKS.map((deck) => {
      const totalCards = deck.cards.length;
      const masteredCards = deck.cards.filter(
        (card) => (card.sm2?.interval || 0) >= 21 || (card.sm2?.repetitions || 0) >= 3,
      ).length;
      return {
        id: deck.id,
        name: deck.title,
        totalCards,
        dueToday: totalCards,
        masteryPercent: totalCards === 0 ? 0 : Math.round((masteredCards / totalCards) * 100),
      };
    });
  }

  const rows = await getDeckStatsRows();
  return rows.map(toDeckWithStats);
}

export async function getDeckNames(): Promise<{ id: string; name: string }[]> {
  if (!hasNeonDatabaseUrl) {
    return INITIAL_DECKS.map((deck) => ({ id: deck.id, name: deck.title }));
  }

  const { rows } = await getNeonPool().query<{ id: string; name: string }>(
    `SELECT id, title AS name
     FROM public.decks
     ORDER BY title ASC`,
  );
  return rows;
}

export async function createDeck(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Deck name is required");

  const id = randomUUID();
  const { rows } = await getNeonPool().query<{
    id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
  }>(
    `INSERT INTO public.decks (id, title)
     VALUES ($1, $2)
     RETURNING id, title AS name, created_at, updated_at`,
    [id, trimmed],
  );

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidatePath("/create");
  return {
    id: rows[0].id,
    name: rows[0].name,
    createdAt: rows[0].created_at,
    updatedAt: rows[0].updated_at,
  };
}

export async function renameDeck(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Deck name is required");

  const result = await getNeonPool().query(
    `UPDATE public.decks
     SET title = $2, updated_at = NOW()
     WHERE id = $1`,
    [id, trimmed],
  );
  if (result.rowCount !== 1) throw new Error("Deck not found");

  revalidatePath("/dashboard");
  revalidatePath("/decks");
}

export async function deleteDeck(id: string) {
  const client = await getNeonPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM public.flashcards WHERE deck_id = $1", [id]);
    const result = await client.query("DELETE FROM public.decks WHERE id = $1", [id]);
    if (result.rowCount !== 1) throw new Error("Deck not found");
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
}

export async function getDeckStats(id: string): Promise<DeckWithStats | null> {
  if (!hasNeonDatabaseUrl) {
    const sample = INITIAL_DECKS.find((deck) => deck.id === id);
    if (!sample) return null;
    return toDeckWithStats({
      id: sample.id,
      name: sample.title,
      total_cards: sample.cards.length,
      due_today: sample.cards.length,
      mastered_cards: sample.cards.filter(
        (card) => (card.sm2?.interval || 0) >= 21 || (card.sm2?.repetitions || 0) >= 3,
      ).length,
    });
  }

  const rows = await getDeckStatsRows(id);
  return rows[0] ? toDeckWithStats(rows[0]) : null;
}
