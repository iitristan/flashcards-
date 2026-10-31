import pg from 'pg';

let pool: pg.Pool | null = null;

/**
 * Parses DATABASE_URL safely, correctly handling unencoded '@' characters
 * or special characters in the database password.
 */
function parseDatabaseConfig(connectionString: string): pg.PoolConfig {
  try {
    const trimmed = connectionString.trim().replace(/^['"]|['"]$/g, '');
    const prefix = 'postgresql://';
    if (!trimmed.startsWith(prefix)) {
      return { connectionString: trimmed };
    }

    const withoutPrefix = trimmed.slice(prefix.length);
    const lastAt = withoutPrefix.lastIndexOf('@');
    const firstColon = withoutPrefix.indexOf(':');

    if (lastAt !== -1 && firstColon !== -1 && firstColon < lastAt) {
      const user = decodeURIComponent(withoutPrefix.slice(0, firstColon));
      const password = decodeURIComponent(withoutPrefix.slice(firstColon + 1, lastAt));
      const hostAndDb = withoutPrefix.slice(lastAt + 1);

      const slashIndex = hostAndDb.indexOf('/');
      const hostPort = slashIndex !== -1 ? hostAndDb.slice(0, slashIndex) : hostAndDb;
      const dbAndQuery = slashIndex !== -1 ? hostAndDb.slice(slashIndex + 1) : '';

      const [host, portStr] = hostPort.split(':');
      const [database] = dbAndQuery.split('?');

      return {
        user,
        password,
        host: host || 'localhost',
        port: portStr ? parseInt(portStr, 10) : 5432,
        database: database || 'nutriboards',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };
    }

    return { connectionString: trimmed, max: 20 };
  } catch {
    return { connectionString, max: 20 };
  }
}

export const hasDatabaseUrl = Boolean(
  process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0
);

export function getDbPool(): pg.Pool | null {
  if (!hasDatabaseUrl) {
    return null;
  }
  if (!pool) {
    const rawUrl = process.env.DATABASE_URL || '';
    const config = parseDatabaseConfig(rawUrl);
    pool = new pg.Pool(config);

    pool.on('error', (err) => {
      console.warn('[PostgreSQL Pool Warning]:', err.message);
    });
  }
  return pool;
}

/**
 * Executes a parameterized query and returns array of rows.
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = getDbPool();
  if (!p) {
    return [];
  }
  try {
    const result = await p.query(sql, params);
    return result.rows as T[];
  } catch (err: any) {
    console.warn('[PostgreSQL Query Warning]:', err.message);
    return [];
  }
}

/**
 * Executes a parameterized query and returns the first row or null.
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Executes an operation inside an atomic database transaction.
 */
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const p = getDbPool();
  if (!p) {
    throw new Error('DATABASE_URL is not configured.');
  }
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Health check verifying local PostgreSQL connectivity.
 */
export async function isDbConnected(): Promise<boolean> {
  if (!hasDatabaseUrl) return false;
  try {
    const res = await query('SELECT 1 as connected');
    return res.length > 0 && (res[0] as any).connected === 1;
  } catch {
    return false;
  }
}

/**
 * Ensures non-core cache & session tables exist without altering or dropping existing tables.
 */
export async function ensureAuxiliaryTablesExist(): Promise<void> {
  const ddl = `
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
  `;
  await query(ddl);
}

