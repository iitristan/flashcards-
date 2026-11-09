require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const backupDir = path.resolve(__dirname, '../exports/backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Helper to escape SQL single quotes
function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

// Helper to escape CSV fields
function csvEscape(val) {
  if (val === null || val === undefined) return '""';
  let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

async function runBackup() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Connecting to Neon PostgreSQL...');

  const timestamp = '2026-11-09';
  const fullTimestamp = new Date().toISOString();

  // 1. Fetch all decks
  console.log('Querying decks...');
  const decksRes = await pool.query(`SELECT * FROM public.decks ORDER BY category, title`);
  const decks = decksRes.rows;
  console.log(`Fetched ${decks.length} decks.`);

  // 2. Fetch all flashcards
  console.log('Querying flashcards...');
  const cardsRes = await pool.query(`SELECT * FROM public.flashcards ORDER BY deck_id, id`);
  const cards = cardsRes.rows;
  console.log(`Fetched ${cards.length} flashcards.`);

  // 3. Fetch study logs
  console.log('Querying study logs...');
  const logsRes = await pool.query(`SELECT * FROM public.study_logs ORDER BY created_at DESC`);
  const studyLogs = logsRes.rows;
  console.log(`Fetched ${studyLogs.length} study logs.`);

  // 4. Fetch user preferences
  console.log('Querying user preferences...');
  const prefsRes = await pool.query(`SELECT * FROM public.user_preferences`);
  const userPreferences = prefsRes.rows;
  console.log(`Fetched ${userPreferences.length} user preferences.`);

  // 5. Fetch study sessions
  console.log('Querying study sessions...');
  const sessionsRes = await pool.query(`SELECT * FROM public.study_sessions`);
  const studySessions = sessionsRes.rows;
  console.log(`Fetched ${studySessions.length} study sessions.`);

  // 6. Fetch AI explanations cache
  console.log('Querying AI explanation cache...');
  const aiCacheRes = await pool.query(`SELECT * FROM public.ai_explanation_cache`);
  const aiCache = aiCacheRes.rows;
  console.log(`Fetched ${aiCache.length} AI explanations cache entries.`);

  await pool.end();

  // ==========================================
  // FORMAT 1: COMPREHENSIVE STRUCTURED JSON
  // ==========================================
  console.log('\nGenerating JSON backup...');
  const cardsByDeck = new Map();
  for (const c of cards) {
    if (!cardsByDeck.has(c.deck_id)) cardsByDeck.set(c.deck_id, []);
    cardsByDeck.get(c.deck_id).push(c);
  }

  const structuredDecks = decks.map(d => ({
    ...d,
    cardCount: (cardsByDeck.get(d.id) || []).length,
    cards: cardsByDeck.get(d.id) || []
  }));

  const fullJsonBackup = {
    metadata: {
      appName: 'Nutriboard',
      backupDate: fullTimestamp,
      database: 'Neon PostgreSQL (Production)',
      totalDecks: decks.length,
      totalFlashcards: cards.length,
      totalStudyLogs: studyLogs.length,
      totalAiCacheEntries: aiCache.length
    },
    decks: structuredDecks,
    studyLogs,
    userPreferences,
    studySessions,
    aiCache
  };

  const jsonFilePath = path.join(backupDir, `nutriboard_backup_${timestamp}_all_8392_cards.json`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(fullJsonBackup, null, 2), 'utf8');
  const jsonStat = fs.statSync(jsonFilePath);
  console.log(`✔ JSON backup written to: ${jsonFilePath} (${(jsonStat.size / (1024 * 1024)).toFixed(2)} MB)`);

  // ==========================================
  // FORMAT 2: EXCEL / CSV BACKUP
  // ==========================================
  console.log('\nGenerating CSV backup...');
  const deckTitleMap = new Map(decks.map(d => [d.id, { title: d.title, category: d.category }]));

  const csvHeader = [
    'Deck ID',
    'Deck Title',
    'Category',
    'Card ID',
    'Question (Front)',
    'Answer (Back)',
    'Rationale',
    'Option 1',
    'Option 2',
    'Option 3',
    'Option 4',
    'Difficulty',
    'Leitner Box',
    'Tags',
    'NDLE Subject',
    'Repetitions',
    'Interval (Days)',
    'Ease Factor',
    'Due Date',
    'Created At',
    'Updated At'
  ].join(',');

  const csvRows = [csvHeader];
  for (const c of cards) {
    const dInfo = deckTitleMap.get(c.deck_id) || { title: 'Unknown Deck', category: 'General' };
    let opts = [];
    if (Array.isArray(c.options)) opts = c.options;
    else if (typeof c.options === 'string') {
      try { opts = JSON.parse(c.options); } catch { opts = []; }
    }

    const sm2 = c.sm2 || {};

    csvRows.push([
      csvEscape(c.deck_id),
      csvEscape(dInfo.title),
      csvEscape(dInfo.category),
      csvEscape(c.id),
      csvEscape(c.front),
      csvEscape(c.back),
      csvEscape(c.rationale || ''),
      csvEscape(opts[0] || ''),
      csvEscape(opts[1] || ''),
      csvEscape(opts[2] || ''),
      csvEscape(opts[3] || ''),
      csvEscape(c.difficulty || 'medium'),
      csvEscape(c.leitner_box || 1),
      csvEscape(Array.isArray(c.tags) ? c.tags.join(', ') : ''),
      csvEscape(c.ndle_subject || ''),
      csvEscape(sm2.repetitions ?? 0),
      csvEscape(sm2.interval ?? 0),
      csvEscape(sm2.easeFactor ?? 2.5),
      csvEscape(sm2.dueDate || ''),
      csvEscape(c.created_at || ''),
      csvEscape(c.updated_at || '')
    ].join(','));
  }

  const csvFilePath = path.join(backupDir, `nutriboard_backup_${timestamp}_all_8392_cards.csv`);
  fs.writeFileSync(csvFilePath, csvRows.join('\n'), 'utf8');
  const csvStat = fs.statSync(csvFilePath);
  console.log(`✔ CSV backup written to: ${csvFilePath} (${(csvStat.size / (1024 * 1024)).toFixed(2)} MB)`);

  // ==========================================
  // FORMAT 3: PURE SQL DUMP / RESTORATION FILE
  // ==========================================
  console.log('\nGenerating pure PostgreSQL SQL dump...');
  const sqlLines = [];
  sqlLines.push(`-- =========================================================`);
  sqlLines.push(`-- NUTRIBOARD PRODUCTION DATABASE BACKUP`);
  sqlLines.push(`-- Date: ${fullTimestamp}`);
  sqlLines.push(`-- Total Decks: ${decks.length}`);
  sqlLines.push(`-- Total Flashcards: ${cards.length}`);
  sqlLines.push(`-- Total Study Logs: ${studyLogs.length}`);
  sqlLines.push(`-- Total AI Explanations: ${aiCache.length}`);
  sqlLines.push(`-- =========================================================\n`);

  sqlLines.push(`BEGIN;\n`);

  // Schema creation
  sqlLines.push(`-- 1. Tables`);
  sqlLines.push(`CREATE TABLE IF NOT EXISTS public.decks (
  id TEXT PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  color TEXT,
  tags JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);\n`);

  sqlLines.push(`CREATE TABLE IF NOT EXISTS public.flashcards (
  id TEXT PRIMARY KEY,
  user_id UUID,
  deck_id TEXT NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  rationale TEXT,
  options JSONB,
  tags JSONB,
  ndle_subject TEXT,
  difficulty TEXT,
  leitner_box INTEGER DEFAULT 1,
  user_notes TEXT,
  sm2 JSONB,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);\n`);

  sqlLines.push(`CREATE TABLE IF NOT EXISTS public.playlists (
  id TEXT PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  deck_ids JSONB DEFAULT '[]'::jsonb,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);\n`);

  sqlLines.push(`CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY,
  preferences JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);\n`);

  sqlLines.push(`CREATE TABLE IF NOT EXISTS public.study_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID,
  deck_id TEXT NOT NULL,
  deck_title TEXT NOT NULL,
  mode TEXT NOT NULL,
  current_index INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  timer_duration_seconds INTEGER DEFAULT 0,
  cards_queue JSONB DEFAULT '[]'::jsonb,
  results JSONB DEFAULT '[]'::jsonb,
  start_time BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);\n`);

  sqlLines.push(`CREATE TABLE IF NOT EXISTS public.study_logs (
  id TEXT PRIMARY KEY,
  user_id UUID,
  card_id TEXT NOT NULL,
  deck_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  rating INTEGER,
  user_answer TEXT,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds NUMERIC,
  verdict TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);\n`);

  sqlLines.push(`CREATE TABLE IF NOT EXISTS public.ai_explanation_cache (
  id TEXT PRIMARY KEY,
  question_hash TEXT,
  front_text TEXT,
  back_text TEXT,
  options JSONB,
  explanation TEXT,
  breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  question_text TEXT,
  user_answer TEXT,
  is_correct BOOLEAN,
  ai_explanation JSONB
);\n`);

  // Decks INSERT
  sqlLines.push(`-- 2. Decks Data`);
  for (const d of decks) {
    sqlLines.push(`INSERT INTO public.decks (id, user_id, title, description, category, icon, color, tags, created_at, updated_at) VALUES (${sqlEscape(d.id)}, ${sqlEscape(d.user_id)}, ${sqlEscape(d.title)}, ${sqlEscape(d.description)}, ${sqlEscape(d.category)}, ${sqlEscape(d.icon)}, ${sqlEscape(d.color)}, ${sqlEscape(d.tags)}, ${sqlEscape(d.created_at)}, ${sqlEscape(d.updated_at)}) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category, icon = EXCLUDED.icon, color = EXCLUDED.color, tags = EXCLUDED.tags, updated_at = EXCLUDED.updated_at;`);
  }
  sqlLines.push(``);

  // Flashcards INSERT in batches of 50
  sqlLines.push(`-- 3. Flashcards Data (${cards.length} cards)`);
  const batchSize = 50;
  for (let i = 0; i < cards.length; i += batchSize) {
    const chunk = cards.slice(i, i + batchSize);
    const rowValues = chunk.map(c => `(${sqlEscape(c.id)}, ${sqlEscape(c.user_id)}, ${sqlEscape(c.deck_id)}, ${sqlEscape(c.front)}, ${sqlEscape(c.back)}, ${sqlEscape(c.rationale)}, ${sqlEscape(c.options)}, ${sqlEscape(c.tags)}, ${sqlEscape(c.ndle_subject)}, ${sqlEscape(c.difficulty)}, ${sqlEscape(c.leitner_box)}, ${sqlEscape(c.user_notes)}, ${sqlEscape(c.sm2)}, ${sqlEscape(c.last_reviewed_at)}, ${sqlEscape(c.created_at)}, ${sqlEscape(c.updated_at)})`).join(',\n');
    sqlLines.push(`INSERT INTO public.flashcards (id, user_id, deck_id, front, back, rationale, options, tags, ndle_subject, difficulty, leitner_box, user_notes, sm2, last_reviewed_at, created_at, updated_at) VALUES\n${rowValues}\nON CONFLICT (id) DO UPDATE SET front = EXCLUDED.front, back = EXCLUDED.back, rationale = EXCLUDED.rationale, options = EXCLUDED.options, tags = EXCLUDED.tags, ndle_subject = EXCLUDED.ndle_subject, difficulty = EXCLUDED.difficulty, leitner_box = EXCLUDED.leitner_box, user_notes = EXCLUDED.user_notes, sm2 = EXCLUDED.sm2, last_reviewed_at = EXCLUDED.last_reviewed_at, updated_at = EXCLUDED.updated_at;`);
  }
  sqlLines.push(``);

  // Study Logs INSERT in batches
  sqlLines.push(`-- 4. Study Logs Data (${studyLogs.length} logs)`);
  for (let i = 0; i < studyLogs.length; i += batchSize) {
    const chunk = studyLogs.slice(i, i + batchSize);
    const rowValues = chunk.map(l => `(${sqlEscape(l.id)}, ${sqlEscape(l.user_id)}, ${sqlEscape(l.card_id)}, ${sqlEscape(l.deck_id)}, ${sqlEscape(l.mode)}, ${sqlEscape(l.rating)}, ${sqlEscape(l.user_answer)}, ${sqlEscape(l.is_correct)}, ${sqlEscape(l.time_spent_seconds)}, ${sqlEscape(l.verdict)}, ${sqlEscape(l.created_at)})`).join(',\n');
    sqlLines.push(`INSERT INTO public.study_logs (id, user_id, card_id, deck_id, mode, rating, user_answer, is_correct, time_spent_seconds, verdict, created_at) VALUES\n${rowValues}\nON CONFLICT (id) DO UPDATE SET rating = EXCLUDED.rating, user_answer = EXCLUDED.user_answer, is_correct = EXCLUDED.is_correct, time_spent_seconds = EXCLUDED.time_spent_seconds, verdict = EXCLUDED.verdict;`);
  }
  sqlLines.push(``);

  // User Preferences INSERT
  sqlLines.push(`-- 5. User Preferences Data`);
  for (const p of userPreferences) {
    sqlLines.push(`INSERT INTO public.user_preferences (user_id, preferences, created_at, updated_at) VALUES (${sqlEscape(p.user_id)}, ${sqlEscape(p.preferences)}, ${sqlEscape(p.created_at)}, ${sqlEscape(p.updated_at)}) ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = EXCLUDED.updated_at;`);
  }
  sqlLines.push(``);

  // AI Cache INSERT in batches
  sqlLines.push(`-- 6. AI Explanation Cache Data (${aiCache.length} cache items)`);
  for (let i = 0; i < aiCache.length; i += batchSize) {
    const chunk = aiCache.slice(i, i + batchSize);
    const rowValues = chunk.map(a => `(${sqlEscape(a.id)}, ${sqlEscape(a.question_hash)}, ${sqlEscape(a.front_text)}, ${sqlEscape(a.back_text)}, ${sqlEscape(a.options)}, ${sqlEscape(a.explanation)}, ${sqlEscape(a.breakdown)}, ${sqlEscape(a.created_at)}, ${sqlEscape(a.question_text)}, ${sqlEscape(a.user_answer)}, ${sqlEscape(a.is_correct)}, ${sqlEscape(a.ai_explanation)})`).join(',\n');
    sqlLines.push(`INSERT INTO public.ai_explanation_cache (id, question_hash, front_text, back_text, options, explanation, breakdown, created_at, question_text, user_answer, is_correct, ai_explanation) VALUES\n${rowValues}\nON CONFLICT (id) DO NOTHING;`);
  }
  sqlLines.push(``);

  // Indices
  sqlLines.push(`-- 7. Performance Indices`);
  sqlLines.push(`CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON public.flashcards(deck_id);`);
  sqlLines.push(`CREATE INDEX IF NOT EXISTS idx_flashcards_updated_at ON public.flashcards(updated_at DESC);`);
  sqlLines.push(`CREATE INDEX IF NOT EXISTS idx_decks_updated_at ON public.decks(updated_at DESC);`);
  sqlLines.push(`CREATE INDEX IF NOT EXISTS idx_study_logs_created_at ON public.study_logs(created_at DESC);`);
  sqlLines.push(`CREATE INDEX IF NOT EXISTS idx_study_logs_card_id ON public.study_logs(card_id);`);

  sqlLines.push(`\nCOMMIT;\n`);

  const sqlFilePath = path.join(backupDir, `nutriboard_database_backup_${timestamp}_full.sql`);
  fs.writeFileSync(sqlFilePath, sqlLines.join('\n'), 'utf8');
  const sqlStat = fs.statSync(sqlFilePath);
  console.log(`✔ SQL dump written to: ${sqlFilePath} (${(sqlStat.size / (1024 * 1024)).toFixed(2)} MB)`);

  console.log(`\n========================================`);
  console.log(`COMPLETE BACKUP CREATED SUCCESSFULLY!`);
  console.log(`Files located in: exports/backups/`);
  console.log(`1. JSON:  nutriboard_backup_${timestamp}_all_8392_cards.json (${(jsonStat.size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`2. CSV:   nutriboard_backup_${timestamp}_all_8392_cards.csv (${(csvStat.size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`3. SQL:   nutriboard_database_backup_${timestamp}_full.sql (${(sqlStat.size / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`========================================`);
}

runBackup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
