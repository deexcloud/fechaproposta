# Auditoria de UI/UX e da landing page

Data: 13/10/2026. Escopo: sistema inteiro (landing, acesso, painel, editor, página pública).
Severidade na escala de Nielsen: 1 cosmético · 2 menor · 3 maior · 4 catástrofe.

## 1. Novo visual: escuro com degradê violeta

| O quê | Como ficou |
|---|---|
| Fundo | Preto levemente arroxeado (`#07060B`) com brilho violeta/índigo nos cantos (`gradients.page`). |
| Superfícies | Três camadas (`surface`, `surfaceElevated`, `muted`) com um véu de luz no topo dos cards. |
| Destaque | Botão principal, logo e indicadores em degradê violeta → índigo (`gradients.primary`). |
| Texto | Branco quebrado, cinza secundário e terciário, todos com contraste AA sobre o fundo. Links e rótulos em violeta claro (`accentText`), porque o violeta puro não passa no AA sobre preto. |
| Proposta do cliente | Continua **clara** (`LightScope`): é um documento que vai para o PDF e leva a marca de quem vende. Vale para `/p/:token`, `/exemplo`, a prévia/PDF e a prévia dentro do editor. |

Como funciona: `tokens` agora aponta para variáveis CSS (`var(--fp-...)`). A raiz define os valores escuros e `.fp-light` redefine os claros. Os valores reais ficam em `palettes.dark` / `palettes.light`, para quem não aceita variável (canvas da assinatura, cálculo de contraste da cor da marca, paleta do MUI).

## 2. Landing page: converte?

**Sim, a base é boa.** Tem promessa clara no título, CTA acima da dobra, redução de risco (7 dias, sem cartão, sem renovação automática), demonstração interativa, antes/depois, calculadora de retorno, preço transparente, FAQ que responde objeções e CTA fixo no celular.

### Corrigido agora
| Problema | Sev. | Correção |
|---|---|---|
| Subtítulo do hero longo (3 frases, repetia "computador/tablet/celular") | 2 | Encurtado para uma promessa + como funciona. |
| Nenhum CTA entre "Como funciona" e a calculadora (trecho longo sem ação) | 2 | CTA depois de "Feito para quem vende serviço", com a garantia ao lado. |
| Sem prova de confiança enquanto não há depoimentos | 3 | Faixa com fatos verificáveis do produto (comprovante de aceite, dados isolados, sem fidelidade, suporte humano). Nada de número ou selo inventado. |
| Link compartilhado no WhatsApp sem prévia (o produto é vendido por link) | 2 | Tags Open Graph no `index.html`. |
| Card de preço e CTA final sem destaque no tema novo | 1 | Borda luminosa em degradê e painel violeta → índigo. |

### Resolvido na segunda rodada
| Item | Sev. | Como ficou |
|---|---|---|
| Imagem de prévia do link | 2 | `public/og.png` (1200×630, no visual novo) com `og:image`/`twitter:image` em URL completa. O domínio vem de `VITE_SITE_URL` ou do domínio de produção da Vercel (`vite.config.ts`). |
| Landing carregada sob demanda | 2 | O pedaço da landing começa a baixar junto com o app quando a pessoa entra em `/`, sem esperar a rota montar. Ganho pequeno; a landing continua fora do pacote de quem abre só a proposta. |

### Pendente (depende de conteúdo real)
| Item | Sev. | Por quê |
|---|---|---|
| **Depoimentos reais** | 3 | Maior alavanca de conversão que falta. Preencha `TESTIMONIALS` em `LandingPage.tsx` com falas autorizadas; a seção aparece sozinha e a faixa de confiança sai. |
| Logos/números de clientes | 2 | Quando houver ("X propostas enviadas"), entra acima da dobra. Só com dados reais. |

## 3. Sistema: heurísticas de Nielsen

O sistema já trata bem a maioria das heurísticas: estados de carregando/vazio/erro em todas as listas, `friendlyError` com mensagens em português simples, confirmação antes de excluir, aviso de alteração não salva no editor, filtros na URL, paleta de comandos (Ctrl+K), checklist de primeiros passos e status com texto + ponto (cor nunca é a única pista).

### Corrigido agora
| Heurística | Problema | Onde | Sev. | Correção |
|---|---|---|---|---|
| H7 Flexibilidade | No celular, o botão "Lembrar" do painel sumia: a ação principal do "Precisa da sua atenção" ficava inacessível | `DashboardPage.tsx` | 3 | Ícone do WhatsApp com alvo de 44px no celular. |
| H3 Controle | Página 404 sempre mandava para o painel, e quem não está logado caía no login sem entender | `App.tsx` | 2 | Logado vai ao painel; deslogado vai ao início. |
| H2 Mundo real | Ícone de calendário no card "Ticket médio" | `DashboardPage.tsx` | 1 | Ícone de recibo. |
| H8 Acessibilidade | Cores da marca lidas como "Cor #A24B2A" por leitores de tela | `BrandFields.tsx` | 2 | Nomes ("Terracota", "Azul"…) em `aria-label` e dica. |
| H8 Contraste | Links e rótulo em foco em violeta puro sobre preto (abaixo de AA) | `theme.ts` | 2 | Violeta claro (`accentText`). |
| H8 Contraste | Assinatura digitada no detalhe da proposta ficaria branca sobre fundo branco no tema escuro | `ProposalDetailPage.tsx` | 3 | Cor escura fixa sobre o fundo branco da assinatura. |
| H4 Consistência | Barras com desfoque usavam bege de um tema antigo (`rgba(248,245,238)`) | `AppLayout`, editor | 1 | Token `glass`. |

### Corrigido na segunda rodada
| Heurística | Problema | Onde | Sev. | Correção |
|---|---|---|---|---|
| H4/H8 (bug do tema novo) | O degradê do botão principal cobria a cor da marca do vendedor no "Aceitar" do cliente e o verde do botão do WhatsApp | `theme.ts`, `dialogs.tsx` | 4 | Degradê só no tema escuro; no claro vale a cor da marca. Botão do WhatsApp sem degradê. |
| H3 Controle | Sair do editor pelo "Voltar" ou pelo menu descartava alterações sem aviso (só fechar a aba avisava) | `ProposalEditorPage.tsx` | 3 | Confirmação "Sair sem salvar?" com "Continuar editando". |
| H3 Controle | Remover item ou entrega não tinha volta | `ListEditors.tsx`, `NotifyProvider.tsx` | 3 | Aviso com **Desfazer** (8 s), que devolve o item no mesmo lugar. |
| H7 Flexibilidade | No celular só existia "Enviar"; não dava para salvar rascunho | `ProposalEditorPage.tsx` | 2 | Botão de salvar (ícone) no celular. |
| H9 Erros | Quantidade e unidade ficavam vermelhas sem dizer o problema | `ListEditors.tsx`, `schema.ts` | 2 | Mensagem embaixo do campo ("Informe a unidade."). |
| H1 Status | Dica do status só por `title` (não aparece no toque nem no teclado) | `StatusChip.tsx` | 2 | Tooltip acessível (toque longo no celular). A dica também aparece na linha do tempo do detalhe. |
| H5 Prevenção | "Registrar aceite" ficava desabilitado sem explicar e não avisava que a proposta trava | `dialogs.tsx` | 2 | Texto de ajuda no nome e aviso de que depois do aceite só dá para duplicar. |
| H4 Consistência | "Cancelar" na lista de convites parecia fechar algo, não revogar o convite | `TeamPanel.tsx` | 2 | "Cancelar convite", com carregamento e rótulo acessível. |

### Ainda em aberto (baixo impacto)
| Heurística | Problema | Sev. | Sugestão |
|---|---|---|---|
| H1 Status | Abrir "Enviar" num rascunho já ativa o link, mesmo que a pessoa feche sem mandar | 1 | Decisão de produto: hoje o diálogo avisa ("O link está ativo"). |

## 4. Terceira rodada (plano aprovado, prompt auditoria-ux-planejada.md)

| # | Área | Problema | Sev. | Correção |
|---|---|---|---|---|
| 1 | Cliente | Botão de aceitar bloqueado sem dizer o que falta | 3 | Frase "Para aceitar, falta …" e ajuda no campo de nome. |
| 2 | Cliente | "Pedir ajuste" / "Não tenho interesse" com 32px no celular | 2 | 44px de altura. |
| 3 | Cliente | Abas da assinatura em roxo do FechaProposta, não neutras | 2 | No tema claro, abas e progresso neutros. |
| 4 | Editor | Ctrl+K saía sem perguntar | 2 | Trava de saída também para navegação por código (`src/lib/leaveGuard.ts`). |
| 5 | Configurações | Trocar de aba perdia o que foi digitado | 2 | Abas ficam montadas, só escondidas. |
| 6 | Catálogo | Clique fora perdia o formulário; "Por" vermelho sem mensagem | 2 | Clique fora não fecha com texto digitado; mensagem de erro. |
| 7 | Cadastro inicial | WhatsApp inválido era aceito | 2 | Mesma validação de Configurações. |
| 8 | Cadastro inicial | Passos só com barrinhas | 1 | "Passo 1 de 2". |
| 9 | Painel | "Remover" e "Apagar" para a mesma ação | 1 | "Excluir" em todo lugar. |
| 10 | Landing | Duas maquetes empilhadas no celular | 2 | Só o celular do cliente: topo de 1.715px para 1.368px. |
| 11 | Landing | Selo repetia o subtítulo | 1 | "Aceite com assinatura, sem o cliente criar conta". |
| 12 | Landing | Faixa de benefícios repetia os recursos | 1 | Removida. |
| 13 | Cliente | Barra de rolagem escura na janela branca | 1 | Cor da barra segue o tema da área. |

**Animações da landing:** seções e cards aparecem ao rolar (subindo, pelos lados ou crescendo, em cascata), e no topo o painel entra pela esquerda, o celular pela direita e fica flutuando. Feito sem biblioteca (`src/components/Reveal.tsx` + CSS), animando só opacidade e posição, que o navegador processa sem travar. Respeita "reduzir movimento" do sistema. Peso: cerca de +0,4 KB comprimido no total desta rodada.

## 5. Quarta rodada: leis de UX, SEO, Web Vitals e WCAG (19/10/2026)

### Corrigido
| Área | Problema | Sev. | Correção |
|---|---|---|---|
| SEO / privacidade | Proposta do cliente (`/p/:token`), painel e convites podiam ser indexados pelo Google | 3 | `X-Robots-Tag: noindex` no `vercel.json` e `<meta name="robots">` por rota (`src/lib/seo.ts`). |
| SEO | Sem `robots.txt` nem `sitemap.xml` | 2 | Gerados no build com o domínio do site (`vite.config.ts`). |
| SEO | Sem `canonical` | 1 | Canonical nas páginas públicas (início, exemplo, criar conta, termos, privacidade). |
| WCAG 2.4.2 | Login, cadastro e painel ficavam com o título da página anterior | 2 | Título por rota ("Propostas · FechaProposta"); link inválido de proposta vira "Proposta". |
| WCAG 2.4.1 | Sem atalho para pular o menu pelo teclado | 2 | "Pular para o conteúdo" no primeiro Tab da landing e do painel. |
| WCAG 1.3.1 | Página do cliente sem região `main` para leitor de tela | 2 | Conteúdo da proposta marcado como `main`. |
| WCAG 2.5.8 / Fitts | Links do rodapé com 22px de altura | 1 | 34px e quebra de linha no celular. |

### Conferido e ok
- **Fitts:** CTAs da landing com 40–52px no celular; nenhum alvo abaixo de 24px em 375px.
- **Hick:** preço com só duas escolhas (mensal/anual, anual pré-selecionado); semestral citado no texto, sem virar terceiro botão.
- **Posição serial:** menu do painel começa em Início/Propostas e termina em Configurações; FAQ começa pela dúvida mais comum (celular).
- **Web Vitals (build local, sem limitar rede):** LCP ~0,3 s, CLS 0. JS inicial ~100 KB comprimido; landing, painel e proposta carregam sob demanda.

### Depende de ferramenta externa ou decisão
| Item | Como fazer |
|---|---|
| Core Web Vitals reais | Rodar PageSpeed Insights no domínio publicado (celular). O CSS da Google Fonts bloqueia a renderização; se o LCP passar de 2,5 s, hospedar as fontes no próprio site. |
| Contraste e leitor de tela completos | Rodar axe DevTools ou WAVE em cada tela logada e testar com NVDA. |
| Mapas de calor / gravações | Microsoft Clarity (gratuito). Exige liberar o domínio no CSP do `vercel.json` e aviso de cookies; não gravar `/p/:token` (dados do cliente). |
| Funil / AARRR / HEART | Eventos sugeridos: `signup` → `onboarding_done` → `proposal_created` → `proposal_sent` → `proposal_viewed` → `proposal_accepted` (momento "uau") → `checkout_started` → `subscribed`. Métrica norte: propostas aceitas por conta ativa por mês. Boa parte já sai do banco (status das propostas), sem ferramenta nova. |
| Testes A/B | Só com tráfego suficiente (centenas de visitas por variação). Primeiro candidato: texto do CTA do topo. |

## 6. Como continuar

Use o prompt em [`docs/prompts/heuristicas-nielsen.md`](prompts/heuristicas-nielsen.md), uma área por vez (painel, editor, página pública, landing), para aprofundar e corrigir o que sobrar.
