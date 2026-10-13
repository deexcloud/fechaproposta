// Trava de saída para navegações feitas por código (ex.: busca Ctrl+K).
// Cliques em links o editor já intercepta; aqui ele se registra para o resto.

type Guard = (to: string) => boolean;

let guard: Guard | null = null;

/** O editor registra a trava enquanto tem alteração não salva. Devolve a função que desfaz o registro. */
export function setLeaveGuard(fn: Guard): () => void {
  guard = fn;
  return () => {
    if (guard === fn) guard = null;
  };
}

/** true = a navegação foi segurada (a trava cuida de perguntar e navegar depois). */
export function isNavigationBlocked(to: string): boolean {
  return guard ? guard(to) : false;
}
