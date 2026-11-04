const { Pool } = require('pg');

const localPool = new Pool({ connectionString: 'postgresql://postgres:5epi6%40395@localhost:5432/nutriboards' });
const neonPool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_awz4xVocW9eu@ep-falling-frog-aovxbz4d-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });

async function syncAiCache() {
  console.log('Fetching AI explanations from local DB...');
  const localRows = await localPool.query('SELECT * FROM public.ai_explanation_cache');
  console.log(`Found ${localRows.rows.length} AI explanations in local DB.`);

  if (localRows.rows.length > 0) {
    console.log('Uploading AI explanations to Neon...');
    const client = await neonPool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < localRows.rows.length; i += 100) {
        const chunk = localRows.rows.slice(i, i + 100);
        const values = [];
        const placeholders = chunk.map((r, idx) => {
          const offset = idx * 7;
          values.push(
            r.id,
            r.question_hash,
            r.front_text,
            r.back_text,
            typeof r.options === 'string' ? r.options : JSON.stringify(r.options || []),
            r.explanation,
            typeof r.breakdown === 'string' ? r.breakdown : JSON.stringify(r.breakdown || {})
          );
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}::jsonb, $${offset + 6}, $${offset + 7}::jsonb)`;
        });

        await client.query(`
          INSERT INTO public.ai_explanation_cache (id, question_hash, front_text, back_text, options, explanation, breakdown)
          VALUES ${placeholders.join(',')}
          ON CONFLICT (question_hash) DO NOTHING
        `, values);
      }
      await client.query('COMMIT');
      console.log('Successfully copied all 3,696 AI explanations into Neon!');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error uploading AI cache to Neon:', err);
    } finally {
      client.release();
    }
  }

  await localPool.end();
  await neonPool.end();
}

syncAiCache().catch(console.error);

