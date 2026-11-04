const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_awz4xVocW9eu@ep-falling-frog-aovxbz4d-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });

async function audit() {
  try {
    const res = await pool.query(`
      SELECT f.id, f.deck_id, d.title as deck_title, f.front, f.back, f.options, f.rationale
      FROM public.flashcards f
      JOIN public.decks d ON d.id = f.deck_id
      WHERE d.title ILIKE '%quiz contest%' OR d.title ILIKE '%mock board exam%'
      ORDER BY d.title, f.id
    `);

    console.log(`Total cards audited: ${res.rows.length}`);

    const issues = [];
    for (const card of res.rows) {
      let opts = [];
      try {
        opts = Array.isArray(card.options) ? card.options : JSON.parse(card.options || '[]');
      } catch {
        opts = [];
      }

      const problemList = [];
      if (!card.front || !card.front.trim()) problemList.push('MISSING_FRONT');
      if (!card.back || !card.back.trim()) problemList.push('MISSING_BACK');
      if (!card.rationale || !card.rationale.trim() || card.rationale === '<EMPTY>') problemList.push('MISSING_RATIONALE');
      if (opts.length < 2) problemList.push('INSUFFICIENT_OPTIONS');
      if (opts.some(o => /choice [a-d]/i.test(o))) problemList.push('PLACEHOLDER_OPTIONS');

      const isTF = card.back.trim().toLowerCase() === 'true' || card.back.trim().toLowerCase() === 'false';
      if (isTF && (opts.length > 2 || !opts.includes('True') || !opts.includes('False'))) {
        problemList.push('MALFORMED_TF_OPTIONS');
      }

      if (problemList.length > 0) {
        issues.push({
          id: card.id,
          deck: card.deck_title,
          front: card.front.substring(0, 60).replace(/\s+/g, ' '),
          back: card.back,
          problems: problemList
        });
      }
    }

    console.log(`Total cards with issues: ${issues.length}`);
    const byDeckAndProblem = {};
    for (const iss of issues) {
      const key = `${iss.deck} -> ${iss.problems.join(', ')}`;
      byDeckAndProblem[key] = (byDeckAndProblem[key] || 0) + 1;
    }
    console.table(byDeckAndProblem);

  } finally {
    await pool.end();
  }
}

audit();

