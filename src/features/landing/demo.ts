import type { DocumentData } from '@/components/ProposalDocument';
import { addDays, todayISO } from '@/lib/format';

/** Proposta fictícia usada na página de vendas e em /exemplo. */
export function demoProposal(): DocumentData {
  return {
    code: 'FP-0042',
    title: 'Novo site para o Café Aurora',
    summary:
      'Um site que mostra o cardápio, conta a história da casa e leva o cliente direto para o WhatsApp de encomendas. Rápido no celular e fácil de atualizar pela equipe.',
    deliverables: [
      'Reunião de briefing e definição das páginas',
      'Layout da página inicial e do cardápio para aprovação',
      'Desenvolvimento responsivo (celular e computador)',
      'Botão de pedido pelo WhatsApp e mapa da loja',
      'Publicação e treinamento de 1 hora',
    ],
    timeline: '5 semanas',
    next_step: 'Agendamos o briefing em até 2 dias úteis e enviamos a lista de fotos e textos necessários.',
    exclusions: 'Fotos profissionais e textos de cardápio são fornecidos pelo café.',
    terms: '50% no aceite e 50% na publicação, via Pix.',
    valid_until: addDays(todayISO(), 10),
    discount: 300,
    items: [
      { id: 'd1', name: 'Design e desenvolvimento do site', description: 'Até 5 páginas: início, cardápio, sobre, eventos e contato.', unit: 'projeto', quantity: 1, unit_price: 4800, is_optional: false },
      { id: 'd2', name: 'Configuração de domínio e e-mail', description: null, unit: 'un', quantity: 1, unit_price: 350, is_optional: false },
      { id: 'd3', name: 'Cardápio atualizável pela equipe', description: 'Painel simples para mudar preços e itens sem depender de ninguém.', unit: 'un', quantity: 1, unit_price: 900, is_optional: true },
      { id: 'd4', name: 'Manutenção mensal', description: 'Backups, atualizações e pequenos ajustes.', unit: 'mês', quantity: 3, unit_price: 220, is_optional: true },
    ],
    client: { name: 'Marina Costa', company: 'Café Aurora' },
    organization: {
      name: 'Estúdio Lume',
      email: 'ola@estudiolume.com.br',
      whatsapp: '11988887777',
      website: 'estudiolume.com.br',
      document: null,
      city: 'São Paulo/SP',
      logo_path: null,
      brand_color: '#1F4E3D',
    },
  };
}
