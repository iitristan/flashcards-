"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { prisma, hasDatabaseUrl } from "@/lib/prisma";
import { getEndOfToday } from "@/lib/sm2";
import { INITIAL_DECKS } from "@/lib/data/sampleDecks";
import type { DeckWithStats } from "@/types";

async function computeDeckStats(
  deckId: string,
  userId: string
): Promise<DeckWithStats | null> {
  if (!hasDatabaseUrl) {
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

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId },
    include: { cards: true },
  });

  if (!deck) return null;

  const endOfToday = getEndOfToday();
  const totalCards = deck.cards.length;
  const dueToday = deck.cards.filter((c) => c.dueDate <= endOfToday).length;
  const matureCards = deck.cards.filter((c) => c.interval >= 21).length;
  const masteryPercent =
    totalCards === 0 ? 0 : Math.round((matureCards / totalCards) * 100);

  return {
    id: deck.id,
    name: deck.name,
    totalCards,
    dueToday,
    masteryPercent,
  };
}

export async function getDecksWithStats(): Promise<DeckWithStats[]> {
  if (!hasDatabaseUrl) {
    return INITIAL_DECKS.map((deck) => {
      const totalCards = deck.cards.length;
      const matureCards = deck.cards.filter((c) => (c.sm2?.interval || 0) >= 21).length;
      const masteryPercent =
        totalCards === 0 ? 0 : Math.round((matureCards / totalCards) * 100);

      return {
        id: deck.id,
        name: deck.title,
        totalCards,
        dueToday: totalCards,
        masteryPercent,
      };
    });
  }

  const user = await getAuthUser();

  const decks = await prisma.deck.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { cards: true },
  });

  const endOfToday = getEndOfToday();

  return (decks || []).map((deck) => {
    const totalCards = deck.cards.length;
    const dueToday = deck.cards.filter((c) => c.dueDate <= endOfToday).length;
    const matureCards = deck.cards.filter((c) => c.interval >= 21).length;
    const masteryPercent =
      totalCards === 0 ? 0 : Math.round((matureCards / totalCards) * 100);

    return {
      id: deck.id,
      name: deck.name,
      totalCards,
      dueToday,
      masteryPercent,
    };
  });
}

export async function getDeckNames(): Promise<{ id: string; name: string }[]> {
  if (!hasDatabaseUrl) {
    return INITIAL_DECKS.map((d) => ({ id: d.id, name: d.title }));
  }

  const user = await getAuthUser();

  const decks = await prisma.deck.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return decks || [];
}

export async function createDeck(name: string) {
  const user = await getAuthUser();
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Deck name is required");
  }

  const deck = await prisma.deck.create({
    data: { name: trimmed, userId: user.id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidatePath("/create");

  return deck;
}

export async function renameDeck(id: string, name: string) {
  const user = await getAuthUser();
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Deck name is required");
  }

  const deck = await prisma.deck.findFirst({
    where: { id, userId: user.id },
  });

  if (!deck) {
    throw new Error("Deck not found");
  }

  await prisma.deck.update({
    where: { id },
    data: { name: trimmed },
  });

  revalidatePath("/dashboard");
  revalidatePath("/decks");
}

export async function deleteDeck(id: string) {
  const user = await getAuthUser();

  const deck = await prisma.deck.findFirst({
    where: { id, userId: user.id },
  });

  if (!deck) {
    throw new Error("Deck not found");
  }

  await prisma.deck.delete({ where: { id } });

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidatePath("/review");
}

export async function getDeckStats(id: string): Promise<DeckWithStats | null> {
  const user = await getAuthUser();
  return computeDeckStats(id, user.id);
}
