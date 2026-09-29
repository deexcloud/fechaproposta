# FechaProposta

Plataforma para criar propostas comerciais, acompanhar as respostas e registrar o aceite do cliente. Usa React, Vite e Supabase.

## Rodar localmente

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e configure a URL e a publishable key do seu projeto Supabase. Para usar no Vercel, cadastre as mesmas variáveis em **Project → Settings → Environment Variables** e faça um novo deploy.

## Preparar o Supabase

Se ainda não aplicou o banco, abra o **SQL Editor** do Supabase e execute `supabase/schema.sql`. Ele cria autenticação por conta, espaços de trabalho, clientes, propostas e itens, com RLS para restringir os dados aos membros do espaço. Também prepara os pedidos de demonstração e os links públicos de proposta.

Se você já executou a versão inicial do schema, aplique apenas `supabase/migrations/20260929000000_platform_access.sql`. Essa migração acrescenta o formulário de demonstração, as operações de gravação das propostas e as funções protegidas para leitura e aceite por link público.

Ative e configure o provedor de e-mail em **Authentication** no Supabase. Defina a URL do site e inclua os domínios locais e do Vercel na lista de redirect URLs para que a confirmação de cadastro possa voltar à aplicação.

## Como funciona o acesso

- **Acessar plataforma** abre login e criação de conta pelo Supabase Auth.
- No primeiro acesso, a pessoa cria o nome do espaço de trabalho.
- Clientes, propostas, itens e aceites são gravados no Supabase; não há propostas de demonstração carregadas no app.
- **Agendar demonstração** registra o e-mail em `demo_requests` para retorno da equipe. O formulário solicita um horário; ele não reserva uma faixa de calendário automaticamente.
- Os links de proposta usam um token próprio. O banco só retorna propostas compartilhadas e registra o aceite por funções controladas.
- Convites e permissões de equipe ainda não estão disponíveis na interface. O cadastro começa com um espaço de trabalho da própria conta.

Os valores exibidos na seção de planos são informativos; a cobrança recorrente ainda não está integrada.

## Stack

- React 19 e Vite 6
- Supabase JS para autenticação e persistência
- Row Level Security (RLS) no Supabase
- Lucide React
