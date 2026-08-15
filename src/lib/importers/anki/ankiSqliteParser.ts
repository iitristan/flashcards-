import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { AnkiCollectionData, AnkiRawDeck, AnkiRawModel, AnkiRawNote, AnkiRawCard } from '../types';

let sqlJsInstance: SqlJsStatic | null = null;

async function getSqlJs(): Promise<SqlJsStatic> {
  if (sqlJsInstance) return sqlJsInstance;

  // Configure sql.js for both browser and Node.js environments
  if (typeof window !== 'undefined') {
    sqlJsInstance = await initSqlJs({
      locateFile: (file: string) => (file.endsWith('.wasm') ? '/sql-wasm.wasm' : file)
    });
  } else {
    sqlJsInstance = await initSqlJs();
  }

  return sqlJsInstance;
}

/**
 * Parses the in-memory SQLite database extracted from an Anki package (.colpkg / .apkg)
 */
export async function parseAnkiSqlite(
  dbBuffer: Uint8Array,
  mediaMap: Map<string, string> = new Map()
): Promise<AnkiCollectionData> {
  const SQL = await getSqlJs();

  let db: Database;
  try {
    db = new SQL.Database(dbBuffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid SQLite data';
    throw new Error(`Failed to load SQLite collection database: ${msg}`);
  }

  try {
    // Drop stats tables and custom collation indices that trigger missing collation errors during queries
    try {
      db.exec(`
        DROP TABLE IF EXISTS sqlite_stat1;
        DROP TABLE IF EXISTS sqlite_stat4;
        DROP INDEX IF EXISTS idx_fields_name_ntid;
        DROP INDEX IF EXISTS idx_templates_name_ntid;
        DROP INDEX IF EXISTS idx_notetypes_name;
        DROP INDEX IF EXISTS idx_decks_name;
      `);
    } catch {
      // Ignore cleanup failures
    }

    // 1. Get list of all tables
    const tablesRes = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    const tables = new Set<string>();
    if (tablesRes.length > 0 && tablesRes[0].values) {
      for (const row of tablesRes[0].values) {
        if (typeof row[0] === 'string') {
          tables.add(row[0].toLowerCase());
        }
      }
    }

    // 2. Read 'col' table
    let crt = Math.floor(Date.now() / 1000);
    let colModelsJson: Record<string, unknown> = {};
    let colDecksJson: Record<string, unknown> = {};

    if (tables.has('col')) {
      const colRes = db.exec('SELECT crt, models, decks FROM col LIMIT 1');
      if (colRes.length > 0 && colRes[0].values && colRes[0].values.length > 0) {
        const row = colRes[0].values[0];
        if (typeof row[0] === 'number') crt = row[0];
        
        if (typeof row[1] === 'string' && row[1].trim()) {
          try {
            colModelsJson = JSON.parse(row[1]);
          } catch (e) {
            console.warn('Warning: Failed to parse models JSON from col table:', e);
          }
        }

        if (typeof row[2] === 'string' && row[2].trim()) {
          try {
            colDecksJson = JSON.parse(row[2]);
          } catch (e) {
            console.warn('Warning: Failed to parse decks JSON from col table:', e);
          }
        }
      }
    }

    // 3. Extract Decks
    const decksMap = new Map<string, AnkiRawDeck>();

    // Try modern 'decks' table first
    if (tables.has('decks')) {
      const decksRes = db.exec('SELECT id, name, mtime_secs FROM decks');
      if (decksRes.length > 0 && decksRes[0].values) {
        for (const row of decksRes[0].values) {
          const id = String(row[0]);
          let name = String(row[1] || 'Default');
          // Replace Anki unit separator \x1f with :: for subdeck hierarchy
          name = name.replace(/\x1f/g, '::');
          const mtime_secs = typeof row[2] === 'number' ? row[2] : undefined;
          decksMap.set(id, { id, name, mtime_secs });
        }
      }
    }

    // Merge with legacy col.decks if needed
    for (const [id, d] of Object.entries(colDecksJson)) {
      if (typeof d === 'object' && d !== null) {
        const deckObj = d as { name?: string; desc?: string; mod?: number };
        let name = deckObj.name || 'Default';
        name = name.replace(/\x1f/g, '::');
        if (!decksMap.has(id)) {
          decksMap.set(id, {
            id,
            name,
            desc: deckObj.desc,
            mtime_secs: deckObj.mod
          });
        }
      }
    }

    // If still no decks found, provide a fallback default deck
    if (decksMap.size === 0) {
      decksMap.set('1', { id: '1', name: 'Imported Deck' });
    }

    // 4. Extract Models / Note Types
    const modelsMap = new Map<number | string, AnkiRawModel>();

    // Try modern 'notetypes', 'fields', 'templates' tables first
    if (tables.has('notetypes')) {
      const ntRes = db.exec('SELECT id, name FROM notetypes');
      if (ntRes.length > 0 && ntRes[0].values) {
        for (const row of ntRes[0].values) {
          const id = row[0] as number | string;
          const name = String(row[1] || 'Basic');
          modelsMap.set(id, {
            id,
            name,
            flds: [],
            tmpls: []
          });
        }
      }

      if (tables.has('fields')) {
        const fldsRes = db.exec('SELECT ntid, ord, name FROM fields ORDER BY ntid, ord ASC');
        if (fldsRes.length > 0 && fldsRes[0].values) {
          for (const row of fldsRes[0].values) {
            const ntid = row[0] as number | string;
            const ord = Number(row[1] || 0);
            const name = String(row[2] || `Field ${ord + 1}`);
            const model = modelsMap.get(ntid);
            if (model) {
              model.flds.push({ name, ord });
            }
          }
        }
      }

      if (tables.has('templates')) {
        const tmplsRes = db.exec('SELECT ntid, ord, name FROM templates ORDER BY ntid, ord ASC');
        if (tmplsRes.length > 0 && tmplsRes[0].values) {
          for (const row of tmplsRes[0].values) {
            const ntid = row[0] as number | string;
            const ord = Number(row[1] || 0);
            const name = String(row[2] || `Card ${ord + 1}`);
            const model = modelsMap.get(ntid);
            if (model) {
              model.tmpls.push({ name, ord });
            }
          }
        }
      }
    }

    // Merge with legacy col.models
    for (const [id, m] of Object.entries(colModelsJson)) {
      if (typeof m === 'object' && m !== null) {
        const modelObj = m as {
          name?: string;
          flds?: { name: string; ord: number }[];
          tmpls?: { name: string; ord: number; qfmt?: string; afmt?: string }[];
          css?: string;
        };
        const numericId = Number(id) || id;
        if (!modelsMap.has(numericId) || modelsMap.get(numericId)!.flds.length === 0) {
          modelsMap.set(numericId, {
            id: numericId,
            name: modelObj.name || 'Basic',
            flds: modelObj.flds || [{ name: 'Front', ord: 0 }, { name: 'Back', ord: 1 }],
            tmpls: modelObj.tmpls || [{ name: 'Card 1', ord: 0 }],
            css: modelObj.css
          });
        }
      }
    }

    // 5. Extract Notes
    const notesMap = new Map<number, AnkiRawNote>();
    if (tables.has('notes')) {
      const notesRes = db.exec('SELECT id, mid, tags, flds, sfld FROM notes');
      if (notesRes.length > 0 && notesRes[0].values) {
        for (const row of notesRes[0].values) {
          const id = Number(row[0]);
          const mid = Number(row[1]);
          const rawTags = String(row[2] || '').trim();
          const tags = rawTags ? rawTags.split(/\s+/).filter(Boolean) : [];
          const rawFlds = String(row[3] || '');
          const flds = rawFlds.split('\x1f');
          const sfld = String(row[4] || '');

          notesMap.set(id, {
            id,
            mid,
            tags,
            flds,
            sfld
          });
        }
      }
    }

    // 6. Extract Cards
    const cardsList: AnkiRawCard[] = [];
    if (tables.has('cards')) {
      const cardsRes = db.exec('SELECT id, nid, did, ord, type, queue, due, ivl, factor, reps, lapses FROM cards');
      if (cardsRes.length > 0 && cardsRes[0].values) {
        for (const row of cardsRes[0].values) {
          cardsList.push({
            id: Number(row[0]),
            nid: Number(row[1]),
            did: String(row[2]),
            ord: Number(row[3] || 0),
            type: Number(row[4] || 0),
            queue: Number(row[5] || 0),
            due: Number(row[6] || 0),
            ivl: Number(row[7] || 0),
            factor: Number(row[8] || 2500),
            reps: Number(row[9] || 0),
            lapses: Number(row[10] || 0)
          });
        }
      }
    }

    return {
      decks: Array.from(decksMap.values()),
      models: modelsMap,
      notes: notesMap,
      cards: cardsList,
      mediaMap,
      crt
    };
  } finally {
    db.close();
  }
}
