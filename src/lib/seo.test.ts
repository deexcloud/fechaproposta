import { describe, expect, it } from 'vitest';
import { isIndexable, routeTitle } from './seo';

describe('routeTitle', () => {
  it('dá nome às telas do painel e do acesso', () => {
    expect(routeTitle('/entrar')).toBe('Entrar · FechaProposta');
    expect(routeTitle('/painel')).toBe('Painel · FechaProposta');
    expect(routeTitle('/painel/propostas/nova')).toBe('Nova proposta · FechaProposta');
    expect(routeTitle('/painel/propostas/abc/editar')).toBe('Editar proposta · FechaProposta');
    expect(routeTitle('/painel/modelos/novo')).toBe('Novo modelo · FechaProposta');
  });

  it('deixa o título com as páginas que definem o próprio', () => {
    expect(routeTitle('/')).toBeNull();
    expect(routeTitle('/p/token123')).toBeNull();
    expect(routeTitle('/painel/propostas/abc/visualizar')).toBeNull();
  });

  it('rota desconhecida vira "não encontrada"', () => {
    expect(routeTitle('/qualquer')).toBe('Página não encontrada · FechaProposta');
  });
});

describe('isIndexable', () => {
  it('só páginas públicas de divulgação', () => {
    expect(isIndexable('/')).toBe(true);
    expect(isIndexable('/exemplo')).toBe(true);
    expect(isIndexable('/p/token123')).toBe(false);
    expect(isIndexable('/painel')).toBe(false);
    expect(isIndexable('/entrar')).toBe(false);
  });
});
