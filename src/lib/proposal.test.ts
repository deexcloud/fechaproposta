import { describe, expect, it } from 'vitest';
import type { Proposal } from '@/types';
import {
  attentionItems,
  canEdit,
  computeTotals,
  effectiveStatus,
  followUpMessage,
  pipelineStats,
  shareMessage,
  whatsappUrl,
} from './proposal';

const now = new Date('2026-10-12T15:00:00');
type P = Pick<Proposal, 'status' | 'valid_until' | 'total_amount' | 'accepted_total' | 'accepted_at' | 'sent_at' | 'last_viewed_at' | 'updated_at'>;
const base: P = {
  status: 'sent',
  valid_until: '2026-10-30',
  total_amount: 1000,
  accepted_total: null,
  accepted_at: null,
  sent_at: '2026-10-11T10:00:00',
  last_viewed_at: null,
  updated_at: '2026-10-11T10:00:00',
};

const p = (over: Partial<P>): P => ({ ...base, ...over });

describe('status', () => {
  it('enviada com validade vencida aparece como expirada', () => {
    expect(effectiveStatus(p({ valid_until: '2026-10-11' }), '2026-10-12')).toBe('expired');
    expect(effectiveStatus(p({ valid_until: '2026-10-12' }), '2026-10-12')).toBe('sent');
  });

  it('rascunho, aceita e recusada não expiram', () => {
    for (const status of ['draft', 'accepted', 'declined'] as const) {
      expect(effectiveStatus(p({ status, valid_until: '2020-01-01' }), '2026-10-12')).toBe(status);
    }
  });

  it('aceita e recusada ficam travadas para edição', () => {
    expect(canEdit({ status: 'negotiating' })).toBe(true);
    expect(canEdit({ status: 'accepted' })).toBe(false);
    expect(canEdit({ status: 'declined' })).toBe(false);
  });
});

describe('totais', () => {
  const items = [
    { quantity: 1, unit_price: 2000, is_optional: false },
    { quantity: 3, unit_price: 300, is_optional: false },
    { quantity: 1, unit_price: 800, is_optional: true },
  ];

  it('separa fixos e opcionais e aplica o desconto só nos fixos', () => {
    expect(computeTotals(items, 100)).toEqual({ subtotal: 2900, discount: 100, total: 2800, optional: 800, withSelected: 2800 });
  });

  it('soma os opcionais escolhidos pelo cliente', () => {
    expect(computeTotals(items, 100, [2]).withSelected).toBe(3600);
  });

  it('desconto nunca passa do subtotal nem fica negativo', () => {
    expect(computeTotals(items, 99999).total).toBe(0);
    expect(computeTotals(items, -50).total).toBe(2900);
  });

  it('arredonda centavos como o banco', () => {
    expect(computeTotals([{ quantity: 3, unit_price: 33.335, is_optional: false }]).total).toBe(100.01);
  });
});

describe('o que pede atenção', () => {
  it('pedido de ajuste vem primeiro', () => {
    const list = attentionItems([p({ status: 'viewed', last_viewed_at: '2026-10-08T10:00:00' }), p({ status: 'negotiating' })], now);
    expect(list[0].reason).toBe('change_requested');
    expect(list.map((i) => i.reason)).toContain('viewed_no_reply');
  });

  it('avisa quem abriu há 2 dias e não respondeu, não quem abriu hoje', () => {
    expect(attentionItems([p({ status: 'viewed', last_viewed_at: '2026-10-12T09:00:00' })], now)).toHaveLength(0);
    expect(attentionItems([p({ status: 'viewed', last_viewed_at: '2026-10-10T09:00:00' })], now)[0].title).toBe('Vista há 2 dias, sem resposta');
  });

  it('avisa envio não aberto e rascunho parado', () => {
    expect(attentionItems([p({ sent_at: '2026-10-09T10:00:00' })], now)[0].reason).toBe('not_opened');
    expect(attentionItems([p({ status: 'draft', updated_at: '2026-10-05T10:00:00' })], now)[0].reason).toBe('stale_draft');
  });

  it('vencimento próximo, mas não depois de vencida', () => {
    expect(attentionItems([p({ valid_until: '2026-10-13' })], now)[0].title).toBe('Vence amanhã');
    expect(attentionItems([p({ valid_until: '2026-10-12' })], now)[0].title).toBe('Vence hoje');
    expect(attentionItems([p({ valid_until: '2026-10-11' })], now)).toHaveLength(0);
  });
});

describe('funil', () => {
  it('calcula aberto, aceito no mês, taxa de aceite e prazo médio', () => {
    const stats = pipelineStats(
      [
        p({}),
        p({ status: 'negotiating', total_amount: 500 }),
        p({ status: 'accepted', total_amount: 900, accepted_total: 1200, accepted_at: '2026-10-05T10:00:00', sent_at: '2026-10-01T10:00:00' }),
        p({ status: 'accepted', total_amount: 300, accepted_total: 300, accepted_at: '2026-09-20T10:00:00', sent_at: '2026-09-18T10:00:00' }),
        p({ status: 'declined' }),
        p({ valid_until: '2026-10-01' }),
        p({ status: 'draft', total_amount: 7000 }),
      ],
      now,
    );
    expect(stats.openCount).toBe(2);
    expect(stats.openValue).toBe(1500);
    expect(stats.acceptedMonthCount).toBe(1);
    expect(stats.acceptedMonthValue).toBe(1200);
    expect(stats.acceptanceRate).toBe(50);
    expect(stats.averageTicket).toBe(750);
    expect(stats.averageDaysToClose).toBe(3);
    expect(stats.byStatus.draft.value).toBe(7000);
  });

  it('sem respostas, a taxa fica vazia em vez de 0%', () => {
    expect(pipelineStats([p({})], now).acceptanceRate).toBeNull();
  });
});

describe('mensagens', () => {
  const input = { clientName: 'Maria Souza', title: 'Site novo', link: 'https://x.com/p/abc', validUntil: '2026-10-30', senderName: 'Estúdio Lume' };

  it('mensagem de envio chama pelo primeiro nome e traz link e validade', () => {
    const text = shareMessage(input);
    expect(text).toContain('Olá, Maria!');
    expect(text).toContain('https://x.com/p/abc');
    expect(text).toContain('30 de outubro de 2026');
  });

  it('lembrete não insiste, oferece ajuste', () => {
    expect(followUpMessage(input)).toContain('ajustar');
  });

  it('link do WhatsApp com DDI e texto codificado', () => {
    expect(whatsappUrl('oi & tchau', '(11) 98888-7777')).toBe('https://wa.me/5511988887777?text=oi%20%26%20tchau');
    expect(whatsappUrl('oi')).toBe('https://wa.me/?text=oi');
  });
});
