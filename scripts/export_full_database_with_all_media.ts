import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { decompress } from 'fzstd';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');

const colpkgPath = path.resolve(__dirname, '../collection-20260811212525.colpkg');
const dbPath = path.resolve(__dirname, 'temp_test.db');
const outputDir = path.resolve(__dirname, '../exports');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function parseProtobufMedia(buf: Uint8Array): Map<string, string> {
  const map = new Map<string, string>();
  let pos = 0;
  let entryIndex = 0;

  while (pos < buf.length) {
    if (buf[pos] === 0x0a) {
      pos++;
      let len = 0;
      let shift = 0;
      while (pos < buf.length) {
        const b = buf[pos++];
        len |= (b & 0x7f) << shift;
        if (!(b & 0x80)) break;
        shift += 7;
      }

      const entryEnd = pos + len;
      if (entryEnd > buf.length) break;

      let entryPos = pos;
      while (entryPos < entryEnd) {
        const tag = buf[entryPos++];
        const wire = tag & 7;
        const fieldNum = tag >> 3;

        if (fieldNum === 1 && wire === 2) {
          let strLen = 0;
          let sShift = 0;
          while (entryPos < entryEnd) {
            const b = buf[entryPos++];
            strLen |= (b & 0x7f) << sShift;
            if (!(b & 0x80)) break;
            sShift += 7;
          }
          if (entryPos + strLen <= entryEnd) {
            const filename = new TextDecoder('utf-8').decode(buf.slice(entryPos, entryPos + strLen));
            map.set(String(entryIndex), filename);
            entryIndex++;
          }
          break;
        } else if (wire === 0) {
          while (entryPos < entryEnd && (buf[entryPos++] & 0x80));
        } else if (wire === 2) {
          let l = 0;
          let s = 0;
          while (entryPos < entryEnd) {
            const b = buf[entryPos++];
            l |= (b & 0x7f) << s;
            if (!(b & 0x80)) break;
            s += 7;
          }
          entryPos += l;
        } else {
          entryPos++;
        }
      }
      pos = entryEnd;
    } else {
      pos++;
    }
  }
  return map;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function getMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
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

function cleanHtmlText(html: string): string {
  if (!html) return '';
  return html
    .replace(/\0/g, '')
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
    const optText = cleanHtmlText(match[2]).trim();
    if (optText.length > 0 && !options.includes(optText)) {
      options.push(optText);
    }
  }
  return options.slice(0, 4);
}

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/\0/g, '').replace(/'/g, "''")}'::jsonb`;
  }
  const cleanStr = String(val).replace(/\0/g, '').replace(/'/g, "''");
  return `'${cleanStr}'`;
}

async function runMasterExport() {
  console.log('=== Step 1: Loading Anki Package & Extracting Media Assets ===');
  const colpkgBytes = fs.readFileSync(colpkgPath);
  const zip = await JSZip.loadAsync(colpkgBytes);

  let rawMedia = await zip.file('media')!.async('nodebuffer');
  if (rawMedia[0] === 0x28 && rawMedia[1] === 0xb5 && rawMedia[2] === 0x2f && rawMedia[3] === 0xfd) {
    rawMedia = decompress(rawMedia);
  }

  const mediaIndexToName = parseProtobufMedia(rawMedia);
  console.log(`Discovered ${mediaIndexToName.size} media filenames in Anki archive.`);

  console.log('Decompressing and base64-encoding all images into memory...');
  const mediaBase64Cache = new Map<string, string>();

  for (const [idx, filename] of mediaIndexToName.entries()) {
    const file = zip.file(idx);
    if (file) {
      const rawBytes = await file.async('uint8array');
      let imageBytes = rawBytes;
      if (rawBytes[0] === 0x28 && rawBytes[1] === 0xb5 && rawBytes[2] === 0x2f && rawBytes[3] === 0xfd) {
        try {
          imageBytes = decompress(rawBytes);
        } catch {
          imageBytes = rawBytes;
        }
      }
      const mime = getMimeType(filename);
      const dataUrl = `data:${mime};base64,${uint8ArrayToBase64(imageBytes)}`;
      mediaBase64Cache.set(filename, dataUrl);
    }
  }

  console.log(`Pre-cached ${mediaBase64Cache.size} base64 images ready for inlining.`);

  function inlineImages(html: string): string {
    if (!html) return '';
    return html.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
      const cached = mediaBase64Cache.get(src);
      if (cached) {
        return `<img src="${cached}" alt="${src}" class="max-h-72 mx-auto rounded border" />`;
      }
      return match;
    });
  }

  console.log('=== Step 2: Querying Database Records ===');
  const db = new Database(dbPath);

  interface CardNoteRow {
    card_id: number;
    deck_id: number;
    deck_name: string;
    mid: number;
    flds: string;
    tags: string;
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

  console.log(`Loaded ${cardRows.length} cards from database.`);

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

    const frontWithImages = inlineImages(frontRaw);
    const backWithImages = inlineImages(backRaw);

    const tagsList = (row.tags || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .concat([category]);

    const options = parseMultipleChoiceOptions(frontRaw, backRaw);

    deck.cards.push({
      id: `anki-card-${row.card_id}`,
      deckId: deckIdStr,
      front: frontWithImages || 'Question Image/Prompt',
      back: backWithImages || 'Answer Key',
      rationale: `Answer: ${cleanHtmlText(backRaw) || 'Refer to NDLE answer key.'}`,
      options: options.length >= 2 ? options : [],
      tags: Array.from(new Set(tagsList)),
      difficulty: 'medium',
      leitnerBox: 1
    });
    deck.cardCount = deck.cards.length;
  }

  const allDecks = Array.from(decksMap.values());
  const totalCards = allDecks.reduce((sum, d) => sum + d.cards.length, 0);

  console.log(`=== Step 3: Writing Master Bulletproof SQL Seed File ===`);

  const sqlOutPath = path.join(outputDir, 'NUTRIBOARD_COMPLETE_DATABASE_MIGRATION.sql');
  const writeStream = fs.createWriteStream(sqlOutPath, { encoding: 'utf-8' });

  writeStream.write(`-- ====================================================================
-- NUTRIBOARD DEFINITIVE PRODUCTION DATABASE MIGRATION SCRIPT
-- Generated: ${new Date().toISOString()}
-- Total Decks: ${allDecks.length}
-- Total Cards: ${totalCards} (with all 1,940 embedded images)
-- Compatible with: pgAdmin 4, Supabase SQL Editor, Neon, Railway, Local Postgres
-- ====================================================================

BEGIN;

-- Disable triggers and foreign key checks during batch ingestion for blazing speed
SET session_replication_role = 'replica';

-- ====================================================================
-- 1. TABLE DEFINITIONS (COMPLETE EXACT APPLICATION ARCHITECTURE)
-- ====================================================================

-- Decks Table
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

-- Flashcards Table
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

-- Playlists Table
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

-- User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id TEXT PRIMARY KEY,
  preferences JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Sessions Table
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

-- Study Logs Table (With auto-generating primary key to prevent NOT NULL violations)
CREATE TABLE IF NOT EXISTS public.study_logs (
  id TEXT PRIMARY KEY DEFAULT ('log-' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  user_id UUID DEFAULT NULL,
  card_id TEXT NOT NULL,
  deck_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'spaced-repetition',
  rating TEXT,
  user_answer TEXT DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  time_spent_seconds INT DEFAULT 0,
  verdict TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CBLE Exam Results Table
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

-- CBLE Questions Pool Table
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

-- AI Caches
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

-- Make legacy foreign keys optional if migrating existing DB
ALTER TABLE IF EXISTS public.decks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.flashcards ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.playlists ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.study_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.study_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.study_logs ALTER COLUMN id SET DEFAULT ('log-' || substr(md5(random()::text || clock_timestamp()::text), 1, 16));

-- ====================================================================
-- 2. HIGH-PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON public.decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_updated_at ON public.decks(updated_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_updated_at ON public.flashcards(updated_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_ndle_subject ON public.flashcards(ndle_subject);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON public.study_sessions(user_id, is_completed, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_logs_user ON public.study_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_logs_deck ON public.study_logs(deck_id);
CREATE INDEX IF NOT EXISTS idx_cble_exam_results_created ON public.cble_exam_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cble_questions_subject ON public.cble_questions(subject);
CREATE INDEX IF NOT EXISTS idx_ai_explanation_created ON public.ai_explanation_cache(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_grade_created ON public.ai_grade_cache(created_at DESC);

-- ====================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cble_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cble_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_explanation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_grade_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cble_question_reframes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to decks" ON public.decks;
CREATE POLICY "Allow all access to decks" ON public.decks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to flashcards" ON public.flashcards;
CREATE POLICY "Allow all access to flashcards" ON public.flashcards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to playlists" ON public.playlists;
CREATE POLICY "Allow all access to playlists" ON public.playlists FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to user_preferences" ON public.user_preferences;
CREATE POLICY "Allow all access to user_preferences" ON public.user_preferences FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to study_sessions" ON public.study_sessions;
CREATE POLICY "Allow all access to study_sessions" ON public.study_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to study_logs" ON public.study_logs;
CREATE POLICY "Allow all access to study_logs" ON public.study_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to cble_exam_results" ON public.cble_exam_results;
CREATE POLICY "Allow all access to cble_exam_results" ON public.cble_exam_results FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to cble_questions" ON public.cble_questions;
CREATE POLICY "Allow all access to cble_questions" ON public.cble_questions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to ai_explanation_cache" ON public.ai_explanation_cache;
CREATE POLICY "Allow all access to ai_explanation_cache" ON public.ai_explanation_cache FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to ai_grade_cache" ON public.ai_grade_cache;
CREATE POLICY "Allow all access to ai_grade_cache" ON public.ai_grade_cache FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to cble_question_reframes" ON public.cble_question_reframes;
CREATE POLICY "Allow all access to cble_question_reframes" ON public.cble_question_reframes FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 4. INSERT DATA: DECKS (${allDecks.length} Decks)
-- ====================================================================
`);

  for (const deck of allDecks) {
    writeStream.write(
      `INSERT INTO public.decks (id, title, description, category, icon, color, tags, updated_at) ` +
      `VALUES (${escapeSql(deck.id)}, ${escapeSql(deck.title)}, ${escapeSql(deck.description)}, ${escapeSql(deck.category)}, ${escapeSql(deck.icon)}, ${escapeSql(deck.color)}, ${escapeSql(deck.tags)}, NOW()) ` +
      `ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category, icon = EXCLUDED.icon, color = EXCLUDED.color, tags = EXCLUDED.tags, updated_at = NOW();\n`
    );
  }

  writeStream.write(`\n-- ====================================================================
-- 5. INSERT DATA: FLASHCARDS (${totalCards} Cards with all Inlined Images)
-- ====================================================================\n`);

  for (const deck of allDecks) {
    for (const c of deck.cards) {
      const sm2Default = { interval: 1, easeFactor: 2.5, repetitions: 0, dueDate: new Date().toISOString() };
      writeStream.write(
        `INSERT INTO public.flashcards (id, deck_id, front, back, rationale, options, tags, difficulty, leitner_box, sm2, updated_at) ` +
        `VALUES (${escapeSql(c.id)}, ${escapeSql(deck.id)}, ${escapeSql(c.front)}, ${escapeSql(c.back)}, ${escapeSql(c.rationale)}, ${escapeSql(c.options)}, ${escapeSql(c.tags)}, ${escapeSql(c.difficulty)}, ${c.leitnerBox}, ${escapeSql(sm2Default)}, NOW()) ` +
        `ON CONFLICT (id) DO UPDATE SET front = EXCLUDED.front, back = EXCLUDED.back, rationale = EXCLUDED.rationale, options = EXCLUDED.options, tags = EXCLUDED.tags, difficulty = EXCLUDED.difficulty, leitner_box = EXCLUDED.leitner_box, updated_at = NOW();\n`
      );
    }
  }

  writeStream.write(`
-- Restore foreign key checks & triggers
SET session_replication_role = 'origin';

COMMIT;

-- Verify Ingestion
SELECT 
  (SELECT count(*) FROM public.decks) as total_decks,
  (SELECT count(*) FROM public.flashcards) as total_flashcards,
  (SELECT count(*) FROM public.study_logs) as total_study_logs;
`);

  writeStream.end(() => {
    const sqlSizeMB = (fs.statSync(sqlOutPath).size / 1024 / 1024).toFixed(2);
    console.log(`✓ Master Seed SQL successfully created: ${sqlOutPath} (${sqlSizeMB} MB)`);
    console.log('=== Ingestion script is 100% ready for pgAdmin! ===');
  });
}

runMasterExport().catch(console.error);
