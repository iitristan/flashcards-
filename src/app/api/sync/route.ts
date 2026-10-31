import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, withTransaction, hasDatabaseUrl } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!hasDatabaseUrl) {
    return NextResponse.json({
      ok: true,
      offline: true,
      data: {
        decks: [],
        cards: [],
        playlists: [],
        preferences: null,
        activeSession: null,
        logs: [],
      },
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'pullAll';

    if (action === 'pullAll') {
      // 1. Fetch all decks
      const decks = await query(`
        SELECT id, title, description, category, icon, color, tags, created_at, updated_at
        FROM public.decks
        ORDER BY updated_at DESC
      `);

      // 2. Fetch all flashcards
      const cards = await query(`
        SELECT id, deck_id, front, back, rationale, options, tags, ndle_subject,
               difficulty, leitner_box, user_notes, sm2, last_reviewed_at, created_at, updated_at
        FROM public.flashcards
      `);

      // 3. Fetch playlists
      const playlists = await query(`
        SELECT id, title, description, deck_ids, color, icon, created_at, updated_at
        FROM public.playlists
        ORDER BY updated_at DESC
      `).catch(() => []);

      // 4. Fetch preferences
      const prefRow = await queryOne(`
        SELECT preferences FROM public.user_preferences LIMIT 1
      `).catch(() => null);

      // 5. Fetch active study session
      const activeSession = await queryOne(`
        SELECT id, deck_id, deck_title, mode, current_index, is_completed,
               timer_duration_seconds, cards_queue, results, start_time, updated_at
        FROM public.study_sessions
        WHERE is_completed = false
        ORDER BY updated_at DESC
        LIMIT 1
      `).catch(() => null);

      // 6. Fetch recent study logs
      const logs = await query(`
        SELECT id, card_id, deck_id, mode, rating, user_answer, is_correct,
               time_spent_seconds, verdict, created_at
        FROM public.study_logs
        ORDER BY created_at DESC
        LIMIT 10000
      `).catch(() => []);

      return NextResponse.json({
        ok: true,
        data: {
          decks,
          cards,
          playlists,
          preferences: prefRow ? prefRow.preferences : null,
          activeSession,
          logs,
        },
      });
    }

    if (action === 'pullLogs') {
      const since = searchParams.get('since');
      let sql = `
        SELECT id, card_id, deck_id, mode, rating, user_answer, is_correct,
               time_spent_seconds, verdict, created_at
        FROM public.study_logs
      `;
      const params: any[] = [];
      if (since) {
        sql += ` WHERE created_at > $1`;
        params.push(since);
      }
      sql += ` ORDER BY created_at ASC LIMIT 10000`;

      const logs = await query(sql, params);
      return NextResponse.json({ ok: true, logs });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/sync GET Error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!hasDatabaseUrl) {
    return NextResponse.json({
      ok: true,
      offline: true,
      message: 'DATABASE_URL is not configured. Handled offline.',
    });
  }

  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'pushDeck') {
      const { deck } = payload;
      if (!deck || !deck.id) {
        return NextResponse.json({ ok: false, error: 'Invalid deck payload' }, { status: 400 });
      }

      await withTransaction(async (client) => {
        // Upsert deck
        await client.query(`
          INSERT INTO public.decks (id, title, description, category, icon, color, tags, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            icon = EXCLUDED.icon,
            color = EXCLUDED.color,
            tags = EXCLUDED.tags,
            updated_at = NOW()
        `, [
          deck.id,
          deck.title,
          deck.description || '',
          deck.category || 'Clinical Nutrition',
          deck.icon || '🥑',
          deck.color || '#7FA98B',
          JSON.stringify(deck.tags || []),
        ]);

        // Upsert flashcards if provided
        if (Array.isArray(deck.cards) && deck.cards.length > 0) {
          for (const c of deck.cards) {
            await client.query(`
              INSERT INTO public.flashcards (
                id, deck_id, front, back, rationale, options, tags,
                ndle_subject, difficulty, leitner_box, user_notes, sm2,
                last_reviewed_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
              ) ON CONFLICT (id) DO UPDATE SET
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
                updated_at = NOW()
            `, [
              c.id,
              deck.id,
              c.front,
              c.back,
              c.rationale || '',
              JSON.stringify(c.options || []),
              JSON.stringify(c.tags || []),
              c.ndleSubject || null,
              c.difficulty || 'medium',
              c.leitnerBox || 1,
              c.userNotes || '',
              JSON.stringify(c.sm2 || { interval: 0, easeFactor: 2.5, repetitions: 0, dueDate: new Date().toISOString() }),
              c.lastReviewedAt || null,
            ]);
          }
        }
      });

      return NextResponse.json({ ok: true });
    }

    if (action === 'syncCardReview') {
      const { card, deckId } = payload;
      if (!card || !card.id) {
        return NextResponse.json({ ok: false, error: 'Invalid card payload' }, { status: 400 });
      }

      await query(`
        UPDATE public.flashcards
        SET leitner_box = $1,
            sm2 = $2,
            last_reviewed_at = $3,
            updated_at = NOW()
        WHERE id = $4
      `, [
        card.leitnerBox || 1,
        JSON.stringify(card.sm2 || {}),
        card.lastReviewedAt || new Date().toISOString(),
        card.id,
      ]);

      return NextResponse.json({ ok: true });
    }

    if (action === 'pushStudyLogs') {
      const { logs } = payload;
      if (Array.isArray(logs) && logs.length > 0) {
        await withTransaction(async (client) => {
          for (const l of logs) {
            await client.query(`
              INSERT INTO public.study_logs (
                id, card_id, deck_id, mode, rating, user_answer, is_correct,
                time_spent_seconds, verdict, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (id) DO NOTHING
            `, [
              l.id,
              l.cardId,
              l.deckId,
              l.mode || 'spaced-repetition',
              l.rating || 'good',
              l.userAnswer || '',
              Boolean(l.isCorrect),
              Number(l.timeSpentSeconds || 0),
              l.verdict || (l.isCorrect ? 'correct' : 'incorrect'),
              l.createdAt || new Date().toISOString(),
            ]);
          }
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'pushPlaylists') {
      const { playlists } = payload;
      if (Array.isArray(playlists)) {
        await withTransaction(async (client) => {
          for (const p of playlists) {
            await client.query(`
              INSERT INTO public.playlists (id, title, description, deck_ids, color, icon, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW())
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                deck_ids = EXCLUDED.deck_ids,
                color = EXCLUDED.color,
                icon = EXCLUDED.icon,
                updated_at = NOW()
            `, [
              p.id,
              p.title,
              p.description || '',
              JSON.stringify(p.deckIds || []),
              p.color || '#7FA98B',
              p.icon || '🎵',
            ]);
          }
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'pushPreferences') {
      const { preferences } = payload;
      if (preferences) {
        await query(`
          INSERT INTO public.user_preferences (user_id, preferences, updated_at)
          VALUES ('00000000-0000-0000-0000-000000000001', $1, NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            preferences = EXCLUDED.preferences,
            updated_at = NOW()
        `, [JSON.stringify(preferences)]);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'saveSession') {
      const { session } = payload;
      if (session && session.id) {
        await query(`
          INSERT INTO public.study_sessions (
            id, deck_id, deck_title, mode, current_index, is_completed,
            timer_duration_seconds, cards_queue, results, start_time, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (id) DO UPDATE SET
            current_index = EXCLUDED.current_index,
            is_completed = EXCLUDED.is_completed,
            timer_duration_seconds = EXCLUDED.timer_duration_seconds,
            cards_queue = EXCLUDED.cards_queue,
            results = EXCLUDED.results,
            updated_at = NOW()
        `, [
          session.id,
          session.deckId,
          session.deckTitle || '',
          session.mode || 'spaced-repetition',
          session.currentIndex || 0,
          Boolean(session.isCompleted),
          session.timerDurationSeconds || 0,
          JSON.stringify(session.cardsQueue || []),
          JSON.stringify(session.results || []),
          session.startTime || Date.now(),
        ]);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'completeSession') {
      const { sessionId } = payload;
      if (sessionId) {
        await query(`
          UPDATE public.study_sessions
          SET is_completed = true, updated_at = NOW()
          WHERE id = $1
        `, [sessionId]);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/sync POST Error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!hasDatabaseUrl) {
    return NextResponse.json({
      ok: true,
      offline: true,
      message: 'DATABASE_URL is not configured. Handled offline.',
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing id parameter' }, { status: 400 });
    }

    if (action === 'deleteDeck') {
      await withTransaction(async (client) => {
        await client.query('DELETE FROM public.flashcards WHERE deck_id = $1', [id]);
        await client.query('DELETE FROM public.decks WHERE id = $1', [id]);
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'deletePlaylist') {
      await query('DELETE FROM public.playlists WHERE id = $1', [id]);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'Unknown delete action' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/sync DELETE Error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

