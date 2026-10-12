import { describe, expect, it } from 'vitest';
import { addDays, daysUntil, firstName, formatDocument, formatPhone, initials, parseMoney, relativeTime, todayISO } from './format';

describe('valores', () => {
  it('lê valores digitados do jeito brasileiro', () => {
    expect(parseMoney('1.234,56')).toBe(1234.56);
    expect(parseMoney('R$ 10')).toBe(10);
    expect(parseMoney('99.9')).toBe(99.9);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
  });
});

describe('datas', () => {
  const now = new Date('2026-10-12T22:30:00');

  it('dias são do calendário local', () => {
    expect(todayISO(now)).toBe('2026-10-12');
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(daysUntil('2026-10-15', now)).toBe(3);
    expect(daysUntil('2026-10-11', now)).toBe(-1);
  });

  it('tempo relativo curto', () => {
    expect(relativeTime('2026-10-12T22:29:40', now)).toBe('agora');
    expect(relativeTime('2026-10-12T22:00:00', now)).toBe('há 30 min');
    expect(relativeTime('2026-10-12T19:30:00', now)).toBe('há 3 h');
    expect(relativeTime('2026-10-11T20:00:00', now)).toBe('ontem');
    expect(relativeTime('2026-10-08T22:30:00', now)).toBe('há 4 dias');
  });
});

describe('contato', () => {
  it('formata telefone e documento', () => {
    expect(formatPhone('11988887777')).toBe('(11) 98888-7777');
    expect(formatPhone('5511988887777')).toBe('(11) 98888-7777');
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
    expect(formatDocument('12345678000190')).toBe('12.345.678/0001-90');
    expect(formatDocument('12345678901')).toBe('123.456.789-01');
  });

  it('primeiro nome sem pronome de tratamento', () => {
    expect(firstName('Dra. Paula Lima')).toBe('Paula');
    expect(firstName('Sr Antônio')).toBe('Antônio');
    expect(firstName('Maria')).toBe('Maria');
    expect(firstName('Dra.')).toBe('Dra.');
  });

  it('iniciais', () => {
    expect(initials('Maria da Silva')).toBe('MD');
    expect(initials('')).toBe('?');
  });
});
