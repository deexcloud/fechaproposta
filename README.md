# FechaProposta

Aplicação para criar propostas comerciais, acompanhar cada etapa e registrar o aceite do cliente. A experiência segue a stack visual e técnica do Prumo: React, Vite, Tailwind CSS, Supabase e ícones Lucide.

## Iniciar

```bash
npm install
npm run dev
```

O modo de demonstração abre sem configurar serviços externos. Propostas e aceites ficam no armazenamento local do navegador.

A primeira tela é a apresentação comercial da plataforma, com recursos, etapas, planos e preços mensais. Escolher um plano abre uma explicação antes de entrar na demonstração; não há cobrança ativa nesta base.

## O que já dá para fazer

- Acompanhar valores em aberto, aceites e propostas recentes no painel.
- Conhecer os planos Starter (R$ 29/mês), Pro (R$ 59/mês) e Business (R$ 99/mês) na tela inicial.
- Criar propostas com objetivo, entregas, prazo, próximo passo, itens, valores, exclusões e condições.
- Revisar rascunhos e propostas prontas para envio antes de compartilhar.
- Buscar e filtrar por cliente, título, código ou status.
- Abrir a visão do cliente, compartilhar um link de demonstração e preparar um e-mail no aplicativo padrão.
- Imprimir ou salvar uma proposta como PDF pelo diálogo do navegador.
- Dar ao cliente uma visão completa do escopo, prazo, investimento, condições e próximo passo antes do aceite.
- Registrar um aceite demonstrativo com nome, assinatura desenhada ou digitada e confirmação explícita.
- Consultar clientes, modelos iniciais e um resumo de resultados.

## Heurísticas de Nielsen na experiência

1. **Visibilidade do estado:** status claros por proposta, indicadores da carteira e confirmação ao salvar ou registrar uma ação.
2. **Correspondência com o mundo real:** datas, valores em reais, linguagem direta e termos comerciais familiares.
3. **Controle e liberdade:** fechar janelas, voltar ao painel, limpar busca e corrigir uma assinatura antes de confirmar.
4. **Consistência e padrões:** navegação, botões, campos, estados e ações usam os mesmos padrões nas telas.
5. **Prevenção de erros:** campos obrigatórios, formato de e-mail, validade, quantidades e valores são validados antes de criar.
6. **Reconhecimento em vez de memorização:** resumo da proposta, cliente, valor, validade e status aparecem junto das ações.
7. **Flexibilidade e eficiência:** busca, filtros de status e navegação direta entre propostas, clientes e resultados.
8. **Design minimalista:** a página inicial apresenta o produto e os planos; a proposta prioriza escopo, valores e a decisão do cliente.
9. **Ajuda para reconhecer e recuperar erros:** mensagens de estado, instruções junto aos campos, opção de assinatura digitada e orientação em estados vazios.
10. **Ajuda e documentação:** dicas contextuais e este guia acompanham o fluxo de criação.

## Limites da demonstração e próximos passos

Esta base ainda não cria contas, cobra uma assinatura, envia mensagens por um servidor, persiste dados em uma conta Supabase nem produz uma assinatura certificada. A escolha de plano leva à demonstração sem cobrança. O botão de e-mail abre uma mensagem para revisão no cliente de e-mail; o PDF usa a impressão do navegador; o aceite ilustrativo é guardado localmente.

Para uso real com clientes, os próximos blocos são autenticação e empresas no Supabase com políticas RLS, armazenamento seguro de documentos, envio por provedor de e-mail, assinatura eletrônica com trilha de auditoria, acesso público com token e proteção contra reuso, histórico de versões e notificações de abertura/expiração. As variáveis públicas do Supabase estão documentadas em `.env.example`; a conexão e as regras de acesso precisam ser configuradas antes de armazenar propostas comerciais reais.

## Stack

- React 19 e Vite 6
- Tailwind CSS 3 e estilos responsivos próprios
- Supabase JS (cliente preparado para configuração)
- Lucide React

## Preparar os CTAs para produção

Configure estas variáveis em `.env.local` durante o desenvolvimento e nas variáveis de ambiente do projeto na Vercel:

- `VITE_PLATFORM_URL`: URL real de login da plataforma. Deixe vazia enquanto a autenticação não estiver implementada; a home mostrará a demonstração local.
- `VITE_DEMO_BOOKING_URL`: link real do calendário de demonstração. Deixe vazio para oferecer a demonstração interativa no próprio site.

Esta aplicação ainda é uma demonstração: propostas e aceites ficam no navegador, e o cliente Supabase ainda não é usado para autenticação ou persistência. Antes de receber dados reais, implemente login, tabelas e políticas RLS; conecte o envio de e-mail e o provedor de assinatura. Os CTAs devem apontar apenas para destinos que já estejam ativos.
