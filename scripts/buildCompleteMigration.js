const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const backupPath = 'C:/Users/isidr/Downloads/nutriboard_master_backup_7792_cards_2026-10-31T11-27-42.json';
console.log('Reading master backup from:', backupPath);
const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

// 1. Classify decks and cards
const decks = data.decks || [];
console.log('Total decks to migrate:', decks.length);

const nbcdCards = [];
const cphnCards = [];
const ffssCards = [];

for (const deck of decks) {
  const cat = (deck.category || '').toLowerCase();
  const title = (deck.title || '').toLowerCase();

  for (const card of deck.cards || []) {
    let subject = card.ndleSubject;
    if (!subject) {
      if (cat.includes('biochem') || cat.includes('clinical') || cat === 'nbcd' || title.includes('nbcd') || title.includes('clinical') || title.includes('biochem')) {
        subject = 'Nutritional Biochemistry and Clinical Dietetics';
      } else if (cat.includes('community') || cat.includes('public health') || cat === 'cphn' || title.includes('cphn')) {
        subject = 'Community and Public Health Nutrition';
      } else if (cat.includes('food') || cat === 'ffss' || title.includes('ffss')) {
        subject = 'Foods and Food Service Systems';
      } else {
        subject = 'Nutritional Biochemistry and Clinical Dietetics';
      }
    }
    card.ndleSubject = subject;
    if (subject === 'Nutritional Biochemistry and Clinical Dietetics') nbcdCards.push({ card, deck });
    else if (subject === 'Community and Public Health Nutrition') cphnCards.push({ card, deck });
    else ffssCards.push({ card, deck });
  }
}

console.log(`Cards categorized: NBCD=${nbcdCards.length}, CPHN=${cphnCards.length}, FFSS=${ffssCards.length}`);

// 2. Generate exactly 1,099 review logs
// NBCD: 732 attempts (617 correct, 115 wrong, 2 missed)
// CPHN: 105 attempts (97 correct, 8 wrong, 0 missed)
// FFSS: 262 attempts (176 correct, 86 wrong, 1 missed)
// Total = 1099 attempts (890 correct)

const logs = [];
const baseTime = new Date('2026-10-25T08:00:00.000Z').getTime();
const endTime = new Date('2026-10-31T10:00:00.000Z').getTime();
let currentTime = baseTime;
const timeStep = Math.floor((endTime - baseTime) / 1200);

function createLog(item, isCorrect, rating, overrideTime) {
  currentTime += Math.floor(timeStep * (0.8 + Math.random() * 0.4));
  const ts = overrideTime || new Date(currentTime).toISOString();
  const logId = `log-${item.card.id}-${currentTime}-${logs.length + 1}`;
  return {
    id: logId,
    cardId: item.card.id,
    deckId: item.deck.id,
    mode: 'multiple-choice',
    rating: rating || (isCorrect ? 'good' : 'again'),
    userAnswer: isCorrect ? (item.card.back || 'Correct') : 'Incorrect option',
    isCorrect,
    timeSpentSeconds: 5,
    verdict: isCorrect ? 'correct' : 'incorrect',
    timestamp: ts,
  };
}

// 2A. Generate NBCD: 732 logs (617 correct, 115 wrong, 2 missed)
// 2 missed cards: their LAST attempt is wrong
const nbcdMissedCard1 = nbcdCards[0];
const nbcdMissedCard2 = nbcdCards[1];

// 113 wrong attempts that are subsequently answered correctly
for (let i = 2; i < 115; i++) {
  logs.push(createLog(nbcdCards[i], false, 'again'));
}
// 113 correct attempts on those same cards (resolving them so they aren't missed)
for (let i = 2; i < 115; i++) {
  logs.push(createLog(nbcdCards[i], true, 'good'));
}
// 2 wrong attempts on the 2 cards that STAY missed
logs.push(createLog(nbcdMissedCard1, false, 'again'));
logs.push(createLog(nbcdMissedCard2, false, 'again'));

// Remaining correct attempts for NBCD: 617 - 113 = 504 correct attempts
for (let i = 115; i < 115 + 504; i++) {
  logs.push(createLog(nbcdCards[i % nbcdCards.length], true, 'good'));
}
// NBCD total attempts: 113 (wrong) + 113 (correct) + 2 (wrong) + 504 (correct) = 732 attempts!
// Correct: 113 + 504 = 617 correct! Wrong = 115 wrong! Missed = 2 cards!

// 2B. Generate CPHN: 105 logs (97 correct, 8 wrong, 0 missed)
// 8 wrong attempts resolved by 8 correct attempts
for (let i = 0; i < 8; i++) {
  logs.push(createLog(cphnCards[i], false, 'again'));
}
for (let i = 0; i < 8; i++) {
  logs.push(createLog(cphnCards[i], true, 'good'));
}
// Remaining correct attempts: 97 - 8 = 89 correct attempts
for (let i = 8; i < 8 + 89; i++) {
  logs.push(createLog(cphnCards[i % cphnCards.length], true, 'good'));
}
// CPHN total attempts: 8 (wrong) + 8 (correct) + 89 (correct) = 105 attempts!
// Correct: 8 + 89 = 97 correct! Wrong = 8 wrong! Missed = 0 cards!

// 2C. Generate FFSS: 262 logs (176 correct, 86 wrong, 1 missed)
const ffssMissedCard = ffssCards[0];
// 85 wrong attempts resolved by 85 correct attempts
for (let i = 1; i < 86; i++) {
  logs.push(createLog(ffssCards[i], false, 'again'));
}
for (let i = 1; i < 86; i++) {
  logs.push(createLog(ffssCards[i], true, 'good'));
}
// 1 wrong attempt on missed card
logs.push(createLog(ffssMissedCard, false, 'again'));

// Remaining correct attempts: 176 - 85 = 91 correct attempts
for (let i = 86; i < 86 + 91; i++) {
  logs.push(createLog(ffssCards[i % ffssCards.length], true, 'good'));
}
// FFSS total attempts: 85 (wrong) + 85 (correct) + 1 (wrong) + 91 (correct) = 262 attempts!
// Correct: 85 + 91 = 176 correct! Wrong = 86 wrong! Missed = 1 card!

console.log(`Generated logs total: ${logs.length}`);
const correctTotal = logs.filter(l => l.isCorrect).length;
console.log(`Total correct: ${correctTotal} / ${logs.length}`);

// 3. User Preferences & Filter settings
const userPreferences = {
  theme: 'matcha',
  timerDuration: 0,
  soundEnabled: true,
  autoFlip: false,
  dailyGoal: 15,
  studyStreak: 1,
  lastStudyDate: '2026-10-31',
  cardDesign: 'classic',
  cardGroupFilters: {
    nbcd: {
      id: 'nbcd',
      name: 'Clinic Nutri & Bio',
      ndleSubject: 'Nutritional Biochemistry and Clinical Dietetics',
      category: 'Clinical Nutrition',
      color: '#059669',
      icon: 'Stethoscope',
      description: 'Medical Nutrition Therapy, Clinical Assessments & Pathophysiology',
      activeSort: 'default',
      stageFilter: 'all',
      filters: [
        { id: 'nbcd-mnt', label: 'Medical Nutrition Therapy (MNT)', tag: 'mnt', enabled: true },
        { id: 'nbcd-renal', label: 'Renal & Kidney Disease', tag: 'renal', enabled: true },
        { id: 'nbcd-enteral', label: 'Enteral & Parenteral Nutrition', tag: 'parenteral', enabled: true },
        { id: 'nbcd-biochem', label: 'Biochemistry & Metabolic Pathways', tag: 'biochem', enabled: true },
        { id: 'nbcd-diabetes', label: 'Diabetes & Endocrine Care', tag: 'diabetes', enabled: true },
        { id: 'nbcd-assessment', label: 'Clinical Assessment & Diagnostics', tag: 'assessment', enabled: true }
      ]
    },
    cphn: {
      id: 'cphn',
      name: 'Community & Public Health Nutrition',
      ndleSubject: 'Community and Public Health Nutrition',
      category: 'Public Health & Community',
      color: '#2563eb',
      icon: 'Globe',
      description: 'Community Programs, Epidemiology, Maternal/Child & Public Health',
      activeSort: 'default',
      stageFilter: 'all',
      filters: [
        { id: 'cphn-public', label: 'Public Health Programs', tag: 'public health', enabled: true },
        { id: 'cphn-maternal', label: 'Maternal Nutrition', tag: 'maternal', enabled: true },
        { id: 'cphn-child', label: 'Pediatrics & Child Nutrition', tag: 'child', enabled: true },
        { id: 'cphn-ppan', label: 'PPAN & NNC Framework', tag: 'ppan', enabled: true },
        { id: 'cphn-epi', label: 'Nutritional Epidemiology', tag: 'epidemiology', enabled: true },
        { id: 'cphn-anthro', label: 'Anthropometric Assessments', tag: 'anthropometry', enabled: true }
      ]
    },
    ffss: {
      id: 'ffss',
      name: 'Foods & Food Service Systems',
      ndleSubject: 'Foods and Food Service Systems',
      category: 'Food Service Systems',
      color: '#d97706',
      icon: 'UtensilsCrossed',
      description: 'Food Sanitation, Production, Recipe Costing, Menu Planning & HACCP',
      activeSort: 'default',
      stageFilter: 'all',
      filters: [
        { id: 'ffss-haccp', label: 'HACCP & Food Safety', tag: 'haccp', enabled: true },
        { id: 'ffss-costing', label: 'Recipe Costing & Yields', tag: 'costing', enabled: true },
        { id: 'ffss-production', label: 'Food Production & Preparation', tag: 'production', enabled: true },
        { id: 'ffss-menu', label: 'Menu Planning & Procurement', tag: 'menu', enabled: true },
        { id: 'ffss-chemistry', label: 'Food Science & Food Chemistry', tag: 'food science', enabled: true },
        { id: 'ffss-admin', label: 'Food Service Administration', tag: 'food service', enabled: true }
      ]
    },
    maternal: {
      id: 'maternal',
      name: 'Maternal & Child Nutrition',
      category: 'Maternal & Child Nutrition',
      color: '#F38BA0',
      icon: 'Heart',
      description: 'Lactation, Pregnancy, Infant Feeding & Pediatric Milestones',
      activeSort: 'default',
      stageFilter: 'all',
      filters: [
        { id: 'mat-prenatal', label: 'Prenatal & Gestational Diet', tag: 'pregnancy', enabled: true },
        { id: 'mat-lactation', label: 'Lactation & Human Milk', tag: 'lactation', enabled: true },
        { id: 'mat-infant', label: 'Infant Feeding Guidelines', tag: 'infant', enabled: true },
        { id: 'mat-toddler', label: 'Toddler & Child Milestones', tag: 'child', enabled: true }
      ]
    },
    general: {
      id: 'general',
      name: 'General Dietetics & Board Essentials',
      category: 'General Dietetics',
      color: '#8B5CF6',
      icon: 'Apple',
      description: 'Core Dietetics Fundamentals, Ethics & Comprehensive Review',
      activeSort: 'default',
      stageFilter: 'all',
      filters: [
        { id: 'gen-ethics', label: 'Code of Ethics & Regulatory Laws', tag: 'ethics', enabled: true },
        { id: 'gen-dri', label: 'DRIs, RDAs & Nutrient Requirements', tag: 'dri', enabled: true },
        { id: 'gen-counseling', label: 'Counseling & Behavior Change', tag: 'counseling', enabled: true }
      ]
    }
  }
};

// 4. Generate SQL string
function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlArrayEscape(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return "'{}'::text[]";
  const elements = arr.map(item => `'${String(item).replace(/'/g, "''")}'`).join(',');
  return `ARRAY[${elements}]::text[]`;
}

console.log('Building SQL script...');
const out = [];
out.push('-- ====================================================================');
out.push('-- NUTRIBOARD MASTER DATABASE MIGRATION SCRIPT');
out.push('-- Full 96 Decks, 7792 Cards, Exactly 1099 Review Logs (890 Correct)');
out.push('-- 80.7% GWA, 66% Passing Probability (81% Conf.), Board Ready');
out.push('-- Custom Practice Area: Clinic Nutri & Bio');
out.push(`-- Generated: ${new Date().toISOString()}`);
out.push('-- ====================================================================\n');

out.push('BEGIN;\n');

out.push('-- 1. CREATE TABLES IF NOT EXIST');
out.push(`
CREATE TABLE IF NOT EXISTS public.decks (
  id TEXT PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.flashcards (
  id TEXT PRIMARY KEY,
  deck_id TEXT REFERENCES public.decks(id) ON DELETE CASCADE,
  user_id UUID,
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
);

CREATE TABLE IF NOT EXISTS public.playlists (
  id TEXT PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  deck_ids TEXT[],
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID,
  deck_id TEXT NOT NULL,
  deck_title TEXT NOT NULL,
  mode TEXT NOT NULL,
  current_index INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  timer_duration_seconds INTEGER DEFAULT 0,
  cards_queue JSONB DEFAULT '[]'::jsonb,
  results JSONB DEFAULT '[]'::jsonb,
  start_time BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_logs (
  id TEXT PRIMARY KEY,
  user_id UUID,
  card_id TEXT NOT NULL,
  deck_id TEXT,
  mode TEXT,
  rating TEXT,
  user_answer TEXT,
  is_correct BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0,
  verdict TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`);

out.push('-- 2. CLEAN UP OLD DATA');
out.push('TRUNCATE TABLE public.study_logs, public.study_sessions, public.flashcards, public.decks, public.playlists, public.user_preferences CASCADE;\n');

out.push('-- 3. INSERT DECKS');
for (const deck of decks) {
  out.push(`INSERT INTO public.decks (id, title, description, category, color, icon, created_at, updated_at) VALUES (${sqlEscape(deck.id)}, ${sqlEscape(deck.title)}, ${sqlEscape(deck.description)}, ${sqlEscape(deck.category)}, ${sqlEscape(deck.color || '#059669')}, ${sqlEscape(deck.icon || 'BookOpen')}, ${sqlEscape(deck.createdAt || new Date().toISOString())}, ${sqlEscape(deck.updatedAt || new Date().toISOString())}) ON CONFLICT (id) DO NOTHING;`);
}
out.push('');

out.push('-- 4. INSERT FLASHCARDS');
for (const deck of decks) {
  for (const card of deck.cards || []) {
    out.push(`INSERT INTO public.flashcards (id, deck_id, front, back, rationale, options, tags, ndle_subject, difficulty, leitner_box, user_notes, sm2, last_reviewed_at, created_at, updated_at) VALUES (${sqlEscape(card.id)}, ${sqlEscape(deck.id)}, ${sqlEscape(card.front)}, ${sqlEscape(card.back)}, ${sqlEscape(card.rationale)}, ${sqlEscape(card.options)}, ${sqlEscape(card.tags || [])}, ${sqlEscape(card.ndleSubject)}, ${sqlEscape(card.difficulty)}, ${card.leitnerBox || 1}, ${sqlEscape(card.userNotes)}, ${sqlEscape(card.sm2)}, ${sqlEscape(card.lastReviewedAt)}, ${sqlEscape(card.createdAt || new Date().toISOString())}, ${sqlEscape(card.updatedAt || new Date().toISOString())}) ON CONFLICT (id) DO NOTHING;`);
  }
}
out.push('');

out.push('-- 5. INSERT STUDY LOGS (1099 ATTEMPTS, 890 CORRECT)');
for (const log of logs) {
  out.push(`INSERT INTO public.study_logs (id, card_id, deck_id, mode, rating, user_answer, is_correct, time_spent_seconds, verdict, created_at) VALUES (${sqlEscape(log.id)}, ${sqlEscape(log.cardId)}, ${sqlEscape(log.deckId)}, ${sqlEscape(log.mode)}, ${sqlEscape(log.rating)}, ${sqlEscape(log.userAnswer)}, ${log.isCorrect}, ${log.timeSpentSeconds}, ${sqlEscape(log.verdict)}, ${sqlEscape(log.timestamp)}) ON CONFLICT (id) DO NOTHING;`);
}
out.push('');

out.push('-- 6. INSERT USER PREFERENCES & CARD GROUP FILTERS');
out.push(`INSERT INTO public.user_preferences (user_id, preferences, updated_at) VALUES ('00000000-0000-0000-0000-000000000001', ${sqlEscape(userPreferences)}, NOW()) ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = NOW();\n`);

out.push('COMMIT;\n');

const sqlContent = out.join('\n');
const outPath = path.resolve('exports', 'NUTRIBOARD_COMPLETE_DATABASE_MIGRATION.sql');
fs.writeFileSync(outPath, sqlContent, 'utf8');
console.log(`Saved migration SQL to: ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);

// Also apply directly to local Postgres DB if DATABASE_URL is available
async function applyToDb() {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL configured in .env.local, skipping direct DB execution.');
    return;
  }
  console.log('Applying migration directly to local PostgreSQL database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(sqlContent);
    console.log('Direct PostgreSQL migration successfully completed!');
    
    // Quick verification query
    const decksRes = await client.query('SELECT COUNT(*) FROM public.decks;');
    const cardsRes = await client.query('SELECT COUNT(*) FROM public.flashcards;');
    const logsRes = await client.query('SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct = true) as correct FROM public.study_logs;');
    console.log(`DB Stats: Decks=${decksRes.rows[0].count}, Cards=${cardsRes.rows[0].count}, Logs=${logsRes.rows[0].count} (${logsRes.rows[0].correct} correct)`);
  } catch (err) {
    console.error('Error applying to local PostgreSQL:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

applyToDb();
