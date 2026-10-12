// Junta cada Edge Function de cobrança com _shared/billing.ts num arquivo único,
// para publicar colando no painel do Supabase (sem a CLI).
// Uso: npm run functions:painel  →  supabase/.painel/<função>.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { join } from 'node:path';
import vm from 'node:vm';

const root = join(import.meta.dirname, '..');
const fnDir = join(root, 'supabase', 'functions');
const outDir = join(root, 'supabase', '.painel');
const SHARED_IMPORT = /^import \{[^}]*\} from '\.\.\/_shared\/billing\.ts';\r?\n/m;

const shared = readFileSync(join(fnDir, '_shared', 'billing.ts'), 'utf8').replace(/^export /gm, '');
mkdirSync(outDir, { recursive: true });

for (const name of ['billing-checkout', 'billing-webhook']) {
  const source = readFileSync(join(fnDir, name, 'index.ts'), 'utf8');
  if (!SHARED_IMPORT.test(source)) throw new Error(`${name}: import de _shared/billing.ts não encontrado.`);
  const body = source.replace(
    SHARED_IMPORT,
    `\n// ---------- lógica compartilhada (_shared/billing.ts) ----------\n${shared}// ---------- fim da lógica compartilhada ----------\n\n`,
  );
  const out = `// ARQUIVO ÚNICO PARA COLAR NO PAINEL DO SUPABASE (função ${name}).\n// Gerado por "npm run functions:painel" — não edite aqui.\n\n${body}`;

  // Confere a sintaxe (sem executar): nomes repetidos ou sobrando quebram aqui.
  const js = stripTypeScriptTypes(out).replace(/^import .*$/gm, '');
  new vm.Script(`(async () => {${js}\n})`, { filename: `${name}.ts` });

  writeFileSync(join(outDir, `${name}.ts`), out);
  console.log(`✓ supabase/.painel/${name}.ts`);
}
