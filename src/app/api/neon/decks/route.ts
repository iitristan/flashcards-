import { z } from "zod";
import pg from "pg";
import { getNeonPool, hasNeonDatabaseUrl } from "@/lib/neon";

export const runtime = "nodejs";

const sm2Schema = z.object({
  interval: z.number(),
  easeFactor: z.number(),
  repetitions: z.number(),
  dueDate: z.string(),
});

const cardSchema = z.object({
  id: z.string().min(1),
  deckId: z.string().min(1).optional(),
  front: z.string(),
  back: z.string(),
  rationale: z.string().optional(),
  options: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  ndleSubject: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  leitnerBox: z.number().optional(),
  userNotes: z.string().optional(),
  sm2: sm2Schema.nullable().optional(),
  lastReviewedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const deckSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  cards: z.array(cardSchema).optional(),
});

type CardInput = z.infer<typeof cardSchema>;

function databaseUnavailable() {
  return Response.json(
    { error: "The Neon database is not configured." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

function databaseError(error: unknown) {
  console.error("[Neon] Deck request failed:", error);
  return Response.json(
    { error: "The Neon database request failed." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

async function withTransaction<T>(
  operation: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getNeonPool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError: unknown) => {
      console.error("[Neon] Transaction rollback failed:", rollbackError);
    });
    throw error;
  } finally {
    client.release();
  }
}

async function upsertCards(client: pg.PoolClient, deckId: string, cards: CardInput[]) {
  for (let offset = 0; offset < cards.length; offset += 100) {
    const chunk = cards.slice(offset, offset + 100);
    const values: unknown[] = [];
    const rows = chunk.map((card, index) => {
      const start = index * 15;
      const sm2 = card.sm2 ?? {
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        dueDate: new Date().toISOString(),
      };
      values.push(
        card.id,
        deckId,
        card.front,
        card.back,
        card.rationale ?? "",
        JSON.stringify(card.options ?? []),
        JSON.stringify(card.tags ?? []),
        card.ndleSubject ?? null,
        card.difficulty ?? null,
        card.leitnerBox ?? 1,
        card.userNotes ?? "",
        JSON.stringify(sm2),
        card.lastReviewedAt ?? null,
        card.createdAt ?? null,
        card.updatedAt ?? null,
      );
      const parameter = (column: number) => `$${start + column}`;
      return `(${parameter(1)}, ${parameter(2)}, ${parameter(3)}, ${parameter(4)},
        ${parameter(5)}, ${parameter(6)}::jsonb, ${parameter(7)}::jsonb,
        ${parameter(8)}, ${parameter(9)}, ${parameter(10)}, ${parameter(11)},
        ${parameter(12)}::jsonb, ${parameter(13)}::timestamptz,
        COALESCE(${parameter(14)}::timestamptz, NOW()),
        COALESCE(${parameter(15)}::timestamptz, NOW()))`;
    });

    await client.query(
      `INSERT INTO public.flashcards
        (id, deck_id, front, back, rationale, options, tags, ndle_subject,
         difficulty, leitner_box, user_notes, sm2, last_reviewed_at, created_at, updated_at)
       VALUES ${rows.join(",")}
       ON CONFLICT (id) DO UPDATE SET
        deck_id = EXCLUDED.deck_id,
        front = EXCLUDED.front,
        back = EXCLUDED.back,
        rationale = EXCLUDED.rationale,
        options = EXCLUDED.options,
        tags = EXCLUDED.tags,
        ndle_subject = EXCLUDED.ndle_subject,
        difficulty = EXCLUDED.difficulty,
        leitner_box = EXCLUDED.leitner_box,
        user_notes = EXCLUDED.user_notes,
        sm2 = EXCLUDED.sm2,
        last_reviewed_at = EXCLUDED.last_reviewed_at,
        updated_at = EXCLUDED.updated_at`,
      values,
    );
  }
}

export async function GET() {
  if (!hasNeonDatabaseUrl) return databaseUnavailable();

  try {
    const database = getNeonPool();
    const [decks, cards] = await Promise.all([
      database.query(
        `SELECT id, title, description, category, icon, color, tags, created_at, updated_at
         FROM public.decks
         ORDER BY updated_at DESC NULLS LAST`,
      ),
      database.query(
        `SELECT id, deck_id, front, back, rationale, options, tags, ndle_subject,
                difficulty, leitner_box, user_notes, sm2, last_reviewed_at, created_at, updated_at
         FROM public.flashcards
         ORDER BY created_at ASC NULLS LAST`,
      ),
    ]);

    return Response.json(
      { decks: decks.rows, cards: cards.rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  if (!hasNeonDatabaseUrl) return databaseUnavailable();

  const parsed = deckSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid deck payload." }, { status: 400 });
  }

  const deck = parsed.data;
  const cards = deck.cards ?? [];

  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO public.decks
          (id, title, description, category, icon, color, tags, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7::jsonb,
           COALESCE($8::timestamptz, NOW()), COALESCE($9::timestamptz, NOW()))
         ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          icon = EXCLUDED.icon,
          color = EXCLUDED.color,
          tags = EXCLUDED.tags,
          updated_at = EXCLUDED.updated_at`,
        [
          deck.id,
          deck.title,
          deck.description ?? "",
          deck.category ?? "Clinical Nutrition",
          deck.icon ?? "🥑",
          deck.color ?? "#7FA98B",
          JSON.stringify(deck.tags ?? []),
          deck.createdAt ?? null,
          deck.updatedAt ?? null,
        ],
      );

      await upsertCards(client, deck.id, cards);

      if (cards.length > 0) {
        await client.query(
          "DELETE FROM public.flashcards WHERE deck_id = $1 AND NOT (id = ANY($2::text[]))",
          [deck.id, cards.map((card) => card.id)],
        );
      }
    });
    return Response.json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PATCH(request: Request) {
  if (!hasNeonDatabaseUrl) return databaseUnavailable();

  const bodySchema = z.object({
    deckId: z.string().min(1),
    card: cardSchema,
  });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid card payload." }, { status: 400 });
  }

  try {
    await withTransaction(async (client) => {
      await upsertCards(client, parsed.data.deckId, [parsed.data.card]);
      await client.query(
        "UPDATE public.decks SET updated_at = NOW() WHERE id = $1",
        [parsed.data.deckId],
      );
    });
    return Response.json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(request: Request) {
  if (!hasNeonDatabaseUrl) return databaseUnavailable();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Deck id is required." }, { status: 400 });

  try {
    const result = await withTransaction(async (client) => {
      await client.query("DELETE FROM public.study_sessions WHERE deck_id = $1", [id]);
      await client.query("DELETE FROM public.flashcards WHERE deck_id = $1", [id]);
      return client.query("DELETE FROM public.decks WHERE id = $1", [id]);
    });
    return Response.json({ ok: true, deleted: result.rowCount === 1 });
  } catch (error) {
    return databaseError(error);
  }
}
