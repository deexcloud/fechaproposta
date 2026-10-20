# Avaliação de UX/UI e maturidade de SaaS

Data: 19/10/2026. Prompt: [`docs/prompts/avaliacao-saas.md`](prompts/avaliacao-saas.md).
Base: leitura do código e navegação no preview local (landing e `/exemplo` em 375px e 1280px).
Fluxos logados (cadastro, editor, envio, cobrança) avaliados **só pelo código**: o cadastro grava no Supabase de verdade e não foi feito nesta rodada.

## Resumo

- **Nota geral: 6,5 / 10.** Landing **7,5**, produto **5,5**.
- **Maior força:** a experiência de quem vende e de quem recebe na tela. Landing com cara de produto premium, exemplo interativo que vende sozinho, página do cliente bem resolvida, e quatro rodadas de usabilidade já aplicadas.
- **Maior risco:** tudo o que acontece **fora da tela**. Não sai nenhum e-mail do produto: nem "cliente abriu", nem "cliente aceitou", nem "seu teste acaba amanhã", nem "sua assinatura venceu". Como não há renovação automática, quem esquece de pagar perde o acesso sem nenhum aviso fora do painel. É churn por esquecimento.
- **Segundo risco:** a parte legal ainda está em branco (`LEGAL_INFO` vazio: sem razão social, CNPJ nem e-mail), e não há como excluir a conta nem exportar os dados. Isso vai contra a LGPD e tira confiança de quem compra.

## Parte A — Landing page

| # | Critério | Nota | Justificativa | Evidência |
|---|---|---|---|---|
| A1 | Teste dos 5 segundos | 7 | Dá para entender o que é e como funciona. O título promete um **canal** ("aprova até pelo celular"), não um **resultado** (fechar mais, mais rápido, sem cobrar o cliente). "Para quem" fica numa linha pequena, abaixo da dobra no celular. | `LandingPage.tsx:249-276` |
| A2 | Posicionamento | 6 | Contra o PDF a mensagem é ótima ("Pare de mandar PDF e torcer", antes/depois). Contra os concorrentes não há nada: os diferenciais reais (Pix, WhatsApp, pt-BR, R$ 59 contra US$ 19–49 por usuário, cliente sem conta, opcionais) estão espalhados e nunca aparecem juntos como "por que nós". | `sections.tsx`, `LandingPage.tsx:283-332` |
| A3 | Hierarquia e ritmo | 8 | Uma ideia por seção, 8 seções, cerca de 8.900px no celular. Não há repetição grave. A faixa de confiança (4 itens) e os 4 itens ao lado do preço se sobrepõem em parte ("sem fidelidade" e "dados isolados" aparecem duas vezes). | `LandingPage.tsx:337-352` e `427-432` |
| A4 | CTA | 8 | Texto orientado à ação ("Criar minha primeira proposta"), sempre acompanhado da garantia, CTA fixo no celular, 7 CTAs no total sem cansar. O secundário "Ver exemplo" é o melhor recurso da página e está bem posicionado. | `LandingPage.tsx:255-258`, `MobileStickyCta` |
| A5 | Prova e confiança | 4 | Sem depoimentos (já conhecido). O que pesa mais: **não há CNPJ, razão social nem e-mail** em lugar nenhum (rodapé e termos vazios). Para um SaaS que pede Pix, isso é o primeiro sinal de "será golpe?". O WhatsApp de suporte é bom, mas é o único contato. | `legalInfo.ts:9-17`, rodapé `LandingPage.tsx:490-503` |
| A6 | Preço | 8 | Claro, com âncora riscada, economia em reais, garantias ao lado. Faltam duas objeções no FAQ: "emite nota fiscal?" e "o que acontece no fim dos 7 dias?" (resposta implícita: nada é cobrado, o acesso pausa). | `LandingPage.tsx:384-445`, `FAQ:40-48` |
| A7 | Qualidade visual | 8 | Tipografia, espaçamento e maquetes no nível de produto premium. Animações discretas e com "reduzir movimento". Ponto fraco: a logo diz **"fecha."** e o produto se chama **FechaProposta**, então a marca falada e a vista não batem. | `common.tsx:40-65`, captura em 1280px |
| A8 | Técnico | 7 | OG, canonical, robots e sitemap já resolvidos. O título da aba muda depois de carregar ("…viram sim" → "…no computador ou no celular") e o `og:title` é uma terceira versão. As fontes do Google bloqueiam a renderização, e a landing passa por uma tela "Carregando…" antes de aparecer (rota carregada sob demanda). Em produção deve ser rápido, mas o LCP real no 4G **não foi verificado**. | `index.html:10,16`, `LandingPage.tsx:200` |

**Média da landing: 7,0.** Arredondei para 7,5 no resumo porque o exemplo interativo (`/exemplo`) compensa boa parte do que falta em prova: é a mesma experiência do cliente real, com CTA "Criar a minha" no topo e depois do aceite.

## Parte B — Produto

| # | Critério | Nota | Justificativa | Evidência |
|---|---|---|---|---|
| B1 | UI do painel | 8 | Consistente, com estados completos (vazio, carregando, erro), Ctrl+K e navegação inferior no celular. A assinatura vencida é tratada no banco e com faixa no topo. | `common.tsx`, `AppLayout.tsx`, auditorias anteriores |
| B2 | Ativação | 7 | Há 4 modelos prontos, checklist e cadastro inicial em 2 passos. O checklist põe **"Cadastrar serviços no catálogo" antes de "Criar a primeira proposta"**, o que empurra uma tarefa chata para antes do momento uau. Tempo real até o primeiro envio **não verificado** (sem cadastro nesta rodada). | `DashboardPage.tsx:46-52` |
| B3 | Página do cliente | 7 | Para o cliente, nota 9: rápida, clara, com total sempre visível e aceite bem explicado. Como vitrine, nota 4: o selo "Proposta enviada com" existia só na coluna lateral, que **some no celular**, onde a maioria abre. **Corrigido em 20/10** (ver ação 4). | `PublicProposalPage.tsx`, `Decision.tsx:207-245` |
| B4 | Ciclo do teste | 6 | Card com a contagem de dias no menu e faixa nos últimos 3 dias. Tudo fica **dentro do app**: quem não entrar no 6º e no 7º dia não fica sabendo. Depois de vencer, não há recuperação (e-mail, cupom, "volte"). | `subscription.tsx:291-340` |
| B5 | Cobrança | 5 | Pix e cartão, histórico de pagamentos, "Adicionar meses". Faltam recibo ou nota para baixar e a nota fiscal (o FAQ não fala dela). Não renovar automaticamente evita cancelamentos, mas obriga a pessoa a lembrar de pagar todo período, e nada lembra por e-mail. | `subscription.tsx:396-465` |
| B6 | Comunicação fora da tela | 2 | Nenhum e-mail transacional do produto. Só os do Supabase Auth (confirmação, senha), e não há templates no repositório (`supabase/config.toml` tem 5 linhas): se não foram mudados no painel do Supabase, chegam **em inglês e com remetente genérico** (não verificado). Há também uma frase enganosa: depois do aceite o cliente lê "**{empresa} já recebeu o aviso**", mas nada é enviado; a empresa só vê quando abre o painel. | `Decision.tsx:241`, `supabase/config.toml` |
| B7 | Conta e segurança | 4 | Recuperar senha funciona. Não dá para **trocar a senha nem o e-mail** de dentro do painel (o menu do usuário tem só "Ajuda" e "Sair"). Sem 2FA, o que é aceitável neste ticket. | `AppLayout.tsx:143-170`, `pages.tsx:210,272` |
| B8 | LGPD e jurídico | 3 | Os termos e a privacidade existem, mas o controlador não está identificado (campos vazios) e o texto é um modelo ainda não revisado. Não há exclusão de conta nem exportação de dados. Cookies: sem rastreamento, então sem banner (correto). O papel de vocês com os dados do cliente final (operador; quem vende é o controlador) precisa estar escrito. | `legalInfo.ts`, `LegalPage.tsx` |
| B9 | Suporte e retenção | 5 | WhatsApp humano na landing, no pagamento e no menu do painel. Faltam ajuda no contexto, novidades, pesquisa ao vencer e NPS. | `support.ts`, `AppLayout.tsx:166` |
| B10 | Métricas | 4 | `/admin` mostra empresas, pagantes, em teste e quem vence em 3 dias. Não há funil de ativação (criou → enviou → recebeu aceite) nem churn, embora tudo isso já possa ser calculado com SQL no banco. | `PlatformAdminPage.tsx:76-104` |

**Média do produto: 5,1** (arredondada para 5,5 porque B1 e B3, o centro do produto, estão bons).

## Parte C — Checklist de SaaS do nosso nível

| Item | Situação | Evidência | Impacto | Esforço |
|---|---|---|---|---|
| Domínio próprio | Não verificado | Padrão `fechaproposta.vercel.app` (`.env.example`) | Alto | P |
| E-mails saindo do domínio (SPF/DKIM), remetente com nome | Falta | Sem SMTP configurado no repositório | Alto | P |
| E-mails do Supabase em pt-BR e com a marca | Falta / não verificado | Sem templates em `supabase/` | Alto | P |
| E-mails do produto (abriu, aceitou, teste acabando, venceu) | **Falta** | Nenhuma função de envio | **Alto** | M |
| Página de preço com perguntas de cobrança, anual em destaque | Tem | `LandingPage.tsx:384-445` | — | — |
| Aviso de teste acabando no app | Tem | `SubscriptionBanner`, `TrialCard` | — | — |
| Aviso de teste acabando por e-mail | Falta | — | Alto | M |
| Tela clara de assinatura vencida | Tem | Faixa e bloqueio no banco | — | — |
| Faturas/recibos para baixar | Parcial | Lista sem recibo | Médio | P |
| Nota fiscal | Falta | Não mencionada | Médio | M (decisão sua) |
| Cancelamento em autoatendimento | Não se aplica | Sem renovação automática | — | — |
| Onboarding com modelo pronto | Tem | 4 modelos (`presets.ts`) | — | — |
| Ordem do checklist leva ao momento uau | Parcial | Catálogo antes da proposta | Médio | P |
| Página 404, erro, recuperação de build antigo | Tem | `NotFoundPage`, `ErrorBoundary`, `staleBuild.ts` | — | — |
| Página de manutenção | Falta | — | Baixo | P |
| Termos e privacidade | Parcial | Texto modelo, `LEGAL_INFO` vazio | Alto | P |
| Exclusão de conta e exportação de dados | Falta | — | Alto (LGPD) | M |
| Trocar senha/e-mail no painel | Falta | Menu só com Ajuda/Sair | Médio | P |
| Canal de suporte visível no painel | Tem | "Ajuda pelo WhatsApp" | — | — |
| Página de status / aviso de instabilidade | Falta | — | Baixo | P |
| Changelog/novidades | Falta | — | Baixo | P |
| "Feito com FechaProposta" na proposta | Tem (desde 20/10) | `MadeWith` em `PublicProposalPage.tsx` | **Alto** | P |
| Indicação (cliente indica cliente) | Falta | — | Médio | M |
| Eventos de funil e métrica norte | Parcial | Definidos no relatório anterior, não medidos | Médio | P |
| Consistência de marca (logo × nome) | Parcial | "fecha." × "FechaProposta" | Médio | P (decisão sua) |
| WCAG AA nas telas principais | Parcial | Feito na rodada 4; axe/NVDA pendentes | Médio | M |
| Core Web Vitals no celular | Não verificado | LCP local 0,3 s; PageSpeed real pendente | Médio | P |

## Top 10 ações (impacto ÷ esforço)

| # | Problema | Mudança | Arquivos | Por que move o número |
|---|---|---|---|---|
| 1 | O cliente aceita e a empresa não fica sabendo fora do painel; a tela diz "já recebeu o aviso" | E-mail para quem vende quando o cliente **aceita**, **pede ajuste** ou **abre pela 1ª vez**. Edge Function chamada por trigger em `proposal_events` (Resend tem plano grátis; ou SMTP do domínio). Até isso existir, trocar a frase por algo que não prometa aviso. | nova `supabase/functions/notify`, migration com trigger, `Decision.tsx:241` | **Retenção e ativação.** É o "uau" do produto chegando sem a pessoa precisar abrir o app. |
| 2 | Teste e assinatura vencem em silêncio | E-mails "faltam 2 dias", "venceu hoje" e "sentimos sua falta" (D+3), via `pg_cron` + a mesma função | migration `pg_cron`, função de e-mail | **Conversão do teste e renovação**, sem renovação automática é o principal lembrete. |
| 3 | Nenhuma identificação legal | Preencher `LEGAL_INFO` e mostrar razão social, CNPJ e e-mail no rodapé da landing | `legalInfo.ts`, `LandingPage.tsx:490-503` | **Conversão**: tira o "será golpe?" antes do Pix. |
| 4 ✅ | Selo só aparecia no computador | **Feito em 20/10:** selo em todas as telas, link `/?ref=proposta` (nova aba) e, logo depois do aceite, "Também vende serviço? Crie propostas assim com FechaProposta" (`/?ref=aceite`). Fora do PDF. Esconder o selo fica como decisão sua. | `PublicProposalPage.tsx` | **Aquisição** com custo zero: quem recebe proposta também vende serviço. |
| 5 | E-mails do Supabase genéricos | Templates pt-BR com a marca (confirmação, senha, convite) e SMTP do domínio com nome "FechaProposta" | painel do Supabase ou `supabase/config.toml` + `supabase/templates/*.html` | **Ativação**: e-mail de confirmação em inglês ou no spam trava o cadastro. |
| 6 | Sem exclusão de conta nem exportação | "Excluir empresa" (só dono, com confirmação digitada) e "Baixar meus dados" (JSON/CSV de clientes e propostas) em Configurações | `SettingsPage.tsx`, nova RPC | **LGPD e confiança**; também reduz o medo de ficar preso ao produto. |
| 7 | O checklist pede catálogo antes da primeira proposta | Ordem: marca → **primeira proposta (a partir de um modelo)** → enviar → catálogo | `DashboardPage.tsx:46-52` | **Ativação**: chega antes ao primeiro envio. |
| 8 | Título promete canal, não resultado | Testar um título de resultado, por exemplo "Envie a proposta pelo WhatsApp e receba o sim no mesmo dia", mantendo "sem o cliente criar conta" no selo. Mesmo texto no `<title>` e no `og:title`. | `LandingPage.tsx:200,249-253`, `index.html:10,16` | **Conversão** e consistência de SEO. |
| 9 | Não há um "por que nós" contra os concorrentes | Bloco curto "Feito para o Brasil": Pix, WhatsApp, R$ e pt-BR, cliente sem conta, preço fixo sem cobrar por usuário. Sem citar marcas. FAQ com "emite nota fiscal?" e "o que acontece no fim do teste?". | `LandingPage.tsx`, `FAQ` | **Conversão** de quem já compara com PandaDoc e similares. |
| 10 | Não dá para trocar a senha nem o e-mail logado | Item "Minha conta" no menu do usuário com nome, e-mail e senha | `AppLayout.tsx:143-170`, nova página ou diálogo | Básico esperado; evita chamados no WhatsApp. |

Logo depois: recibo para baixar no histórico de pagamentos, funil de ativação no `/admin` (SQL sobre `proposals`/`proposal_events`), changelog simples.

## O que depende de você

- **Dados legais:** razão social, CNPJ, e-mail de contato e cidade do foro. Revisão dos termos por um advogado, incluindo o papel de operador com os dados do cliente final.
- **Domínio e e-mail:** domínio próprio, conta num serviço de envio (Resend, SES, ou o SMTP do provedor do domínio) e registros SPF/DKIM.
- **Nota fiscal:** se vai emitir (o Asaas emite NFS-e com configuração da prefeitura) e como dizer isso no FAQ.
- **Selo na proposta:** se fica sempre, se dá para esconder, ou se esconder é um benefício de plano.
- **Marca:** a logo continua "fecha." ou passa a escrever o nome inteiro.
- **Renovação:** manter "sem renovação automática" (bom argumento de venda, pior para retenção) ou oferecer recorrência opcional no cartão.
- **Depoimentos reais** dos primeiros clientes (continua sendo a maior alavanca da landing).
- **Medições externas:** PageSpeed no domínio publicado, e axe/NVDA nas telas logadas.
