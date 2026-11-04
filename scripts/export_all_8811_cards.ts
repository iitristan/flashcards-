import fs from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, 'temp_test.db');
if (!fs.existsSync(dbPath)) {
  console.error('Database not found at', dbPath);
  process.exit(1);
}

const outputDir = path.resolve(__dirname, '../exports');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const db = new Database(dbPath);

interface DeckRow {
  id: number;
  name: string;
}

interface CardNoteRow {
  card_id: number;
  deck_id: number;
  deck_name: string;
  mid: number;
  flds: string;
  tags: string;
}

const deckRows = db.prepare('SELECT id, name FROM decks').all() as DeckRow[];
const deckMap = new Map<number, string>();
for (const d of deckRows) {
  deckMap.set(d.id, d.name.replace(/\x1f/g, ' :: '));
}

function resolveCategory(deckName: string): string {
  const upper = deckName.toUpperCase();
  if (upper.includes('CPHN') || upper.includes('PUBLIC HEALTH') || upper.includes('COMMUNITY')) {
    return 'Public Health & Community';
  }
  if (upper.includes('FFSS') || upper.includes('FOOD SERVICE') || upper.includes('COOKERY') || upper.includes('MEAL MANAGEMENT')) {
    return 'Food Service Systems';
  }
  if (upper.includes('MNT') || upper.includes('CLINICAL') || upper.includes('DIETETICS')) {
    return 'Clinical Nutrition';
  }
  if (upper.includes('BIOCHEM') || upper.includes('NBCD')) {
    return 'Nutritional Biochemistry';
  }
  if (upper.includes('LIFECYCLE') || upper.includes('MATERNAL') || upper.includes('INFANT')) {
    return 'Maternal & Child Nutrition';
  }
  return 'General Dietetics';
}

function resolveIcon(cat: string): string {
  switch (cat) {
    case 'Clinical Nutrition': return 'Stethoscope';
    case 'Nutritional Biochemistry': return 'Sparkles';
    case 'Food Service Systems': return 'Calculator';
    case 'Public Health & Community': return 'Users';
    case 'Maternal & Child Nutrition': return 'HeartHandshake';
    default: return 'GraduationCap';
  }
}

function resolveColor(cat: string): string {
  switch (cat) {
    case 'Clinical Nutrition': return '#059669';
    case 'Nutritional Biochemistry': return '#FF9A76';
    case 'Food Service Systems': return '#D4A373';
    case 'Public Health & Community': return '#2563eb';
    case 'Maternal & Child Nutrition': return '#F38BA0';
    default: return '#8B5CF6';
  }
}

function cleanHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/&nbsp;/gi, ' ')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseMultipleChoiceOptions(rawFront: string, rawBack: string): string[] {
  const text = rawFront + '\n' + rawBack;
  const options: string[] = [];
  const optionRegex = /(?:^|\n|\s+|<br\s*[\/]?>)([a-d]\.|\([a-d]\))\s*([^<\n]+)/gi;
  let match;
  while ((match = optionRegex.exec(text)) !== null) {
    const optText = cleanHtml(match[2]).trim();
    if (optText.length > 0 && !options.includes(optText)) {
      options.push(optText);
    }
  }
  return options.slice(0, 4);
}

const cardRows = db.prepare(`
  SELECT 
    c.id as card_id,
    c.did as deck_id,
    d.name as deck_name,
    n.mid,
    n.flds,
    n.tags
  FROM cards c
  JOIN notes n ON c.nid = n.id
  JOIN decks d ON c.did = d.id
  ORDER BY c.did, c.id
`).all() as CardNoteRow[];

console.log(`Loaded ${cardRows.length} card-note rows from database.`);

// Group into decks
interface ExportedCard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  rationale: string;
  options: string[];
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  leitnerBox: number;
}

interface ExportedDeck {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  tags: string[];
  cardCount: number;
  cards: ExportedCard[];
}

const decksMap = new Map<string, ExportedDeck>();

for (const row of cardRows) {
  const deckIdStr = `anki-deck-${row.deck_id}`;
  const deckNameClean = row.deck_name.replace(/\x1f/g, ' :: ');
  const category = resolveCategory(deckNameClean);

  if (!decksMap.has(deckIdStr)) {
    decksMap.set(deckIdStr, {
      id: deckIdStr,
      title: deckNameClean,
      description: `Imported NDLE board exam cards from collection (${deckNameClean}).`,
      category,
      icon: resolveIcon(category),
      color: resolveColor(category),
      tags: ['NDLE', category, 'Board Exam'],
      cardCount: 0,
      cards: []
    });
  }

  const deck = decksMap.get(deckIdStr)!;
  const fields = row.flds.split('\x1f');
  const frontRaw = fields[0] || '';
  const backRaw = fields[1] || '';

  const frontClean = cleanHtml(frontRaw);
  const backClean = cleanHtml(backRaw);

  const tagsList = (row.tags || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .concat([category]);

  const options = parseMultipleChoiceOptions(frontRaw, backRaw);

  deck.cards.push({
    id: `anki-card-${row.card_id}`,
    deckId: deckIdStr,
    front: frontClean || 'Question Image/Prompt',
    back: backClean || 'Answer Key',
    rationale: `Answer: ${backClean || 'Refer to NDLE answer key.'}`,
    options: options.length >= 2 ? options : [],
    tags: Array.from(new Set(tagsList)),
    difficulty: 'medium',
    leitnerBox: 1
  });
  deck.cardCount = deck.cards.length;
}

const allExportedDecks = Array.from(decksMap.values());
const totalCardsCount = allExportedDecks.reduce((sum, d) => sum + d.cards.length, 0);

console.log(`Structured ${allExportedDecks.length} decks with ${totalCardsCount} total cards.`);

// 1. JSON Export
const masterJson = {
  exportedAt: new Date().toISOString(),
  title: 'Nutriboard Master Examination Question Bank',
  totalDecks: allExportedDecks.length,
  totalCards: totalCardsCount,
  decks: allExportedDecks
};

const jsonPath = path.join(outputDir, 'nutriboard_master_collection_all_8811_cards.json');
fs.writeFileSync(jsonPath, JSON.stringify(masterJson, null, 2), 'utf-8');
console.log(`✓ Master JSON saved to: ${jsonPath} (${(fs.statSync(jsonPath).size / 1024 / 1024).toFixed(2)} MB)`);

// 2. CSV Export
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

const csvLines: string[] = [];
csvLines.push([
  'Deck ID',
  'Deck Title',
  'Category',
  'Card ID',
  'Question (Front)',
  'Answer (Back)',
  'Option 1',
  'Option 2',
  'Option 3',
  'Option 4',
  'Tags'
].join(','));

for (const deck of allExportedDecks) {
  for (const c of deck.cards) {
    csvLines.push([
      escapeCsv(deck.id),
      escapeCsv(deck.title),
      escapeCsv(deck.category),
      escapeCsv(c.id),
      escapeCsv(c.front),
      escapeCsv(c.back),
      escapeCsv(c.options[0] || ''),
      escapeCsv(c.options[1] || ''),
      escapeCsv(c.options[2] || ''),
      escapeCsv(c.options[3] || ''),
      escapeCsv(c.tags.join('; '))
    ].join(','));
  }
}

const csvPath = path.join(outputDir, 'nutriboard_master_collection_all_8811_cards.csv');
fs.writeFileSync(csvPath, csvLines.join('\r\n'), 'utf-8');
console.log(`✓ Master CSV saved to: ${csvPath} (${(fs.statSync(csvPath).size / 1024 / 1024).toFixed(2)} MB, ${csvLines.length - 1} rows)`);

// 3. PostgreSQL SQL Seed Script (Batch in chunks)
function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

const sqlPath = path.join(outputDir, 'nutriboard_master_postgres_seed_all_8811_cards.sql');
const writeStream = fs.createWriteStream(sqlPath, { encoding: 'utf-8' });

writeStream.write(`-- ====================================================================
-- Nutriboard Master Database Seed (All 8,811 NDLE Cards & 73 Decks)
-- Generated: ${new Date().toISOString()}
-- Compatible with: Supabase, Neon, Railway, Local Postgres
-- ====================================================================

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

-- 1. Insert All Decks
`);

for (const deck of allExportedDecks) {
  writeStream.write(
    `INSERT INTO public.decks (id, title, description, category, icon, color, tags, updated_at) ` +
    `VALUES (${escapeSql(deck.id)}, ${escapeSql(deck.title)}, ${escapeSql(deck.description)}, ${escapeSql(deck.category)}, ${escapeSql(deck.icon)}, ${escapeSql(deck.color)}, ${escapeSql(deck.tags)}, NOW()) ` +
    `ON CONFLICT (id) DO UPDATE SET ` +
    `title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category, icon = EXCLUDED.icon, color = EXCLUDED.color, tags = EXCLUDED.tags, updated_at = NOW();\n`
  );
}

writeStream.write('\n-- 2. Insert All 8,811 Flashcards\n');

for (const deck of allExportedDecks) {
  for (const c of deck.cards) {
    const sm2Default = { interval: 1, easeFactor: 2.5, repetitions: 0, dueDate: new Date().toISOString() };
    writeStream.write(
      `INSERT INTO public.flashcards (id, deck_id, front, back, rationale, options, tags, difficulty, leitner_box, sm2, updated_at) ` +
      `VALUES (${escapeSql(c.id)}, ${escapeSql(deck.id)}, ${escapeSql(c.front)}, ${escapeSql(c.back)}, ${escapeSql(c.rationale)}, ${escapeSql(c.options)}, ${escapeSql(c.tags)}, ${escapeSql(c.difficulty)}, ${c.leitnerBox}, ${escapeSql(sm2Default)}, NOW()) ` +
      `ON CONFLICT (id) DO UPDATE SET ` +
      `front = EXCLUDED.front, back = EXCLUDED.back, rationale = EXCLUDED.rationale, options = EXCLUDED.options, tags = EXCLUDED.tags, difficulty = EXCLUDED.difficulty, leitner_box = EXCLUDED.leitner_box, updated_at = NOW();\n`
    );
  }
}

writeStream.end(() => {
  console.log(`✓ Master PostgreSQL Seed SQL saved to: ${sqlPath} (${(fs.statSync(sqlPath).size / 1024 / 1024).toFixed(2)} MB)`);
});
