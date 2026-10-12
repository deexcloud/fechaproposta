# FechaProposta

Propostas comerciais que viram "sim". A empresa monta a proposta com a própria marca, envia por link ou WhatsApp e acompanha cada passo; o cliente abre no celular, escolhe os opcionais e aceita com assinatura, sem criar conta.

Segue o padrão de stack "SaaS multiempresa com Supabase e Asaas", com o AdegaFácil como projeto de referência.

## O que tem

**Para quem vende (painel)**
- Início com **o que pede atenção**: cliente que abriu e não respondeu, pedido de ajuste, validade acabando, rascunho parado. Lembrete pronto para o WhatsApp.
- Funil por etapa, fechado no mês, taxa de aceite, ticket médio e prazo médio de fechamento.
- Editor com **prévia ao vivo**, cliente cadastrado na hora, itens do catálogo, **itens opcionais**, desconto, validade com atalhos e Ctrl+S.
- Linha do tempo por proposta (criada, enviada, aberta, ajuste pedido, aceita) e contagem de aberturas.
- Catálogo de serviços, modelos (com 4 modelos prontos para começar), clientes com histórico e valor fechado.
- Duplicar, salvar como modelo, registrar aceite combinado por fora, marcar recusada, PDF pelo navegador.
- Marca da empresa (logo e cor) em todas as propostas. Equipe por convite (dono, gerente, vendedor).
- Busca rápida com Ctrl+K. Navegação inferior com botão "Nova" no celular.

**Para quem recebe (link `/p/:token`)**
- Página mobile-first com a marca de quem enviou e o total sempre à vista.
- Opcionais que o cliente marca, com o total recalculado na hora.
- **Pedir ajuste** (a proposta vai para "Em negociação"), aceitar com assinatura desenhada ou digitada, ou recusar com motivo.
- Aceite guardado com nome, assinatura, data, IP, navegador e uma **cópia congelada** do conteúdo com código de verificação (SHA-256). Proposta aceita não pode mais ser alterada nem apagada.

**Plataforma**
- Teste grátis de 7 dias, depois R$ 59/mês (plano único) por Pix ou cartão no Checkout do Asaas.
- Bloqueio no banco: com a assinatura vencida, a empresa vê tudo mas não cria, edita nem envia propostas. Os links já enviados continuam funcionando.
- `/admin` para liberar meses, estender teste ou encerrar acesso.

## Stack

| Camada | Ferramenta |
| --- | --- |
| Interface | React + Vite + TypeScript, MUI com tokens próprios (`src/theme`) |
| Dados na tela | TanStack Query |
| Formulários | react-hook-form + zod |
| Rotas | react-router (`/`, `/exemplo`, `/p/:token`, `/painel/*`, `/admin`) |
| Banco, login, arquivos | Supabase (Postgres, Auth, Storage), RLS por empresa |
| Regras de negócio | Funções SQL (RPC) `security definer`, erros P0001 |
| Código com segredo | Edge Functions `billing-checkout` e `billing-webhook` |
| Cobrança | Asaas (Checkout + webhook) |
| Testes | Vitest + PGlite |

## Pastas

| Pasta | O que guarda |
| --- | --- |
| `src/features/*` | Telas por área (dashboard, proposals, public, clients, catalog, settings…) |
| `src/services/*` | Chamadas ao Supabase, uma por domínio |
| `src/lib/*` | Regras puras com `*.test.ts` ao lado (status, totais, funil, formatação) |
| `src/theme` | Tokens do design system |
| `supabase/migrations` | Uma migration por etapa, nome com data |
| `supabase/functions` | Edge Functions + `_shared/billing.ts` testado pelo Vitest |
| `supabase/tests` | Testes SQL (isolamento entre empresas, fluxo da proposta, assinatura, cobrança, equipe) |

## Scripts

```bash
npm run dev              # desenvolvimento
npm test                 # testes TS (Vitest)
npm run test:db          # migrations + testes SQL num Postgres em memória (PGlite)
npm run build            # checagem de tipos + build
npm run db:bundle        # gera supabase/setup_completo.sql para colar no SQL Editor
npm run functions:painel # gera um arquivo único por Edge Function para publicar pelo painel
```

`npm test`, `npm run test:db` e `npm run build` passando antes de cada commit.

## Configurar do zero

### 1. Supabase (projeto novo)

1. Crie um projeto novo no Supabase.
2. **SQL Editor**: cole `supabase/setup_completo.sql` inteiro e rode uma vez.
3. **Authentication → URL Configuration**: Site URL com o endereço da Vercel; inclua `http://localhost:5173/**` e o domínio da Vercel em Redirect URLs.
4. Para virar administrador da plataforma, rode no SQL Editor:
   ```sql
   insert into public.platform_admins (user_id)
   select id from auth.users where email = 'seu-email@exemplo.com';
   ```

Banco existente: rode só as migrations que faltam, em ordem. Migration aplicada nunca é editada; mudança nova é arquivo novo (depois, `npm run db:bundle`).

### 2. Frontend

Copie `.env.example` para `.env.local` com a URL e a chave pública (anon) do projeto novo. Na Vercel, cadastre as mesmas variáveis. O `.env` só tem chaves públicas; segredos ficam em Edge Functions → Secrets.

### 3. Asaas (cobrança)

Ordem: conta do Asaas aprovada com chave Pix, depois segredos, depois funções com o nome exato e o webhook sem JWT.

1. Conta aprovada e chave Pix em Pix → Minhas chaves.
2. Integrações → Chaves de API → gerar chave **sem permissão de saque**, uma só para este projeto.
3. Token do webhook gerado no terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Integrações → Webhooks: URL `https://<projeto>.supabase.co/functions/v1/billing-webhook`, o token, API v3, fila ativada, envio sequencial, eventos `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`.

Segredos em **Supabase → Edge Functions → Secrets**:

| Segredo | Valor |
| --- | --- |
| `ASAAS_API_KEY` | Chave do Asaas (`$aact_prod_...`; `$aact_hmlg_...` usa o sandbox) |
| `ASAAS_WEBHOOK_TOKEN` | O token do passo 3 |
| `APP_URL` | Endereço do site, sem barra no final |
| `ASAAS_ENV` | Opcional: `sandbox` ou `production` |

Publicar as funções:

```bash
npx supabase functions deploy billing-checkout
```

```bash
npx supabase functions deploy billing-webhook --no-verify-jwt
```

Ou pelo painel: `npm run functions:painel` → Deploy a new function → Via Editor, digitando o nome exato antes do deploy. Em `billing-webhook` → Details, deixe **Verify JWT desligado**.

O checkout volta para `/painel?assinatura=retorno` (ou `=falhou`) e o painel confere sozinho até o webhook liberar. Só o webhook libera a empresa, depois de reler a cobrança na API do Asaas.

Teste real barato: preço temporário de R$ 5 em `billing_monthly_price()`, pagar com Pix, conferir a liberação e voltar o preço. Ao mudar o preço, atualize também `PRICE_MONTHLY` em `src/lib/pricing.ts`.

### Problemas conhecidos

| Sintoma | Solução |
| --- | --- |
| `relation ... does not exist` ao rodar uma migration | Rodar as migrations anteriores, em ordem |
| Webhook responde `Missing authorization header` | Desligar Verify JWT em billing-webhook → Details |
| URL da função termina em `swift-endpoint` | Apagar e recriar digitando o nome antes do deploy |
| Log: "A criação do checkout está desabilitada" | Conta do Asaas ainda não aprovada |
| Log: "Para gerar cobranças com Pix é necessário criar uma chave Pix" | Cadastrar a chave Pix no Asaas |

## Antes de vender

- Preencha `src/features/legal/legalInfo.ts` (razão social, CNPJ, e-mail e cidade) e revise os textos de termos e privacidade com um advogado.
- O aceite pelo link é um registro eletrônico de concordância, não uma assinatura com certificado ICP-Brasil.
