const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function cleanImg(str) {
  if (!str) return str;
  return str.replace(/<img([^>]*)src="data:image\/[^"]+"([^>]*)>/gi, (match, before, after) => {
    const combined = before + ' ' + after;
    const altMatch = combined.match(/alt="([^"]*)"/i);
    const title = altMatch && altMatch[1] && altMatch[1].trim() ? altMatch[1].trim() : 'Diagram';
    return `[Image: ${title}]`;
  });
}

async function run() {
  const giantCards = await pool.query(`
    SELECT f.id, f.front, f.back, f.rationale
    FROM flashcards f
    WHERE LENGTH(f.front) > 10000 OR LENGTH(f.back) > 10000 OR LENGTH(f.rationale) > 10000;
  `);

  console.log(`Found ${giantCards.rows.length} cards with length > 10,000 to clean.`);
  let updatedCount = 0;

  for (const c of giantCards.rows) {
    const cleanedFront = cleanImg(c.front);
    const cleanedBack = cleanImg(c.back);
    const cleanedRationale = cleanImg(c.rationale);

    if (
      cleanedFront !== c.front ||
      cleanedBack !== c.back ||
      cleanedRationale !== c.rationale
    ) {
      await pool.query(`
        UPDATE flashcards
        SET front = $1, back = $2, rationale = $3, updated_at = NOW()
        WHERE id = $4
      `, [cleanedFront, cleanedBack, cleanedRationale, c.id]);
      updatedCount++;
    }
  }

  console.log(`Successfully cleaned base64 images from ${updatedCount} cards!`);
  await pool.end();
}

run();
