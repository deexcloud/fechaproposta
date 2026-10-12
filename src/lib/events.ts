import type { ProposalEvent } from '@/types';
import { firstName } from './format';

/** Frase curta para cada movimento da linha do tempo. */
export function eventLabel(e: Pick<ProposalEvent, 'kind' | 'actor' | 'actor_name' | 'message'>, clientName?: string | null): string {
  const client = firstName(e.actor_name) || firstName(clientName) || 'O cliente';
  switch (e.kind) {
    case 'created':
      return 'Proposta criada';
    case 'updated':
      return 'Proposta alterada depois do envio';
    case 'sent':
      return 'Marcada como enviada';
    case 'viewed':
      return `${client} abriu a proposta`;
    case 'change_requested':
      return `${client} pediu um ajuste`;
    case 'accepted':
      return e.actor === 'team' ? `Aceite registrado pela equipe (${e.actor_name ?? 'cliente'})` : `${client} aceitou a proposta`;
    case 'declined':
      return e.actor === 'team' ? 'Marcada como recusada' : `${client} recusou a proposta`;
    case 'reopened':
      return 'Reaberta como rascunho';
    case 'duplicated':
      return e.message ?? 'Criada a partir de outra proposta';
  }
}

export type EventTone = 'neutral' | 'info' | 'warning' | 'violet' | 'success' | 'error';

export function eventTone(kind: ProposalEvent['kind']): EventTone {
  switch (kind) {
    case 'viewed':
      return 'warning';
    case 'change_requested':
      return 'violet';
    case 'accepted':
      return 'success';
    case 'declined':
      return 'error';
    case 'sent':
      return 'info';
    default:
      return 'neutral';
  }
}
