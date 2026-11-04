import fs from 'fs';
import path from 'path';
import os from 'os';

const downloadDir = path.join(os.homedir(), 'Downloads');
const jsonPath = path.join(downloadDir, 'nutriboard_master_backup_7792_cards_2026-10-31T11-27-42.json');

if (!fs.existsSync(jsonPath)) {
  console.error('Cannot find backup at:', jsonPath);
  process.exit(1);
}

console.log('Reading clean master backup JSON...');
const raw = fs.readFileSync(jsonPath, 'utf8');
const backup = JSON.parse(raw);

const { decks, reviewLogs = [], playlists = [], userPreferences, activeSessionCheckpoint, analyticsAndGraphs } = backup;

console.log(`Loaded from clean backup:`);
console.log(`- Decks: ${decks.length}`);
const totalCards = decks.reduce((sum: number, d: any) => sum + (d.cards?.length || 0), 0);
console.log(`- Flashcards: ${totalCards}`);
console.log(`- Review Logs: ${reviewLogs.length}`);
console.log(`- Playlists: ${playlists.length}`);
console.log(`- Active Session:`, activeSessionCheckpoint ? 'YES' : 'NONE');
console.log(`- Analytics/Board Readiness:`, analyticsAndGraphs ? 'YES' : 'NONE');

// Count mastered cards
let masteredCount = 0;
let dueCount = 0;
const now = Date.now();

for (const d of decks) {
  for (const c of d.cards || []) {
    const interval = c.sm2?.interval || 0;
    if (interval >= 21) masteredCount++;
    const dueDate = c.sm2?.dueDate ? new Date(c.sm2.dueDate).getTime() : 0;
    if (dueDate <= now || !c.sm2?.dueDate) dueCount++;
  }
}
console.log(`- Mastered Cards (interval >= 21): ${masteredCount}`);
console.log(`- Due Today Cards: ${dueCount}`);

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/\0/g, '').replace(/'/g, "''")}'::jsonb`;
  }
  const clean = String(val).replace(/\0/g, '').replace(/'/g, "''");
  return `'${clean}'`;
}

const outputPath = path.join(process.cwd(), 'exports', 'NUTRIBOARD_COMPLETE_DATABASE_MIGRATION.sql');
const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

writeStream.write(`-- ====================================================================
-- NUTRIBOARD DEFINITIVE PRODUCTION DATABASE MIGRATION SCRIPT
-- Generated From: Clean Master Production Backup (7,792 Live Studied Cards)
-- Total Decks: ${decks.length}
-- Total Cards: ${totalCards} (with exact SM2 intervals, Leitner boxes & Mastery)
-- Mastered Cards: ${masteredCount} | Due Cards: ${dueCount}
-- Review Logs: ${reviewLogs.length}
-- Compatible with: pgAdmin 4, Supabase SQL Editor, Neon, Railway, Local Postgres
-- ====================================================================

BEGIN;

-- Disable triggers and foreign key checks during batch ingestion for blazing speed
SET session_replication_role = 'replica';

-- ====================================================================
-- 1. TABLE DEFINITIONS (EXACT APPLICATION ARCHITECTURE)
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

CREATE TABLE IF NOT EXISTS public.playlists (
  id TEXT PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  deck_ids JSONB DEFAULT '[]'::jsonb,
  color TEXT DEFAULT '#7FA98B',
  icon TEXT DEFAULT '🎵',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id TEXT PRIMARY KEY,
  preferences JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  deck_id TEXT NOT NULL,
  deck_title TEXT NOT NULL,
  mode TEXT NOT NULL,
  current_index INT NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  timer_duration_seconds INT NOT NULL DEFAULT 0,
  cards_queue JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_time BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_logs (
  id TEXT PRIMARY KEY DEFAULT ('log-' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  user_id UUID DEFAULT NULL,
  card_id TEXT NOT NULL,
  deck_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'spaced-repetition',
  rating TEXT NOT NULL DEFAULT 'good',
  user_answer TEXT DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT TRUE,
  time_spent_seconds INT DEFAULT 0,
  verdict TEXT DEFAULT 'correct',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cble_exam_results (
  id TEXT PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  examinee_name TEXT NOT NULL DEFAULT 'BRIGETTE',
  examination_name TEXT NOT NULL DEFAULT 'NDLE PRC EXAMINATION',
  subject TEXT NOT NULL DEFAULT 'MIXED SUBJECT',
  total_questions INT NOT NULL DEFAULT 100,
  correct_count INT NOT NULL DEFAULT 0,
  score_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  is_passed BOOLEAN NOT NULL DEFAULT FALSE,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  user_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  category_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cble_questions (
  id TEXT PRIMARY KEY,
  question_number INT,
  subject TEXT NOT NULL DEFAULT 'MIXED SUBJECT',
  category TEXT NOT NULL DEFAULT 'General Nutrition',
  question TEXT NOT NULL,
  image_url TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL DEFAULT 'A',
  explanation TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_explanation_cache (
  id TEXT PRIMARY KEY,
  question_text TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  ai_explanation JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_grade_cache (
  id TEXT PRIMARY KEY,
  question_text TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  grade_result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cble_question_reframes (
  original_stem TEXT PRIMARY KEY,
  reframed_stem TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 2. HIGH-PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_decks_updated_at ON public.decks(updated_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_updated_at ON public.flashcards(updated_at);
CREATE INDEX IF NOT EXISTS idx_study_logs_deck ON public.study_logs(deck_id);
CREATE INDEX IF NOT EXISTS idx_study_logs_card ON public.study_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_study_logs_created ON public.study_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cble_exam_results_created ON public.cble_exam_results(created_at DESC);

-- ====================================================================
-- 3. CLEAN RESET PREVIOUS DUPLICATES (PREVENTS 16K DUPLICATION)
-- ====================================================================
TRUNCATE TABLE public.study_logs, public.flashcards, public.decks CASCADE;

-- ====================================================================
-- 4. INSERT CLEAN LIVE DECKS (${decks.length} Decks)
-- ====================================================================
`);

for (const d of decks) {
  writeStream.write(
    `INSERT INTO public.decks (id, title, description, category, icon, color, tags, created_at, updated_at) ` +
    `VALUES (${escapeSql(d.id)}, ${escapeSql(d.title)}, ${escapeSql(d.description)}, ${escapeSql(d.category || 'Clinical Nutrition')}, ${escapeSql(d.icon || '🥑')}, ${escapeSql(d.color || '#7FA98B')}, ${escapeSql(d.tags || [])}, ${escapeSql(d.createdAt || new Date().toISOString())}, ${escapeSql(d.updatedAt || new Date().toISOString())}) ` +
    `ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category, icon = EXCLUDED.icon, color = EXCLUDED.color, tags = EXCLUDED.tags, updated_at = EXCLUDED.updated_at;\n`
  );
}

writeStream.write(`\n-- ====================================================================
-- 4. INSERT CLEAN LIVE FLASHCARDS WITH REAL SM2 REVIEWS (${totalCards} Cards)
-- ====================================================================\n`);

for (const d of decks) {
  for (const c of d.cards || []) {
    writeStream.write(
      `INSERT INTO public.flashcards (id, deck_id, front, back, rationale, options, tags, ndle_subject, difficulty, leitner_box, user_notes, sm2, last_reviewed_at, created_at, updated_at) ` +
      `VALUES (${escapeSql(c.id)}, ${escapeSql(d.id)}, ${escapeSql(c.front)}, ${escapeSql(c.back)}, ${escapeSql(c.rationale || '')}, ${escapeSql(c.options || [])}, ${escapeSql(c.tags || [])}, ${escapeSql(c.ndleSubject || null)}, ${escapeSql(c.difficulty || 'medium')}, ${c.leitnerBox || 1}, ${escapeSql(c.userNotes || '')}, ${escapeSql(c.sm2 || { interval: 0, easeFactor: 2.5, repetitions: 0, dueDate: new Date().toISOString() })}, ${escapeSql(c.lastReviewedAt || null)}, ${escapeSql(c.createdAt || new Date().toISOString())}, ${escapeSql(c.updatedAt || new Date().toISOString())}) ` +
      `ON CONFLICT (id) DO UPDATE SET front = EXCLUDED.front, back = EXCLUDED.back, rationale = EXCLUDED.rationale, options = EXCLUDED.options, tags = EXCLUDED.tags, ndle_subject = EXCLUDED.ndle_subject, difficulty = EXCLUDED.difficulty, leitner_box = EXCLUDED.leitner_box, user_notes = EXCLUDED.user_notes, sm2 = EXCLUDED.sm2, last_reviewed_at = EXCLUDED.last_reviewed_at, updated_at = EXCLUDED.updated_at;\n`
    );
  }
}

if (reviewLogs && reviewLogs.length > 0) {
  writeStream.write(`\n-- ====================================================================
-- 5. INSERT LIVE STUDY & REVIEW LOGS (${reviewLogs.length} Logs)
-- ====================================================================\n`);
  let logSeq = 1;
  for (const log of reviewLogs) {
    const safeLogId = log.id && typeof log.id === 'string' && log.id.trim().length > 0
      ? log.id.trim()
      : `log-${log.cardId || 'card'}-${log.createdAt ? new Date(log.createdAt).getTime() : Date.now()}-${logSeq++}`;

    writeStream.write(
      `INSERT INTO public.study_logs (id, card_id, deck_id, mode, rating, user_answer, is_correct, time_spent_seconds, verdict, created_at) ` +
      `VALUES (${escapeSql(safeLogId)}, ${escapeSql(log.cardId || 'unknown-card')}, ${escapeSql(log.deckId || 'unknown-deck')}, ${escapeSql(log.mode || 'spaced-repetition')}, ${escapeSql(log.rating || 'good')}, ${escapeSql(log.userAnswer || '')}, ${Boolean(log.isCorrect)}, ${Number(log.timeSpentSeconds || 0)}, ${escapeSql(log.verdict || (log.isCorrect ? 'correct' : 'incorrect'))}, ${escapeSql(log.createdAt || new Date().toISOString())}) ` +
      `ON CONFLICT (id) DO NOTHING;\n`
    );
  }
}

if (playlists && playlists.length > 0) {
  writeStream.write(`\n-- ====================================================================
-- 6. INSERT PLAYLISTS (${playlists.length} Playlists)
-- ====================================================================\n`);
  for (const pl of playlists) {
    writeStream.write(
      `INSERT INTO public.playlists (id, title, description, deck_ids, color, icon, created_at, updated_at) ` +
      `VALUES (${escapeSql(pl.id)}, ${escapeSql(pl.title)}, ${escapeSql(pl.description || '')}, ${escapeSql(pl.deckIds || [])}, ${escapeSql(pl.color || '#7FA98B')}, ${escapeSql(pl.icon || '🎵')}, ${escapeSql(pl.createdAt || new Date().toISOString())}, ${escapeSql(pl.updatedAt || new Date().toISOString())}) ` +
      `ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, deck_ids = EXCLUDED.deck_ids, color = EXCLUDED.color, icon = EXCLUDED.icon, updated_at = EXCLUDED.updated_at;\n`
    );
  }
}

if (userPreferences || backup.cardGroupFilters) {
  writeStream.write(`\n-- ====================================================================
-- 7. INSERT USER PREFERENCES & CUSTOM PRACTICE AREA FILTERS
-- ====================================================================\n`);
  const finalPrefs = {
    ...(userPreferences || {}),
    cardGroupFilters: {
      ...(backup.cardGroupFilters || {}),
      nbcd: {
        ...(backup.cardGroupFilters?.nbcd || {}),
        name: 'Clinic Nutri & Bio',
      },
    },
  };
  writeStream.write(
    `INSERT INTO public.user_preferences (user_id, preferences, updated_at) ` +
    `VALUES ('00000000-0000-0000-0000-000000000001', ${escapeSql(finalPrefs)}, NOW()) ` +
    `ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = NOW();\n`
  );
}

if (activeSessionCheckpoint && activeSessionCheckpoint.id) {
  writeStream.write(`\n-- ====================================================================
-- 8. INSERT ACTIVE STUDY SESSION CHECKPOINT
-- ====================================================================\n`);
  writeStream.write(
    `INSERT INTO public.study_sessions (id, deck_id, deck_title, mode, current_index, is_completed, timer_duration_seconds, cards_queue, results, start_time, created_at, updated_at) ` +
    `VALUES (${escapeSql(activeSessionCheckpoint.id)}, ${escapeSql(activeSessionCheckpoint.deckId)}, ${escapeSql(activeSessionCheckpoint.deckTitle || '')}, ${escapeSql(activeSessionCheckpoint.mode || 'spaced-repetition')}, ${activeSessionCheckpoint.currentIndex || 0}, ${Boolean(activeSessionCheckpoint.isCompleted)}, ${activeSessionCheckpoint.timerDurationSeconds || 0}, ${escapeSql(activeSessionCheckpoint.cardsQueue || [])}, ${escapeSql(activeSessionCheckpoint.results || [])}, ${activeSessionCheckpoint.startTime || Date.now()}, NOW(), NOW()) ` +
    `ON CONFLICT (id) DO UPDATE SET current_index = EXCLUDED.current_index, is_completed = EXCLUDED.is_completed, cards_queue = EXCLUDED.cards_queue, results = EXCLUDED.results, updated_at = NOW();\n`
  );
}

writeStream.write(`
-- Restore foreign key checks & triggers
SET session_replication_role = 'origin';

COMMIT;

-- Verify Ingestion Results
SELECT 
  (SELECT count(*) FROM public.decks) as total_decks,
  (SELECT count(*) FROM public.flashcards) as total_flashcards,
  (SELECT count(*) FROM public.study_logs) as total_study_logs;
`);

writeStream.end(() => {
  console.log(`\n✓ Pristine Migration SQL successfully written to:`);
  console.log(outputPath);
  console.log(`File size: ${(fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2)} MB`);
});

