// Título e indexação por rota. O título ajuda quem usa leitor de tela a saber onde está
// (WCAG 2.4.2) e o buscador a mostrar a página certa.

const SITE = 'FechaProposta';

/** Páginas que definem o próprio título (com dados da proposta, do documento etc.). */
const SELF_TITLED = [/^\/$/, /^\/exemplo$/, /^\/p\//, /^\/termos$/, /^\/privacidade$/, /^\/painel\/propostas\/[^/]+\/visualizar$/];

const TITLES: [RegExp, string][] = [
  [/^\/entrar$/, 'Entrar'],
  [/^\/criar-conta$/, 'Criar conta'],
  [/^\/esqueci-senha$/, 'Esqueci a senha'],
  [/^\/redefinir-senha$/, 'Nova senha'],
  [/^\/convite\//, 'Convite para a equipe'],
  [/^\/assinatura\/retorno$/, 'Pagamento'],
  [/^\/admin$/, 'Administração'],
  [/^\/painel\/configurar$/, 'Configurar conta'],
  [/^\/painel\/?$/, 'Painel'],
  [/^\/painel\/propostas$/, 'Propostas'],
  [/^\/painel\/propostas\/nova$/, 'Nova proposta'],
  [/^\/painel\/propostas\/[^/]+\/editar$/, 'Editar proposta'],
  [/^\/painel\/propostas\/[^/]+$/, 'Proposta'],
  [/^\/painel\/clientes$/, 'Clientes'],
  [/^\/painel\/catalogo$/, 'Catálogo'],
  [/^\/painel\/modelos\/novo$/, 'Novo modelo'],
  [/^\/painel\/modelos\/[^/]+$/, 'Editar modelo'],
  [/^\/painel\/modelos$/, 'Modelos'],
  [/^\/painel\/configuracoes$/, 'Configurações'],
];

/** Só o que é público e serve a quem ainda não é cliente entra no buscador. */
const INDEXABLE = [/^\/$/, /^\/exemplo$/, /^\/criar-conta$/, /^\/termos$/, /^\/privacidade$/];

export const isIndexable = (path: string) => INDEXABLE.some((r) => r.test(path));

/** Título da rota, ou `null` quando a própria página cuida dele. */
export function routeTitle(path: string): string | null {
  if (SELF_TITLED.some((r) => r.test(path))) return null;
  const match = TITLES.find(([r]) => r.test(path));
  return match ? `${match[1]} · ${SITE}` : `Página não encontrada · ${SITE}`;
}

function setHeadTag(selector: string, create: () => HTMLElement, attr: string, value: string | null) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (value === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/** Aplica título, canonical e noindex da rota atual. */
export function applyRouteMeta(path: string) {
  const title = routeTitle(path);
  if (title) document.title = title;
  const indexable = isIndexable(path);
  setHeadTag(
    'link[rel="canonical"]',
    () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
    'href',
    indexable ? `${window.location.origin}${path}` : null,
  );
  setHeadTag(
    'meta[name="robots"]',
    () => Object.assign(document.createElement('meta'), { name: 'robots' }),
    'content',
    indexable ? null : 'noindex, nofollow',
  );
}
