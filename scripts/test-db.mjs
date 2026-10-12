// Aplica todas as migrations num PostgreSQL em memória (PGlite) e roda os
// testes SQL de supabase/tests. Não precisa de Docker nem de projeto Supabase.
// Uso: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const migrationsDir = join(root, 'supabase', 'migrations');
const testsDir = join(root, 'supabase', 'tests');

const db = new PGlite();
await db.exec(readFileSync(join(testsDir, '_supabase_stub.sql'), 'utf8'));

for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
  try {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
    console.log(`✓ migration ${file}`);
  } catch (e) {
    console.error(`✗ migration ${file}\n  ${e.message}${e.where ? `\n  ${e.where}` : ''}`);
    process.exit(1);
  }
}

let failed = 0;
for (const file of readdirSync(testsDir).filter((f) => f.endsWith('.sql') && !f.startsWith('_')).sort()) {
  try {
    const results = await db.exec(readFileSync(join(testsDir, file), 'utf8'));
    const last = results.filter((r) => r.rows.length).pop()?.rows[0];
    console.log(`✓ ${file} ${last ? Object.values(last).join(' ') : ''}`);
  } catch (e) {
    failed++;
    console.error(`✗ ${file}\n  ${e.message}${e.where ? `\n  ${e.where}` : ''}`);
  }
}
await db.close();
process.exit(failed ? 1 : 0);
