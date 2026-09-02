// Ejecuta db/migrations.sql contra Neon, statement por statement.
// Uso:
//   DUMP_DB_URL=... node db/run-migrations.js              -> Fase 1 (antes de ==FINALIZE==)
//   DUMP_DB_URL=... node db/run-migrations.js --finalize   -> Fase 2 (después de ==FINALIZE==)
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const connStr = process.env.DUMP_DB_URL;
if (!connStr) { console.error('Falta DUMP_DB_URL'); process.exit(1); }
const sql = neon(connStr);

const finalize = process.argv.includes('--finalize');
const dir = path.dirname(fileURLToPath(import.meta.url));
const fullSql = fs.readFileSync(path.join(dir, 'migrations.sql'), 'utf8');

const MARKER = '-- ==FINALIZE==';
const markerIdx = fullSql.indexOf(MARKER);
if (markerIdx === -1) { console.error('No se encontró el marcador ' + MARKER); process.exit(1); }

const chunk = finalize ? fullSql.slice(markerIdx + MARKER.length) : fullSql.slice(0, markerIdx);

// Quita las líneas de comentario completas ANTES de partir por ';' —
// de lo contrario un ';' dentro de un comentario rompe el split.
const sqlOnly = chunk
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

const statements = sqlOnly
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

async function main() {
  console.log(`Fase: ${finalize ? '2 (finalize)' : '1'} — ${statements.length} statement(s)`);
  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 90);
    process.stdout.write(`→ ${preview}... `);
    try {
      await sql.query(stmt);
      console.log('OK');
    } catch (e) {
      console.log('FALLÓ');
      throw e;
    }
  }
  console.log('Listo.');
}

main().catch(e => { console.error(e); process.exit(1); });
