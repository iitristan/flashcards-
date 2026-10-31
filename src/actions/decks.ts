"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne, withTransaction, hasDatabaseUrl } from "@/lib/db";
import { getEndOfToday } from "@/lib/sm2";
import { INITIAL_DECKS } from "@/lib/data/sampleDecks";
import type { DeckWithStats } from "@/types";

async function computeDeckStats(deckId: string): Promise<DeckWithStats | null> {
  const deck = await queryOne<{ id: string; title: string }>(
    "SELECT id, title FROM public.decks WHERE id = $1",
    [deckId]
  );

  if (!deck) {
    const sample = INITIAL_DECKS.find((d) => d.id === deckId);
    if (!sample) return null;
    const totalCards = sample.cards.length;
    const matureCards = sample.cards.filter((c) => (c.sm2?.interval || 0) >= 21).length;
    return {
      id: sample.id,
      name: sample.title,
      totalCards,
      dueToday: totalCards,
      masteryPercent: totalCards === 0 ? 0 : Math.round((matureCards / totalCards) * 100),
    };
  }

  const cards = await query<{
    id: string;
    sm2: { interval?: number; dueDate?: string } | null;
  }>(
    "SELECT id, sm2 FROM public.flashcards WHERE deck_id = $1",
    [deckId]
  );

  const endOfToday = getEndOfToday().getTime();
  const totalCards = cards.length;
  let dueToday = 0;
  let matureCards = 0;

  for (const c of cards) {
    const sm2 = c.sm2 || {};
    const interval = sm2.interval || 0;
    if (interval >= 21) matureCards++;

    const dueTime = sm2.dueDate ? new Date(sm2.dueDate).getTime() : 0;
    if (dueTime <= endOfToday) dueToday++;
  }

  const masteryPercent = totalCards === 0 ? 0 : Math.round((matureCards / totalCards) * 100);

  return {
    id: deck.id,
    name: deck.title,
    totalCards,
    dueToday,
    masteryPercent,
  };
}

export async function getDecksWithStats(): Promise<DeckWithStats[]> {
  try {
    const decks = await query<{ id: string; title: string }>(
      "SELECT id, title FROM public.decks ORDER BY updated_at DESC"
    );

    if (decks.length === 0) {
      return INITIAL_DECKS.map((deck) => {
        const totalCards = deck.cards.length;
        const matureCards = deck.cards.filter((c) => (c.sm2?.interval || 0) >= 21).length;
        const masteryPercent = totalCards === 0 ? 0 : Math.round((matureCards / totalCards) * 100);
        return {
          id: deck.id,
          name: deck.title,
          totalCards,
          dueToday: totalCards,
          masteryPercent,
        };
      });
    }

    const allCards = await query<{
      id: string;
      deck_id: string;
      sm2: { interval?: number; dueDate?: string } | null;
    }>("SELECT id, deck_id, sm2 FROM public.flashcards");

    const cardsByDeck = new Map<string, typeof allCards>();
    for (const c of allCards) {
      const list = cardsByDeck.get(c.deck_id) || [];
      list.push(c);
      cardsByDeck.set(c.deck_id, list);
    }

    const endOfToday = getEndOfToday().getTime();

    return decks.map((deck) => {
      const cards = cardsByDeck.get(deck.id) || [];
      const totalCards = cards.length;
      let dueToday = 0;
      let matureCards = 0;

      for (const c of cards) {
        const sm2 = c.sm2 || {};
        const interval = sm2.interval || 0;
        if (interval >= 21) matureCards++;

        const dueTime = sm2.dueDate ? new Date(sm2.dueDate).getTime() : 0;
        if (dueTime <= endOfToday) dueToday++;
      }

      const masteryPercent = totalCards === 0 ? 0 : Math.round((matureCards / totalCards) * 100);

      return {
        id: deck.id,
        name: deck.title,
        totalCards,
        dueToday,
        masteryPercent,
      };
    });
  } catch (err) {
    console.error("Error fetching decks with stats:", err);
    return INITIAL_DECKS.map((d) => ({
      id: d.id,
      name: d.title,
      totalCards: d.cards.length,
      dueToday: d.cards.length,
      masteryPercent: 0,
    }));
  }
}

export async function getDeckNames(): Promise<{ id: string; name: string }[]> {
  try {
    const decks = await query<{ id: string; title: string }>(
      "SELECT id, title FROM public.decks ORDER BY title ASC"
    );
    if (decks.length === 0) {
      return INITIAL_DECKS.map((d) => ({ id: d.id, name: d.title }));
    }
    return decks.map((d) => ({ id: d.id, name: d.title }));
  } catch (err) {
    console.error("Error fetching deck names:", err);
    return INITIAL_DECKS.map((d) => ({ id: d.id, name: d.title }));
  }
}

export async function createDeck(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Deck name is required");
  }

  const id = `deck-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  await query(`
    INSERT INTO public.decks (id, title, description, category, icon, color, tags, updated_at)
    VALUES ($1, $2, '', 'Clinical Nutrition', '🥑', '#7FA98B', '[]'::jsonb, NOW())
  `, [id, trimmed]);

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidatePath("/create");

  return { id, name: trimmed };
}

export async function renameDeck(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Deck name is required");
  }

  await query(`
    UPDATE public.decks SET title = $1, updated_at = NOW() WHERE id = $2
  `, [trimmed, id]);

  revalidatePath("/dashboard");
  revalidatePath("/decks");
}

export async function deleteDeck(id: string) {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM public.flashcards WHERE deck_id = $1", [id]);
    await client.query("DELETE FROM public.decks WHERE id = $1", [id]);
  });

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidatePath("/review");
}

export async function getDeckStats(id: string): Promise<DeckWithStats | null> {
  return computeDeckStats(id);
}
