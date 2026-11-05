require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const prcDecks = [
  require('../src/lib/data/prc-exams/prc2021FFSS.json'),
  require('../src/lib/data/prc-exams/prc2021NBCD.json'),
  require('../src/lib/data/prc-exams/prc2019CPHN.json'),
];

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Connecting to Neon PostgreSQL...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const deck of prcDecks) {
      console.log(`Seeding deck "${deck.title}" (${deck.cards.length} cards)...`);

      // 1. Insert or update deck
      await client.query(`
        INSERT INTO public.decks (id, user_id, title, description, category, icon, color, tags, created_at, updated_at)
        VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          icon = EXCLUDED.icon,
          color = EXCLUDED.color,
          tags = EXCLUDED.tags,
          updated_at = NOW();
      `, [
        deck.id,
        deck.title,
        deck.description || '',
        deck.category,
        deck.icon || '🍱',
        deck.color || '#7FA98B',
        JSON.stringify(deck.tags || []),
      ]);

      // 2. Insert or update flashcards in batches of 50
      const batchSize = 50;
      for (let i = 0; i < deck.cards.length; i += batchSize) {
        const batch = deck.cards.slice(i, i + batchSize);
        for (const card of batch) {
          await client.query(`
            INSERT INTO public.flashcards (
              id, user_id, deck_id, front, back, rationale, options, tags, ndle_subject, difficulty, leitner_box, user_notes, sm2, created_at, updated_at
            )
            VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              front = EXCLUDED.front,
              back = EXCLUDED.back,
              rationale = EXCLUDED.rationale,
              options = EXCLUDED.options,
              tags = EXCLUDED.tags,
              ndle_subject = EXCLUDED.ndle_subject,
              difficulty = EXCLUDED.difficulty,
              updated_at = NOW();
          `, [
            card.id,
            deck.id,
            card.front,
            card.back,
            card.rationale || '',
            JSON.stringify(card.options || []),
            JSON.stringify(card.tags || []),
            card.ndleSubject || deck.category,
            card.difficulty || 'medium',
            card.leitnerBox || 1,
            card.userNotes || '',
            JSON.stringify(card.sm2 || { interval: 0, easeFactor: 2.5, repetitions: 0, dueDate: new Date().toISOString() })
          ]);
        }
      }

      console.log(`✓ Deck "${deck.title}" successfully inserted into Neon DB!`);
    }

    await client.query('COMMIT');
    console.log('All 3 Official PRC Exam decks successfully seeded into Neon PostgreSQL!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed decks:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

