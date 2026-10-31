const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  const decksRes = await pool.query('SELECT * FROM public.decks');
  const cardsRes = await pool.query('SELECT * FROM public.flashcards');
  const logsRes = await pool.query('SELECT * FROM public.study_logs ORDER BY created_at ASC');
  const prefsRes = await pool.query('SELECT * FROM public.user_preferences LIMIT 1');

  console.log('Decks in DB:', decksRes.rows.length);
  console.log('Cards in DB:', cardsRes.rows.length);
  console.log('Logs in DB:', logsRes.rows.length);

  const deckMap = new Map();
  for (const d of decksRes.rows) {
    deckMap.set(d.id, { ...d, cards: [] });
  }
  for (const c of cardsRes.rows) {
    const d = deckMap.get(c.deck_id);
    if (d) d.cards.push(c);
  }
  const decks = Array.from(deckMap.values());

  const cardSubjectMap = new Map();
  for (const d of decks) {
    for (const c of d.cards) {
      cardSubjectMap.set(c.id, c.ndle_subject);
    }
  }

  const subjectAttempts = {
    'Nutritional Biochemistry and Clinical Dietetics': [],
    'Community and Public Health Nutrition': [],
    'Foods and Food Service Systems': [],
  };

  for (const log of logsRes.rows) {
    const sub = cardSubjectMap.get(log.card_id);
    if (sub && subjectAttempts[sub]) {
      subjectAttempts[sub].push({
        cardId: log.card_id,
        isCorrect: log.is_correct,
        rating: log.rating,
        timestamp: log.created_at,
      });
    }
  }

  console.log('\n--- Practice Area Stats ---');
  for (const [sub, attempts] of Object.entries(subjectAttempts)) {
    const total = attempts.length;
    const correct = attempts.filter(a => a.isCorrect).length;
    const acc = Number(((correct / total) * 100).toFixed(1));

    const latestMap = new Map();
    for (const a of attempts) {
      latestMap.set(a.cardId, a);
    }
    const missed = Array.from(latestMap.values()).filter(a => !a.isCorrect || a.rating === 'again').length;

    console.log(sub + ':');
    console.log('  Volume: ' + total + ' / 30 volume target');
    console.log('  Score: ' + Math.round(acc) + '% (' + acc + '%)');
    console.log('  Correct: ' + correct + ' of ' + total);
    console.log('  Missed Questions: ' + missed);
  }

  const clinical = Number(((subjectAttempts['Nutritional Biochemistry and Clinical Dietetics'].filter(a => a.isCorrect).length / subjectAttempts['Nutritional Biochemistry and Clinical Dietetics'].length) * 100).toFixed(1));
  const community = Number(((subjectAttempts['Community and Public Health Nutrition'].filter(a => a.isCorrect).length / subjectAttempts['Community and Public Health Nutrition'].length) * 100).toFixed(1));
  const foodService = Number(((subjectAttempts['Foods and Food Service Systems'].filter(a => a.isCorrect).length / subjectAttempts['Foods and Food Service Systems'].length) * 100).toFixed(1));

  const gwa = Number((0.35 * clinical + 0.30 * community + 0.35 * foodService).toFixed(1));

  const k = 0.14;
  const delta = gwa - 75;
  const rawProb = 1 / (1 + Math.exp(-k * delta));
  const basePercent = 10 + rawProb * 85;
  const confidenceMultiplier = Math.pow(0.81, 0.65);
  const passingProb = Math.round(50 + (basePercent - 50) * confidenceMultiplier);

  console.log('\n--- Overall Board Readiness Report ---');
  console.log('NDLE GWA: ' + gwa + '% (Target >= 75.0%)');
  console.log('Passing Probability: ' + passingProb + '% (81% Conf.)');
  console.log('Questions: ' + logsRes.rows.length + ' (' + logsRes.rows.filter(l => l.is_correct).length + ' correct)');
  console.log('NBCD Area Label: ' + prefsRes.rows[0].preferences.cardGroupFilters.nbcd.name);

  await pool.end();
}

verify();
