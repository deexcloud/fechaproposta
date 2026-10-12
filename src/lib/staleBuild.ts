// Depois de cada deploy, os arquivos do site mudam de nome. Quem estava com a
// versão antiga aberta pede arquivos que não existem mais e a tela quebra.
// Nesse caso, recarrega a página uma vez para buscar a versão nova.

const KEY = 'fechaproposta:recarregou-versao';
const WINDOW_MS = 30_000;

/** Erro de arquivo de outra versão (import dinâmico que falhou). */
export function isStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch dynamically|is not a valid JavaScript MIME type|ChunkLoadError/i.test(message);
}

/**
 * Recarrega a página, no máximo uma vez a cada 30 s (evita ficar em loop se o
 * problema for outro). Devolve false quando já recarregou há pouco.
 */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* sem armazenamento: recarrega mesmo assim (uma vez por carregamento) */
  }
  window.location.reload();
  return true;
}
