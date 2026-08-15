const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { decompress } = require('fzstd');

async function checkDb() {
  const data = fs.readFileSync(path.join(__dirname, '..', 'collection-20260811212525.colpkg'));
  const zip = await JSZip.loadAsync(data);
  
  let dbBuffer = null;
  
  if (zip.file('collection.anki21b')) {
    console.log('Found collection.anki21b (zstd compressed). Decompressing...');
    const compressed = await zip.file('collection.anki21b').async('nodebuffer');
    dbBuffer = Buffer.from(decompress(compressed));
    console.log('Decompressed anki21b size:', dbBuffer.length);
  } else if (zip.file('collection.anki21')) {
    console.log('Found collection.anki21.');
    dbBuffer = await zip.file('collection.anki21').async('nodebuffer');
  } else if (zip.file('collection.anki2')) {
    console.log('Found collection.anki2.');
    dbBuffer = await zip.file('collection.anki2').async('nodebuffer');
  }
  
  const tmpPath = path.join(__dirname, 'temp_test.db');
  fs.writeFileSync(tmpPath, dbBuffer);
  
  const db = new Database(tmpPath);
  db.collation('unicase', (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL").all();
  console.log('--- SCHEMA ---');
  schema.forEach(s => console.log(s.sql + ';\n'));

  const colRow = db.prepare('SELECT * FROM col').get();

  console.log('--- NOTETYPES ---');
  if (tables.some(t => t.name === 'notetypes')) {
    const notetypes = db.prepare('SELECT * FROM notetypes').all();
    console.log('notetypes count:', notetypes.length);
    notetypes.forEach(nt => {
      console.log('Notetype ID:', nt.id, 'name:', nt.name);
      console.log('  config:', nt.config ? nt.config.toString('utf8').slice(0, 100) : null);
    });
  }

  console.log('--- FIELDS ---');
  if (tables.some(t => t.name === 'fields')) {
    const fields = db.prepare('SELECT * FROM fields').all();
    console.log('fields count:', fields.length);
    fields.slice(0, 10).forEach(f => console.log('Field:', f.ntid, f.ord, f.name));
  }

  console.log('--- TEMPLATES ---');
  if (tables.some(t => t.name === 'templates')) {
    const templates = db.prepare('SELECT * FROM templates').all();
    console.log('templates count:', templates.length);
    templates.slice(0, 5).forEach(t => console.log('Template:', t.ntid, t.ord, t.name));
  }

  console.log('--- COL ---');
  console.log(colRow);

  db.close();
  if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
}

checkDb().catch(console.error);
