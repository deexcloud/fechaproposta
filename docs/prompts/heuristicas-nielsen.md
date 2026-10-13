# Prompt: auditar e corrigir as 10 heurísticas de Nielsen

Cole o bloco abaixo numa sessão do Claude Code aberta na raiz do projeto. Troque `<ESCOPO>` pela área a revisar (ex.: `src/features/proposals`, "a página pública da proposta", "o sistema inteiro").

---

```text
Você é um designer de produto sênior e engenheiro front-end. Faça uma auditoria de usabilidade
do FechaProposta pelas 10 heurísticas de Nielsen e CORRIJA o que encontrar.

Escopo: <ESCOPO>

## Contexto do produto
- SaaS brasileiro (pt-BR) para agências, freelancers e prestadores de serviço montarem propostas,
  enviarem por link/WhatsApp e receberem o aceite com assinatura.
- Dois públicos: (1) quem vende, no painel (/painel, tema escuro); (2) o cliente final, que abre
  /p/:token sem conta, muitas vezes no celular (tema claro, com a marca de quem vende).
- Stack: React 19 + MUI + react-hook-form/zod + TanStack Query + Supabase.
- Cores e sombras vêm SÓ de `src/theme/tokens.ts` (`tokens`, `shadows`, `gradients`). Nada de hex
  solto em componente. Documento da proposta fica dentro de `LightScope`.
- Componentes prontos em `src/components/common.tsx` (PageHeader, EmptyState, ErrorState,
  ListSkeleton, SectionCard), `ConfirmDialog`, `NotifyProvider` (toasts), `StatusChip`.

## Como trabalhar
1. Leia o código do escopo inteiro antes de opinar. Rode o app (preview "fechaproposta") e
   percorra os fluxos de verdade, no computador (1280px) e no celular (375px).
2. Para cada heurística, procure problemas concretos, com arquivo:linha. Use a lista de
   verificação abaixo como mínimo, não como limite.
3. Classifique cada problema pela escala de severidade de Nielsen:
   0 não é problema · 1 cosmético · 2 menor · 3 maior · 4 catástrofe (impede a tarefa).
4. Corrija tudo que for severidade ≥ 2 e as de severidade 1 que forem triviais. Siga o estilo
   do código ao redor (comentários curtos em pt-BR, mesmo idioma de nomes, tokens do tema).
5. Não invente funcionalidade nova grande sem perguntar. Não invente números, depoimentos
   ou selos. Não mude regra de negócio, preço ou texto legal.
6. Ao final rode `npm run typecheck` e `npm test`, e confira no navegador as telas alteradas.

## Lista de verificação por heurística

H1 · Visibilidade do status do sistema
- Toda ação assíncrona mostra carregamento (botão com `loading`, skeleton) e resultado (toast).
- Listas e painéis têm estados de carregando / vazio / erro / com dados.
- Status da proposta (rascunho, enviada, aberta, em negociação, aceita, recusada, vencida) é
  visível onde importa, com texto e não só cor.
- Salvamento do editor: o usuário sabe se está salvo, salvando ou com alteração pendente.

H2 · Correspondência com o mundo real
- Linguagem do vendedor brasileiro, sem jargão técnico ("token", "status", "null", "erro 500").
- Datas, moeda e telefone no formato brasileiro (`src/lib/format.ts`).
- Ícones que significam o que parecem (ex.: ícone de calendário não representa valor).

H3 · Controle e liberdade do usuário
- Toda ação destrutiva tem confirmação (`ConfirmDialog`) ou desfazer.
- Diálogos fecham com Esc e têm "Cancelar". Sair do editor com alteração pendente avisa.
- Sempre existe caminho de volta (botão Voltar, breadcrumb, logo leva ao início).

H4 · Consistência e padrões
- Mesmo verbo para a mesma ação em todo lugar ("Nova proposta", não "Criar"/"Adicionar"/"Nova").
- Botão principal único por tela (contained); secundários outlined/text.
- Espaçamentos, raios e tipografia do tema; nada de estilo ad hoc divergente.

H5 · Prevenção de erros
- Validação zod com mensagem antes do envio; campos obrigatórios marcados.
- Máscara/normalização em telefone, CPF/CNPJ, valores. Limites (mín./máx.) em números.
- Botões desabilitados quando a ação não é possível, com motivo explicado.
- Envio duplo impedido (loading/disabled durante a requisição).

H6 · Reconhecer em vez de lembrar
- Busca e filtros mantêm o estado na URL; voltar não perde o contexto.
- Autocomplete de clientes e itens do catálogo; modelos para não começar do zero.
- Informação necessária para decidir está na tela (ex.: total, validade, o que foi escolhido).

H7 · Flexibilidade e eficiência
- Atalhos (Ctrl+K da paleta de comandos), ações rápidas na lista, duplicar proposta.
- Fluxo do iniciante (checklist de primeiros passos) não atrapalha o experiente.

H8 · Estética e design minimalista
- Cada tela tem uma hierarquia clara: título, ação principal, conteúdo.
- Texto enxuto; nada competindo com o botão principal. Cor de destaque só para ação/seleção.
- Contraste AA (4,5:1 texto normal, 3:1 texto grande/ícones) no tema escuro e no claro.

H9 · Ajudar a reconhecer, diagnosticar e se recuperar de erros
- Mensagens dizem o que houve e o que fazer, em linguagem simples (`friendlyError`).
- Erros de rede oferecem "Tentar de novo". Erro de campo fica junto do campo.
- Página 404 e ErrorBoundary levam a um lugar útil conforme a pessoa esteja logada ou não.

H10 · Ajuda e documentação
- Dicas curtas no ponto de uso (helperText, tooltip, texto de estado vazio).
- Acesso ao suporte (WhatsApp) no painel e na landing; FAQ responde objeções reais.

## Também verificar (acessibilidade e celular)
- Tudo funciona só com teclado; foco visível; ordem de tabulação lógica.
- `aria-label` em botões de ícone; rótulos humanos (não "Cor #A24B2A").
- Alvos de toque ≥ 44px no celular; nada escondido só em `:hover`; sem rolagem horizontal.
- `prefers-reduced-motion` respeitado.

## Formato da entrega
1. Tabela: Heurística · Problema · Onde (arquivo:linha) · Severidade (0–4) · Correção feita
   (ou "pendente" com o motivo).
2. Resumo das mudanças por arquivo.
3. O que ficou pendente e precisa de decisão de produto, em uma linha cada.
```

---

## Dica de uso

- Para auditorias grandes, peça uma área por vez (painel, editor, página pública, landing). O resultado fica mais concreto.
- Depois de corrigir, rode de novo o mesmo prompt com o escopo "só o que mudou no último commit" para conferir se nada regrediu.
