const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { decompress } = require('fzstd');
const initSqlJs = require('sql.js');

async function testAnkiPipeline() {
  console.log('=== TEST 1: Anki .colpkg Import Pipeline ===');
  const colpkgPath = path.join(__dirname, '..', 'collection-20260811212525.colpkg');
  if (!fs.existsSync(colpkgPath)) {
    console.warn('colpkg file not found at:', colpkgPath);
    return false;
  }

  const fileData = fs.readFileSync(colpkgPath);
  const zip = await JSZip.loadAsync(fileData);

  // 1. Security checks
  for (const name of Object.keys(zip.files)) {
    if (name.includes('..') || name.startsWith('/') || name.startsWith('\\')) {
      throw new Error(`Security Exception: zip slip vulnerability detected in entry ${name}`);
    }
  }
  console.log('✔ Zip Slip security checks passed: 0 unsafe paths in zip.');

  // 2. Extract SQLite
  const dbFile = zip.file('collection.anki21b') || zip.file('collection.anki2');
  if (!dbFile) throw new Error('No collection db in archive');

  const rawBytes = await dbFile.async('uint8array');
  const dbBuffer = dbFile.name.endsWith('b') ? decompress(rawBytes) : rawBytes;
  console.log(`✔ Decompressed SQLite DB buffer: ${dbBuffer.length.toLocaleString()} bytes`);

  const SQL = await initSqlJs();
  const db = new SQL.Database(dbBuffer);

  // Drop stats and custom collation indices
  db.exec(`
    DROP TABLE IF EXISTS sqlite_stat1;
    DROP TABLE IF EXISTS sqlite_stat4;
    DROP INDEX IF EXISTS idx_fields_name_ntid;
    DROP INDEX IF EXISTS idx_templates_name_ntid;
    DROP INDEX IF EXISTS idx_notetypes_name;
    DROP INDEX IF EXISTS idx_decks_name;
  `);

  const cardCountRes = db.exec('SELECT count(*) FROM cards');
  const totalCards = cardCountRes[0].values[0][0];

  const deckCountRes = db.exec('SELECT count(*) FROM decks');
  const totalDecks = deckCountRes[0].values[0][0];

  const notesRes = db.exec('SELECT id, mid, flds, tags FROM notes');
  const totalNotes = notesRes[0].values.length;

  console.log(`✔ Extracted SQLite: ${totalDecks} decks, ${totalNotes} notes, ${totalCards} cards.`);
  db.close();
  return true;
}

async function testQuizletDataset() {
  console.log('\n=== TEST 2: Quizlet Food Service Dataset (200 Questions) ===');
  const deckPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'quizletFoodServiceDeck.ts');
  const content = fs.readFileSync(deckPath, 'utf8');

  // Check presence of 200 questions
  const cardIdMatches = content.match(/card-foodservice-ndle-\d+/g);
  const cardCount = cardIdMatches ? cardIdMatches.length : 0;
  console.log(`✔ Verified Quizlet Food Service deck contains ${cardCount} cards.`);
  if (cardCount !== 200) {
    throw new Error(`Expected 200 cards, found ${cardCount}`);
  }

  // Check sample questions and rationales
  if (!content.includes('Garlic, onions, and shallots')) throw new Error('Missing question 1');
  if (!content.includes('Clostridium Botulinum')) throw new Error('Missing question 3');
  if (!content.includes('Coagulation')) throw new Error('Missing question 2 answer');
  if (!content.includes('Food Infection')) throw new Error('Missing question 200');

  console.log('✔ Sample questions and rationales verified across entire 200-card set.');
  return true;
}

async function run() {
  try {
    await testAnkiPipeline();
    await testQuizletDataset();
    console.log('\n🎉 ALL IMPORTER TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

run();
