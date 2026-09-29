-- ==========================================================
-- Nutriboard Cross-Device Cloud Sync Database Schema
-- Run this in your Supabase Dashboard: SQL Editor -> New query
-- ==========================================================

-- 0. DROP LEGACY CONSTRAINTS & NOT NULL (Permits zero-login couple sync without Auth dependency)
ALTER TABLE IF EXISTS public.decks DROP CONSTRAINT IF EXISTS decks_user_id_fkey;
ALTER TABLE IF EXISTS public.flashcards DROP CONSTRAINT IF EXISTS flashcards_user_id_fkey;
ALTER TABLE IF EXISTS public.playlists DROP CONSTRAINT IF EXISTS playlists_user_id_fkey;
ALTER TABLE IF EXISTS public.study_sessions DROP CONSTRAINT IF EXISTS study_sessions_user_id_fkey;
ALTER TABLE IF EXISTS public.study_logs DROP CONSTRAINT IF EXISTS study_logs_user_id_fkey;

ALTER TABLE IF EXISTS public.decks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.flashcards ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.playlists ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.study_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.study_logs ALTER COLUMN user_id DROP NOT NULL;

-- 1. DECKS TABLE
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

-- 2. FLASHCARDS TABLE
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

-- Migration helper for existing databases:
ALTER TABLE IF EXISTS public.flashcards ADD COLUMN IF NOT EXISTS ndle_subject TEXT DEFAULT NULL;


-- 3. PLAYLISTS TABLE
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

-- 4. USER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id TEXT PRIMARY KEY,
  preferences JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STUDY SESSIONS TABLE (Active & In-Progress Study Checkpoints)
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 6. STUDY LOGS TABLE (Historical Review Entries & Cross-Device Analytics)
CREATE TABLE IF NOT EXISTS public.study_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  deck_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  rating TEXT,
  user_answer TEXT DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  time_spent_seconds INT DEFAULT 0,
  verdict TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INDEXES FOR HIGH-PERFORMANCE QUERYING
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

-- 8. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

-- 9. RLS POLICIES (Allows authenticated couple sync as well as publishable anon key access)
DROP POLICY IF EXISTS "Allow all access to decks" ON public.decks;
CREATE POLICY "Allow all access to decks"
  ON public.decks
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to flashcards" ON public.flashcards;
CREATE POLICY "Allow all access to flashcards"
  ON public.flashcards
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to playlists" ON public.playlists;
CREATE POLICY "Allow all access to playlists"
  ON public.playlists
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to user_preferences" ON public.user_preferences;
CREATE POLICY "Allow all access to user_preferences"
  ON public.user_preferences
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to study_sessions" ON public.study_sessions;
CREATE POLICY "Allow all access to study_sessions"
  ON public.study_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to study_logs" ON public.study_logs;
CREATE POLICY "Allow all access to study_logs"
  ON public.study_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 10. CBLE EXAM RESULTS TABLE (PRC Computer-Based Licensure Examination History)
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

-- 11. CBLE QUESTIONS TABLE (Dedicated NDLE Mock Board Question Pool)
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

-- 12. CBLE INDEXES
CREATE INDEX IF NOT EXISTS idx_cble_exam_results_user_id ON public.cble_exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_cble_exam_results_created_at ON public.cble_exam_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cble_questions_subject ON public.cble_questions(subject);
CREATE INDEX IF NOT EXISTS idx_cble_questions_category ON public.cble_questions(category);

-- 13. CBLE RLS & POLICIES
ALTER TABLE public.cble_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cble_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to cble_exam_results" ON public.cble_exam_results;
CREATE POLICY "Allow all access to cble_exam_results"
  ON public.cble_exam_results
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to cble_questions" ON public.cble_questions;
CREATE POLICY "Allow all access to cble_questions"
  ON public.cble_questions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 14. AI EXPLANATION & ANSWER CACHE TABLES
-- Caches AI-generated explanations and grades to eliminate repeat API requests and costs
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

-- 15. CBLE QUESTION REFRAMES CACHE
-- Caches PRC board exam polished stems (capitalization, phrasing, structure fixes)
CREATE TABLE IF NOT EXISTS public.cble_question_reframes (
  original_stem TEXT PRIMARY KEY,
  reframed_stem TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. INDEXES & RLS POLICIES FOR AI CACHE
CREATE INDEX IF NOT EXISTS idx_ai_explanation_created ON public.ai_explanation_cache(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_grade_created ON public.ai_grade_cache(created_at DESC);

ALTER TABLE public.ai_explanation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_grade_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cble_question_reframes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to ai_explanation_cache" ON public.ai_explanation_cache;
CREATE POLICY "Allow all access to ai_explanation_cache"
  ON public.ai_explanation_cache FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to ai_grade_cache" ON public.ai_grade_cache;
CREATE POLICY "Allow all access to ai_grade_cache"
  ON public.ai_grade_cache FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to cble_question_reframes" ON public.cble_question_reframes;
CREATE POLICY "Allow all access to cble_question_reframes"
  ON public.cble_question_reframes FOR ALL USING (true) WITH CHECK (true);



