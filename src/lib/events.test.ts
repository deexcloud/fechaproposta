import { describe, expect, it } from 'vitest';
import { eventLabel } from './events';

describe('linha do tempo', () => {
  it('usa o primeiro nome de quem respondeu', () => {
    expect(eventLabel({ kind: 'change_requested', actor: 'client', actor_name: 'Maria Souza', message: 'x' })).toBe('Maria pediu um ajuste');
    expect(eventLabel({ kind: 'accepted', actor: 'client', actor_name: 'João', message: null })).toBe('João aceitou a proposta');
  });

  it('sem nome, usa o cliente da proposta ou "O cliente"', () => {
    expect(eventLabel({ kind: 'viewed', actor: 'client', actor_name: null, message: null }, 'Ana Lima')).toBe('Ana abriu a proposta');
    expect(eventLabel({ kind: 'viewed', actor: 'client', actor_name: null, message: null })).toBe('O cliente abriu a proposta');
  });

  it('diferencia aceite registrado pela equipe', () => {
    expect(eventLabel({ kind: 'accepted', actor: 'team', actor_name: 'Maria', message: null })).toContain('pela equipe');
  });
});
