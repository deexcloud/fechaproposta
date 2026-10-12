// Junta todas as migrations (em ordem) num único arquivo para colar no
// SQL Editor do Supabase. Uso: npm run db:bundle
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const dir = join(root, 'supabase', 'migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const header = `-- =====================================================================
-- FechaProposta — criação completa do banco (gerado por npm run db:bundle)
--
-- Cole TUDO no SQL Editor do Supabase (projeto novo e vazio) e clique em Run.
-- Rode uma única vez. Não use junto com "supabase db push" no mesmo projeto.
-- Arquivos incluídos: ${files.join(', ')}
-- =====================================================================
`;

const body = files
  .map((f) => `\n-- >>>>>>>>>> ${f} <<<<<<<<<<\n\n${readFileSync(join(dir, f), 'utf8').trim()}\n`)
  .join('\n');

const out = join(root, 'supabase', 'setup_completo.sql');
writeFileSync(out, header + body);
console.log(`Gerado ${out} (${files.length} migrations)`);
