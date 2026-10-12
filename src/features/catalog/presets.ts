// Modelos prontos para quem está começando. Viram modelos da empresa com um clique.
import type { ProposalContent } from '@/types';

export interface Preset {
  key: string;
  name: string;
  description: string;
  content: ProposalContent;
}

export const PRESETS: Preset[] = [
  {
    key: 'site',
    name: 'Site institucional',
    description: 'Para agências e freelancers de web.',
    content: {
      title: 'Site institucional',
      summary: 'Um site rápido, bonito e fácil de atualizar, pensado para apresentar sua empresa e transformar visitantes em contatos.',
      deliverables: ['Reunião de briefing e definição das páginas', 'Layout das páginas principais para aprovação', 'Desenvolvimento responsivo (celular e computador)', 'Formulário de contato e botão de WhatsApp', 'Publicação no domínio e treinamento rápido'],
      timeline: '4 a 6 semanas após o aceite',
      next_step: 'Agendamos a reunião de briefing em até 2 dias úteis e enviamos a lista de materiais.',
      exclusions: 'Textos e fotos são fornecidos pelo cliente. Hospedagem e domínio são contratados à parte.',
      terms: '50% no aceite e 50% na publicação, via Pix ou transferência.',
      items: [
        { name: 'Design e desenvolvimento (até 5 páginas)', description: null, unit: 'projeto', quantity: 1, unit_price: 4500, is_optional: false },
        { name: 'Blog com área de publicação', description: null, unit: 'un', quantity: 1, unit_price: 1200, is_optional: true },
        { name: 'Manutenção mensal', description: 'Atualizações, backups e pequenos ajustes.', unit: 'mês', quantity: 3, unit_price: 250, is_optional: true },
      ],
    },
  },
  {
    key: 'marca',
    name: 'Identidade visual',
    description: 'Para designers e estúdios.',
    content: {
      title: 'Identidade visual',
      summary: 'Uma marca clara e consistente para sua empresa ser reconhecida e lembrada em todos os pontos de contato.',
      deliverables: ['Imersão e pesquisa de referências', 'Duas propostas de conceito', 'Logo final com variações', 'Paleta de cores e tipografia', 'Manual de uso da marca'],
      timeline: '3 a 4 semanas',
      next_step: 'Enviamos o questionário de imersão logo após o aceite.',
      exclusions: 'Registro da marca no INPI não está incluído.',
      terms: '50% no aceite e 50% na entrega dos arquivos finais.',
      items: [
        { name: 'Criação da identidade visual', description: null, unit: 'projeto', quantity: 1, unit_price: 3800, is_optional: false },
        { name: 'Kit de papelaria (cartão, timbrado, assinatura de e-mail)', description: null, unit: 'pacote', quantity: 1, unit_price: 900, is_optional: true },
        { name: 'Templates para redes sociais', description: null, unit: 'pacote', quantity: 1, unit_price: 700, is_optional: true },
      ],
    },
  },
  {
    key: 'consultoria',
    name: 'Consultoria mensal',
    description: 'Para consultores e mentores.',
    content: {
      title: 'Consultoria mensal',
      summary: 'Acompanhamento próximo para organizar prioridades, destravar decisões e medir resultados mês a mês.',
      deliverables: ['Diagnóstico inicial', 'Encontros quinzenais de 1 hora', 'Plano de ação com metas', 'Suporte por WhatsApp em dias úteis', 'Relatório mensal de evolução'],
      timeline: 'Contrato de 3 meses, renovável',
      next_step: 'Marcamos o diagnóstico inicial na primeira semana.',
      exclusions: null,
      terms: 'Pagamento mensal até o dia 5, via Pix.',
      items: [
        { name: 'Consultoria mensal', description: null, unit: 'mês', quantity: 3, unit_price: 1800, is_optional: false },
        { name: 'Workshop presencial com a equipe', description: null, unit: 'un', quantity: 1, unit_price: 2400, is_optional: true },
      ],
    },
  },
  {
    key: 'servico',
    name: 'Serviço técnico',
    description: 'Para instalação, reforma e manutenção.',
    content: {
      title: 'Orçamento de serviço',
      summary: 'Execução do serviço com material de qualidade, equipe própria e garantia.',
      deliverables: ['Visita técnica e medição', 'Fornecimento do material', 'Execução do serviço', 'Limpeza do local', 'Garantia de 90 dias'],
      timeline: '5 dias úteis',
      next_step: 'Agendamos a data de início assim que a proposta for aceita.',
      exclusions: 'Serviços não descritos acima serão orçados à parte.',
      terms: '30% no aceite para compra do material e 70% na conclusão.',
      items: [
        { name: 'Mão de obra', description: null, unit: 'dia', quantity: 3, unit_price: 450, is_optional: false },
        { name: 'Material', description: null, unit: 'pacote', quantity: 1, unit_price: 1200, is_optional: false },
        { name: 'Extensão da garantia para 1 ano', description: null, unit: 'un', quantity: 1, unit_price: 300, is_optional: true },
      ],
    },
  },
];
