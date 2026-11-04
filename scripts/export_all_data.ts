import fs from 'fs';
import path from 'path';
import { INITIAL_DECKS } from '../src/lib/data/sampleDecks';
import { QUIZLET_FOOD_SERVICE_DECK } from '../src/lib/data/quizletFoodServiceDeck';
import { CLINICAL_BIOCHEMISTRY_DECK } from '../src/lib/data/clinicalBiochemistryDeck';
import { COMMUNITY_PUBLIC_HEALTH_DECK } from '../src/lib/data/communityPublicHealthDeck';
import { MOCK_CBLE_QUESTIONS } from '../src/data/cble-mock-data';
import { Deck, Flashcard } from '../src/types';

const outputDir = path.resolve(__dirname, '../exports');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Gather all master decks
const allDecks: Deck[] = [
  ...INITIAL_DECKS,
  QUIZLET_FOOD_SERVICE_DECK,
  CLINICAL_BIOCHEMISTRY_DECK,
  COMMUNITY_PUBLIC_HEALTH_DECK,
];

// Create a standalone deck for any extra mock CBLE questions not already in decks
const existingCardFronts = new Set<string>();
for (const deck of allDecks) {
  for (const c of deck.cards) {
    existingCardFronts.add(c.front.trim().toLowerCase());
  }
}

const extraMockCards: Flashcard[] = [];
MOCK_CBLE_QUESTIONS.forEach((q, idx) => {
  if (!existingCardFronts.has(q.question.trim().toLowerCase())) {
    existingCardFronts.add(q.question.trim().toLowerCase());
    extraMockCards.push({
      id: `cble-extra-${idx + 1}`,
      deckId: 'deck-cble-mock-bank',
      front: q.question,
      back: q.options.find(o => o.key === q.correctAnswer)?.text || q.correctAnswer,
      rationale: q.explanation || 'Official NDLE / CBLE Mock Board item.',
      options: q.options.map(o => o.text),
      tags: ['Mock Exam', q.category || 'Board Exam'],
      difficulty: 'medium',
      leitnerBox: 1,
      sm2: {
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        dueDate: '2026-08-15T14:53:04.021Z'
      },
      createdAt: '2026-08-15T14:53:04.022Z',
      updatedAt: '2026-08-15T14:53:04.022Z'
    });
  }
});

if (extraMockCards.length > 0) {
  allDecks.push({
    id: 'deck-cble-mock-bank',
    title: 'CBLE Mock Examination Bank',
    description: 'Supplemental simulated examination cards and case studies.',
    category: 'General Dietetics',
    icon: 'GraduationCap',
    color: '#6366f1',
    tags: ['CBLE', 'Mock Exam', 'NDLE'],
    cards: extraMockCards
  });
}

// 1. JSON Export
const jsonSummary = {
  exportedAt: new Date().toISOString(),
  totalDecks: allDecks.length,
  totalCards: allDecks.reduce((sum, d) => sum + d.cards.length, 0),
  decks: allDecks.map(d => ({
    id: d.id,
    title: d.title,
    description: d.description,
    category: d.category,
    icon: d.icon,
    color: d.color,
    tags: d.tags,
    cardCount: d.cards.length,
    cards: d.cards
  }))
};

const jsonPath = path.join(outputDir, 'nutriboard_all_data.json');
fs.writeFileSync(jsonPath, JSON.stringify(jsonSummary, null, 2), 'utf-8');
console.log(`✓ JSON Export saved to: ${jsonPath} (${jsonSummary.totalCards} cards across ${jsonSummary.totalDecks} decks)`);

// 2. CSV Export
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

const csvRows: string[] = [];
csvRows.push([
  'Deck ID',
  'Deck Title',
  'Deck Category',
  'Card ID',
  'Question (Front)',
  'Answer (Back)',
  'Option 1',
  'Option 2',
  'Option 3',
  'Option 4',
  'Rationale',
  'Difficulty',
  'Tags'
].join(','));

for (const deck of allDecks) {
  for (const c of deck.cards) {
    const opt0 = c.options && c.options[0] ? c.options[0] : '';
    const opt1 = c.options && c.options[1] ? c.options[1] : '';
    const opt2 = c.options && c.options[2] ? c.options[2] : '';
    const opt3 = c.options && c.options[3] ? c.options[3] : '';
    const tagsStr = (c.tags || []).join('; ');

    csvRows.push([
      escapeCsv(deck.id),
      escapeCsv(deck.title),
      escapeCsv(deck.category),
      escapeCsv(c.id),
      escapeCsv(c.front),
      escapeCsv(c.back),
      escapeCsv(opt0),
      escapeCsv(opt1),
      escapeCsv(opt2),
      escapeCsv(opt3),
      escapeCsv(c.rationale),
      escapeCsv(c.difficulty || 'medium'),
      escapeCsv(tagsStr)
    ].join(','));
  }
}

const csvPath = path.join(outputDir, 'nutriboard_all_cards.csv');
fs.writeFileSync(csvPath, csvRows.join('\r\n'), 'utf-8');
console.log(`✓ CSV Export saved to: ${csvPath} (${csvRows.length - 1} rows)`);

// 3. PostgreSQL SQL Seed Script
function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

const sqlLines: string[] = [];
sqlLines.push('-- ====================================================================');
sqlLines.push('-- Nutriboard All-In-One PostgreSQL Seed Dump');
sqlLines.push(`-- Generated: ${new Date().toISOString()}`);
sqlLines.push(`-- Total Decks: ${allDecks.length} | Total Cards: ${jsonSummary.totalCards}`);
sqlLines.push('-- Compatible with: Supabase, Neon, Railway, Local Postgres');
sqlLines.push('-- ====================================================================\n');

sqlLines.push('-- Ensure target tables exist');
sqlLines.push(`
CREATE TABLE IF NOT EXISTS public.decks (
  id TEXT PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Clinical Nutrition',
  icon TEXT DEFAULT '🥑',
  color TEXT DEFAULT '#7FA98B',
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.flashcards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  user_id UUID DEFAULT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  rationale TEXT DEFAULT '',
  options JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  ndle_subject TEXT DEFAULT NULL,
  difficulty TEXT,
  leitner_box INT DEFAULT 1,
  user_notes TEXT DEFAULT '',
  sm2 JSONB NOT NULL DEFAULT '{"interval":0,"easeFactor":2.5,"repetitions":0,"dueDate":""}'::jsonb,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`);

sqlLines.push('-- 1. Insert Decks');
for (const deck of allDecks) {
  sqlLines.push(
    `INSERT INTO public.decks (id, title, description, category, icon, color, tags, updated_at) ` +
    `VALUES (${escapeSql(deck.id)}, ${escapeSql(deck.title)}, ${escapeSql(deck.description)}, ${escapeSql(deck.category)}, ${escapeSql(deck.icon)}, ${escapeSql(deck.color)}, ${escapeSql(deck.tags)}, NOW()) ` +
    `ON CONFLICT (id) DO UPDATE SET ` +
    `title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category, icon = EXCLUDED.icon, color = EXCLUDED.color, tags = EXCLUDED.tags, updated_at = NOW();`
  );
}

sqlLines.push('\n-- 2. Insert Flashcards');
for (const deck of allDecks) {
  for (const c of deck.cards) {
    sqlLines.push(
      `INSERT INTO public.flashcards (id, deck_id, front, back, rationale, options, tags, ndle_subject, difficulty, leitner_box, sm2, updated_at) ` +
      `VALUES (${escapeSql(c.id)}, ${escapeSql(deck.id)}, ${escapeSql(c.front)}, ${escapeSql(c.back)}, ${escapeSql(c.rationale)}, ${escapeSql(c.options || [])}, ${escapeSql(c.tags || [])}, ${escapeSql(c.ndleSubject || null)}, ${escapeSql(c.difficulty || 'medium')}, ${c.leitnerBox || 1}, ${escapeSql(c.sm2 || { interval: 1, easeFactor: 2.5, repetitions: 0, dueDate: new Date().toISOString() })}, NOW()) ` +
      `ON CONFLICT (id) DO UPDATE SET ` +
      `front = EXCLUDED.front, back = EXCLUDED.back, rationale = EXCLUDED.rationale, options = EXCLUDED.options, tags = EXCLUDED.tags, ndle_subject = EXCLUDED.ndle_subject, difficulty = EXCLUDED.difficulty, leitner_box = EXCLUDED.leitner_box, sm2 = EXCLUDED.sm2, updated_at = NOW();`
    );
  }
}

const sqlPath = path.join(outputDir, 'nutriboard_seed_postgres.sql');
fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf-8');
console.log(`✓ PostgreSQL Seed SQL saved to: ${sqlPath} (${sqlLines.length} lines)`);

