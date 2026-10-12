// Regras puras das propostas: status, totais, funil e o que pede atenção.
// Os totais e a troca de status valem de verdade no banco; aqui é para a tela.
import type { EffectiveStatus, Proposal, ProposalItem, ProposalStatus } from '@/types';
import { daysUntil, firstName, longDate, money, todayISO } from './format';

export type Tone = 'neutral' | 'info' | 'warning' | 'violet' | 'success' | 'error' | 'muted';

export const STATUS_META: Record<EffectiveStatus, { label: string; tone: Tone; hint: string }> = {
  draft: { label: 'Rascunho', tone: 'neutral', hint: 'Só a sua equipe vê.' },
  sent: { label: 'Enviada', tone: 'info', hint: 'O cliente ainda não abriu o link.' },
  viewed: { label: 'Visualizada', tone: 'warning', hint: 'O cliente abriu e ainda não respondeu.' },
  negotiating: { label: 'Em negociação', tone: 'violet', hint: 'O cliente pediu um ajuste.' },
  accepted: { label: 'Aceita', tone: 'success', hint: 'Aceite registrado.' },
  declined: { label: 'Recusada', tone: 'error', hint: 'O cliente recusou.' },
  expired: { label: 'Expirada', tone: 'muted', hint: 'A validade passou sem resposta.' },
};

const OPEN: ProposalStatus[] = ['sent', 'viewed', 'negotiating'];

/** Mesma regra de proposal_effective_status() no banco. */
export function effectiveStatus(p: Pick<Proposal, 'status' | 'valid_until'>, today = todayISO()): EffectiveStatus {
  return OPEN.includes(p.status) && p.valid_until < today ? 'expired' : p.status;
}

/** Aguardando resposta do cliente (enviada e dentro da validade). */
export function isAwaitingClient(p: Pick<Proposal, 'status' | 'valid_until'>, today = todayISO()): boolean {
  return OPEN.includes(p.status) && p.valid_until >= today;
}

export function canEdit(p: Pick<Proposal, 'status'>): boolean {
  return p.status !== 'accepted' && p.status !== 'declined';
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function itemTotal(item: Pick<ProposalItem, 'quantity' | 'unit_price'>): number {
  return round2((Number(item.quantity) || 0) * (Number(item.unit_price) || 0));
}

export interface Totals {
  /** Soma dos itens fixos, antes do desconto. */
  subtotal: number;
  discount: number;
  /** Itens fixos com desconto (o "valor da proposta"). */
  total: number;
  /** Soma de todos os opcionais. */
  optional: number;
  /** Total com os opcionais escolhidos. */
  withSelected: number;
}

/** Mesmo cálculo de _recalc_proposal_totals() e do aceite no banco. */
export function computeTotals<T extends Pick<ProposalItem, 'quantity' | 'unit_price' | 'is_optional'>>(
  items: T[],
  discount = 0,
  selectedOptional: (number | string)[] = [],
  idOf: (item: T, index: number) => number | string = (_, i) => i,
): Totals {
  let subtotal = 0;
  let optional = 0;
  let chosen = 0;
  items.forEach((item, index) => {
    const value = itemTotal(item);
    if (item.is_optional) {
      optional += value;
      if (selectedOptional.includes(idOf(item, index))) chosen += value;
    } else subtotal += value;
  });
  const d = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = round2(subtotal - d);
  return { subtotal: round2(subtotal), discount: round2(d), total, optional: round2(optional), withSelected: round2(total + chosen) };
}

// ---------------------------------------------------------------------
// O que pede atenção (lista de ações no início do painel)
// ---------------------------------------------------------------------

export type AttentionReason = 'change_requested' | 'viewed_no_reply' | 'not_opened' | 'expiring' | 'stale_draft';

export interface AttentionItem<P> {
  proposal: P;
  reason: AttentionReason;
  title: string;
  /** Menor = mais urgente. */
  priority: number;
}

const DAY = 86_400_000;
const daysSince = (iso: string | null, now: Date) => (iso ? Math.floor((now.getTime() - new Date(iso).getTime()) / DAY) : 0);

export function attentionItems<P extends Pick<Proposal, 'status' | 'valid_until' | 'sent_at' | 'last_viewed_at' | 'updated_at'>>(
  proposals: P[],
  now = new Date(),
): AttentionItem<P>[] {
  const today = todayISO(now);
  const out: AttentionItem<P>[] = [];
  for (const p of proposals) {
    const status = effectiveStatus(p, today);
    const left = daysUntil(p.valid_until, now);
    if (status === 'negotiating') {
      out.push({ proposal: p, reason: 'change_requested', title: 'Cliente pediu ajuste', priority: 0 });
    } else if (status === 'viewed' && daysSince(p.last_viewed_at, now) >= 2) {
      const d = daysSince(p.last_viewed_at, now);
      out.push({ proposal: p, reason: 'viewed_no_reply', title: `Vista há ${d} dias, sem resposta`, priority: 2 });
    } else if (status === 'sent' && daysSince(p.sent_at, now) >= 2) {
      out.push({ proposal: p, reason: 'not_opened', title: `Enviada há ${daysSince(p.sent_at, now)} dias e ainda não aberta`, priority: 3 });
    } else if (status === 'draft' && daysSince(p.updated_at, now) >= 3) {
      out.push({ proposal: p, reason: 'stale_draft', title: `Rascunho parado há ${daysSince(p.updated_at, now)} dias`, priority: 5 });
    }
    // Vencimento próximo vale para qualquer proposta aguardando o cliente.
    if (isAwaitingClient(p, today) && left <= 3) {
      out.push({
        proposal: p,
        reason: 'expiring',
        title: left === 0 ? 'Vence hoje' : left === 1 ? 'Vence amanhã' : `Vence em ${left} dias`,
        priority: left <= 1 ? 1 : 4,
      });
    }
  }
  return out.sort((a, b) => a.priority - b.priority);
}

// ---------------------------------------------------------------------
// Números do funil
// ---------------------------------------------------------------------

export interface PipelineStats {
  openCount: number;
  openValue: number;
  acceptedMonthCount: number;
  acceptedMonthValue: number;
  /** Aceitas ÷ respondidas (aceitas + recusadas + expiradas), em %. null sem dados. */
  acceptanceRate: number | null;
  averageTicket: number | null;
  /** Dias médios do envio ao aceite. */
  averageDaysToClose: number | null;
  byStatus: Record<EffectiveStatus, { count: number; value: number }>;
}

export function pipelineStats(
  proposals: Pick<Proposal, 'status' | 'valid_until' | 'total_amount' | 'accepted_total' | 'accepted_at' | 'sent_at'>[],
  now = new Date(),
): PipelineStats {
  const today = todayISO(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const byStatus = Object.fromEntries(
    (Object.keys(STATUS_META) as EffectiveStatus[]).map((s) => [s, { count: 0, value: 0 }]),
  ) as PipelineStats['byStatus'];

  let acceptedMonthCount = 0;
  let acceptedMonthValue = 0;
  let acceptedValueAll = 0;
  let closeDays = 0;
  let closeCount = 0;

  for (const p of proposals) {
    const status = effectiveStatus(p, today);
    const value = Number(status === 'accepted' ? p.accepted_total ?? p.total_amount : p.total_amount);
    byStatus[status].count += 1;
    byStatus[status].value += value;
    if (status === 'accepted') {
      acceptedValueAll += value;
      if (p.accepted_at && new Date(p.accepted_at).getTime() >= monthStart) {
        acceptedMonthCount += 1;
        acceptedMonthValue += value;
      }
      if (p.accepted_at && p.sent_at) {
        closeDays += Math.max(0, (new Date(p.accepted_at).getTime() - new Date(p.sent_at).getTime()) / DAY);
        closeCount += 1;
      }
    }
  }

  const open = byStatus.sent.count + byStatus.viewed.count + byStatus.negotiating.count;
  const answered = byStatus.accepted.count + byStatus.declined.count + byStatus.expired.count;
  return {
    openCount: open,
    openValue: round2(byStatus.sent.value + byStatus.viewed.value + byStatus.negotiating.value),
    acceptedMonthCount,
    acceptedMonthValue: round2(acceptedMonthValue),
    acceptanceRate: answered ? Math.round((byStatus.accepted.count / answered) * 100) : null,
    averageTicket: byStatus.accepted.count ? round2(acceptedValueAll / byStatus.accepted.count) : null,
    averageDaysToClose: closeCount ? Math.round((closeDays / closeCount) * 10) / 10 : null,
    byStatus,
  };
}

// ---------------------------------------------------------------------
// Mensagens prontas
// ---------------------------------------------------------------------

export const publicProposalUrl = (token: string, origin = window.location.origin) => `${origin}/p/${token}`;

interface MessageInput {
  clientName: string | null | undefined;
  title: string;
  link: string;
  validUntil: string;
  senderName: string;
}

/** Mensagem de envio (WhatsApp ou e-mail). */
export function shareMessage({ clientName, title, link, validUntil, senderName }: MessageInput): string {
  const hello = firstName(clientName) ? `Olá, ${firstName(clientName)}!` : 'Olá!';
  // A empresa assina no fim: evita errar o artigo ("da"/"do") antes do nome.
  return `${hello} Preparei a proposta "${title}" para você.\n\nÉ só abrir o link para ver os detalhes e aprovar por lá mesmo:\n${link}\n\nEla vale até ${longDate(validUntil)}. Qualquer dúvida, é só me chamar.\n\n${senderName}`;
}

/** Lembrete gentil para quem abriu e não respondeu. */
export function followUpMessage({ clientName, title, link, validUntil }: MessageInput): string {
  const hello = firstName(clientName) ? `Oi, ${firstName(clientName)}, tudo bem?` : 'Oi, tudo bem?';
  return `${hello} Passando para saber se ficou alguma dúvida sobre a proposta "${title}". Se quiser ajustar algo, me conta que eu adapto.\n\n${link}\n\nEla vale até ${longDate(validUntil)}.`;
}

export function whatsappUrl(text: string, phone?: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const to = digits ? (digits.length <= 11 ? `55${digits}` : digits) : '';
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl(email: string | null | undefined, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email ?? '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const totalLabel = (p: Pick<Proposal, 'status' | 'total_amount' | 'accepted_total'>) =>
  money(p.status === 'accepted' ? p.accepted_total ?? p.total_amount : p.total_amount);
