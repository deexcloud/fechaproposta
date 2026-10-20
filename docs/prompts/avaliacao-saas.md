# Prompt: avaliação de UX/UI e maturidade de SaaS

Diferença para os outros prompts: o [de Nielsen](heuristicas-nielsen.md) e o [planejado](auditoria-ux-planejada.md) caçam problemas de usabilidade tela a tela. Este dá uma **nota** para o site e a landing como estão hoje e compara o FechaProposta com o que se espera de um SaaS B2B pago (R$ 59–79/mês) já em produção: ativação, ciclo do teste, cobrança, confiança, suporte, LGPD. **Não altera nada.**

Cole o bloco abaixo numa sessão do Claude Code aberta na raiz do projeto.

---

```text
Você é designer de produto sênior, especialista em SaaS B2B de ticket baixo (PLG, teste grátis,
autoatendimento). Avalie o FechaProposta como está hoje: UX/UI do site e da landing page, e a
maturidade do produto em relação ao que um SaaS pago do nosso nível precisa ter.

REGRA PRINCIPAL: não altere nenhum arquivo do código. A única escrita permitida é o relatório
final em `docs/avaliacao-saas.md`.

## Contexto
- SaaS brasileiro (pt-BR) de propostas comerciais para agências, freelancers e prestadores de
  serviço. Quem vende usa o painel (/painel, tema escuro, degradê violeta); o cliente final abre
  /p/:token sem conta, quase sempre no celular (tema claro, marca de quem vende).
- Teste grátis de 7 dias sem cartão; depois R$ 79 mensal, R$ 69/mês semestral ou R$ 59/mês anual,
  por Pix ou cartão no Checkout do Asaas. Assinatura vencida = vê tudo, não cria nem envia.
- React 19 + MUI + TanStack Query + Supabase. Tokens em `src/theme/tokens.ts`.
- Leia antes `README.md` e `docs/auditoria-ux.md`. Quatro rodadas de auditoria já foram feitas:
  não repita o que está marcado como corrigido ou conferido. Itens "pendentes" podem ser citados
  só se você trouxer algo novo (prioridade, solução mais simples, impacto).

## Como trabalhar
1. Leia o código das telas (`src/features/*`, `src/layouts`, `src/components`, `index.html`,
   `vercel.json`) e as migrations/edge functions só no que afeta a experiência (e-mails,
   bloqueio por assinatura, cobrança).
2. Rode o preview "fechaproposta" e percorra como um visitante novo, em 375px e 1280px:
   landing → /exemplo → criar conta → cadastro inicial → primeira proposta → enviar →
   abrir /p/:token como cliente → aceitar → voltar ao painel → assinatura/cobrança.
   Cronometre e conte cliques até o "momento uau" (primeira proposta enviada).
3. Toda afirmação precisa de evidência: arquivo:linha, rota, ou o que você viu na tela.
   Se não deu para verificar (ex.: e-mail real, checkout do Asaas), diga "não verificado".

## Parte A — Landing page (nota 0–10 em cada)
1. Teste dos 5 segundos: o que é, para quem, por que agora. Título e subtítulo dizem resultado
   ou só recurso?
2. Posicionamento: diferença clara frente a mandar PDF/Word/Canva e frente a concorrentes
   (Proposeful, PandaDoc, Better Proposals, planilhas). Existe um "por que nós" defensável?
3. Hierarquia visual e ritmo: uma ideia por seção, tamanho de leitura, excesso de seções,
   repetições, densidade no celular.
4. CTA: texto, quantidade, posição, contraste, o que acontece depois do clique.
5. Prova e confiança sem números inventados: demo, exemplo real, comprovante de aceite, CNPJ,
   contato humano, política de reembolso/cancelamento, segurança dos dados.
6. Preço: clareza, ancoragem, o que acontece ao fim dos 7 dias, objeções ("e se eu cancelar?",
   "meu cliente precisa pagar algo?", "emite nota?").
7. Qualidade visual: tipografia, espaçamento, consistência de ícones e ilustrações, animações
   (ajudam ou distraem), cara de produto "premium" ou de template.
8. Técnico que afeta conversão: velocidade percebida no 4G, prévia no WhatsApp, SEO on-page,
   acessibilidade básica.

## Parte B — Produto (nota 0–10 em cada)
1. UI do painel: consistência, hierarquia, densidade, estados (vazio, carregando, erro, sem
   permissão, assinatura vencida), qualidade no celular.
2. Ativação: tempo e passos até a primeira proposta enviada; o que o produto faz para a pessoa
   não travar (modelos, dados de exemplo, checklist, dicas no contexto).
3. Página do cliente (/p/:token): é a vitrine do produto para quem ainda não é cliente. Ela
   passa confiança, é rápida, e faz marketing sutil do FechaProposta sem atrapalhar a marca
   de quem vende?
4. Ciclo do teste e conversão para pago: aviso de dias restantes, momentos de upgrade no
   lugar certo, o que a pessoa vê ao vencer, recuperação depois de vencido.
5. Cobrança em autoatendimento: trocar de plano, ver faturas/recibos, nota fiscal, atualizar
   cartão, cancelar sem falar com ninguém, pagamento recusado, reembolso.
6. Comunicação fora da tela: e-mails transacionais (boas-vindas, confirmação, cliente abriu,
   cliente aceitou, teste acabando, pagamento falhou), WhatsApp, notificações. Quais existem,
   quais faltam, quais são do Supabase com texto padrão em inglês.
7. Conta e segurança: recuperar senha, trocar e-mail, sessões, 2FA, convites, saída de membro.
8. LGPD e jurídico: termos, privacidade, aviso de cookies (só se houver rastreamento),
   exportar dados, excluir conta, quem é o controlador dos dados do cliente final.
9. Suporte e retenção: ajuda no contexto, central de ajuda/FAQ no painel, canal humano,
   novidades/changelog, pesquisa de cancelamento, NPS.
10. Métricas: o que já dá para medir do banco (funil de ativação, aceite, churn) e o que falta.

## Parte C — Checklist de SaaS do nosso nível
Monte uma tabela com cada item abaixo: Tem / Parcial / Falta · evidência · impacto (alto/médio/
baixo) · esforço (P/M/G). Acrescente o que achar necessário.
- Domínio próprio, e-mails saindo do domínio (SPF/DKIM), remetente com nome
- E-mails do Supabase traduzidos e com a marca
- Página de preço com perguntas de cobrança, plano anual em destaque
- Aviso de teste acabando (no app e por e-mail) e tela clara de assinatura vencida
- Faturas/recibos e cancelamento em autoatendimento
- Onboarding com dados de exemplo ou modelo pronto
- Página 404, página de manutenção/erro, recuperação de build antigo
- Termos, privacidade, exclusão de conta e exportação de dados
- Canal de suporte visível no painel
- Página de status ou forma de avisar instabilidade
- Changelog/novidades
- Indicação (cliente indica cliente) ou selo "feito com FechaProposta" na proposta
- Eventos de funil e métrica norte definidos
- Acessibilidade WCAG AA nas telas principais
- Core Web Vitals no celular dentro do "bom"

## Regras
- Nada de depoimentos, números, logos de clientes ou selos inventados.
- Não proponha mudança de preço ou de regra de negócio como certeza; marque como "decisão sua".
- Não sugira ferramenta paga quando existir saída simples no próprio stack.
- Seja direto: se algo está bom, diga em uma linha e siga. Gaste o texto no que falta.

## Entrega: `docs/avaliacao-saas.md`
1. Resumo em 5 linhas: nota geral (0–10), nota da landing, nota do produto, maior força,
   maior risco.
2. Tabelas das Partes A e B com nota, justificativa curta e evidência.
3. Checklist da Parte C.
4. Top 10 ações por impacto ÷ esforço, cada uma com: problema · mudança · arquivos · por que
   move conversão, ativação ou retenção.
5. O que depende de mim (conteúdo real, decisão de produto, conta em serviço externo).
Depois mostre o resumo no chat e pergunte quais ações do Top 10 eu quero implementar.
Não faça commit.
```
