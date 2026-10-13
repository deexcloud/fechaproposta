# Prompt: auditoria de UX + landing, com plano aprovado antes de mudar

Diferença para o [prompt de Nielsen](heuristicas-nielsen.md): este **não altera nada** até você aprovar a lista de mudanças.

Cole o bloco abaixo numa sessão do Claude Code aberta na raiz do projeto.

---

```text
Você é designer de produto sênior e engenheiro front-end. Audite o FechaProposta inteiro
(landing, acesso, painel, editor, página pública da proposta) pelas 10 heurísticas de Nielsen,
por boas práticas de UI/UX e pela capacidade de conversão da landing page.

REGRA PRINCIPAL: não altere nenhum arquivo nesta etapa. Primeiro leia, navegue e liste.
Só implemente depois que eu aprovar, e só os itens aprovados.

## Contexto
- SaaS brasileiro (pt-BR) de propostas comerciais: quem vende monta no painel (tema escuro,
  degradê violeta) e o cliente final abre /p/:token sem conta (tema claro, marca de quem vende).
- React 19 + MUI + react-hook-form/zod + TanStack Query + Supabase.
- Cores só via `src/theme/tokens.ts`; documento do cliente dentro de `LightScope`.
- Já existe relatório anterior em `docs/auditoria-ux.md`: não repita o que já foi resolvido.

## Etapa 1 — Levantamento (sem mudar nada)
1. Leia todo o código das telas. Rode o preview "fechaproposta" e percorra os fluxos em
   1280px e 375px quando possível.
2. Para cada problema anote: heurística (H1–H10) ou "Conversão", onde (arquivo:linha),
   o que acontece hoje, por que atrapalha e a mudança proposta.
3. Severidade de Nielsen: 1 cosmético · 2 menor · 3 maior · 4 catástrofe.
4. Na landing, avalie: clareza da promessa em 5 segundos, prova social, objeções respondidas,
   fricção até o cadastro, CTAs (quantidade, texto, posição), desempenho percebido no celular.
5. Não proponha números, depoimentos ou selos inventados, nem mudança de preço, regra de
   negócio ou texto legal. Não proponha ferramentas de rastreamento.

## Etapa 2 — Plano para aprovação
Entregue uma lista numerada, agrupada por área (Landing, Painel, Editor, Página do cliente,
Acesso), cada item com: severidade · problema · mudança proposta · arquivos.
Separe no fim o que depende de decisão minha ou de conteúdo real.
Pare e pergunte quais itens aprovo.

## Etapa 3 — Implementação (só após aprovação)
- Siga o estilo do código ao redor (comentários curtos em pt-BR, tokens do tema).
- Rode `npm run typecheck`, `npm test` e confira no navegador as telas alteradas.
- Atualize `docs/auditoria-ux.md` com o que foi feito.
- Não faça commit sem eu pedir.
```
