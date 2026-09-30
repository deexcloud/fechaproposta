# FechaProposta

Plataforma para criar propostas comerciais, acompanhar as respostas e registrar o aceite do cliente. Usa React, Vite e Supabase.

## Rodar localmente

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e configure a URL e a publishable key do seu projeto Supabase. Para usar no Vercel, cadastre as mesmas variáveis em **Project → Settings → Environment Variables** e faça um novo deploy.

## Preparar o Supabase

Se ainda não aplicou o banco, abra o **SQL Editor** do Supabase e execute `supabase/schema.sql`. Ele cria autenticação por conta, espaços de trabalho, clientes, propostas e itens, com RLS para restringir os dados aos membros do espaço, além do trial e dos links públicos de proposta.

Se você já executou a versão inicial do schema, aplique, nesta ordem, `supabase/migrations/20260929000000_platform_access.sql`, `supabase/migrations/20260929010000_workspace_creation_rpc.sql` e `supabase/migrations/20260929020000_three_day_trial.sql`. A última migration inicia um trial de três dias no primeiro espaço de cada conta e bloqueia clientes e propostas no banco quando ele termina. Para espaços já existentes, os três dias começam quando essa migration é aplicada. Publique o frontend logo depois de aplicar as migrations.

Ative e configure o provedor de e-mail em **Authentication** no Supabase. Defina a URL do site e inclua os domínios locais e do Vercel na lista de redirect URLs para que a confirmação de cadastro possa voltar à aplicação.

## Como funciona o acesso

- **Acessar plataforma** abre login e criação de conta pelo Supabase Auth.
- No primeiro acesso, a pessoa cria o nome do espaço de trabalho.
- Clientes, propostas, itens e aceites são gravados no Supabase; não há propostas de demonstração carregadas no app.
- **Testar grátis por 3 dias** abre um passeio guiado em etapas e, ao final, leva à criação de conta. O período começa ao criar o primeiro espaço de trabalho.
- Os links de proposta usam um token próprio. O banco só retorna propostas compartilhadas e registra o aceite por funções controladas.
- Convites e permissões de equipe ainda não estão disponíveis na interface. O cadastro começa com um espaço de trabalho da própria conta.

Os valores exibidos na seção de planos são informativos; a cobrança recorrente ainda não está integrada. O trial gratuito de três dias é controlado pelo banco e começa quando a pessoa cria o primeiro espaço de trabalho.

## Stack

- React 19 e Vite 6
- Supabase JS para autenticação e persistência
- Row Level Security (RLS) no Supabase
- Lucide React
