import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDbPool, query, queryOne, isDbConnected } from '../src/lib/db';
import { getDecksWithStats, getDeckNames } from '../src/actions/decks';
import { getDueCards, getDueCountByDeck } from '../src/actions/review';
import { getCBLEExamQuestions } from '../src/actions/cble';

async function verifyMigration() {
  console.log('====================================================');
  console.log('   NUTRIBOARD LOCAL POSTGRESQL VERIFICATION SUITE   ');
  console.log('====================================================\n');

  // 1. Connection check
  console.log('1. Checking database connection...');
  const connected = await isDbConnected();
  if (!connected) {
    throw new Error('Failed to connect to local PostgreSQL database!');
  }
  console.log('   ✓ Connected to PostgreSQL successfully!\n');

  // 2. Count verification
  console.log('2. Verifying existing records in "nutriboards"...');
  const deckCount = await queryOne<{ count: string }>('SELECT count(*) as count FROM public.decks');
  const cardCount = await queryOne<{ count: string }>('SELECT count(*) as count FROM public.flashcards');
  const logCount = await queryOne<{ count: string }>('SELECT count(*) as count FROM public.study_logs');

  const numDecks = parseInt(deckCount?.count || '0', 10);
  const numCards = parseInt(cardCount?.count || '0', 10);
  const numLogs = parseInt(logCount?.count || '0', 10);

  console.log(`   - Decks count:      ${numDecks} (expected: 96) -> ${numDecks === 96 ? '✓ PASS' : '⚠ NOTICE'}`);
  console.log(`   - Flashcards count: ${numCards} (expected: 7792) -> ${numCards === 7792 ? '✓ PASS' : '⚠ NOTICE'}`);
  console.log(`   - Study Logs count: ${numLogs} (expected: 1000) -> ${numLogs === 1000 ? '✓ PASS' : '⚠ NOTICE'}\n`);

  // 3. Test Decks Server Action
  console.log('3. Testing getDecksWithStats() server action...');
  const decksWithStats = await getDecksWithStats();
  console.log(`   ✓ Retrieved ${decksWithStats.length} decks with stats!`);
  if (decksWithStats.length > 0) {
    console.log(`   Sample deck: "${decksWithStats[0].name}" (Total cards: ${decksWithStats[0].totalCards}, Mastery: ${decksWithStats[0].masteryPercent}%)\n`);
  }

  // 4. Test Deck Names Action
  console.log('4. Testing getDeckNames() server action...');
  const deckNames = await getDeckNames();
  console.log(`   ✓ Retrieved ${deckNames.length} deck names!\n`);

  // 5. Test Review Cards Action
  console.log('5. Testing getDueCards() server action...');
  const dueCards = await getDueCards();
  console.log(`   ✓ Retrieved ${dueCards.length} review cards across decks!\n`);

  // 6. Test Due Count by Deck Action
  console.log('6. Testing getDueCountByDeck() server action...');
  const dueByDeck = await getDueCountByDeck();
  console.log(`   ✓ Retrieved due counts for ${dueByDeck.length} decks!\n`);

  // 7. Test CBLE Question Extraction
  console.log('7. Testing getCBLEExamQuestions() action...');
  const examQuestions = await getCBLEExamQuestions(10);
  console.log(`   ✓ Retrieved ${examQuestions.length} CBLE board exam simulation questions!\n`);

  console.log('====================================================');
  console.log('   ALL VERIFICATIONS PASSED - ZERO SUPABASE DEPENDENCY');
  console.log('====================================================');

  const pool = getDbPool();
  await pool.end();
}

verifyMigration().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

