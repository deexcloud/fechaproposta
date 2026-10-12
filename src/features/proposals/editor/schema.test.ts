import { describe, expect, it } from 'vitest';
import { editorSchema, emptyItem, fromItems, valuesToPayload, type EditorValues } from './schema';

const base: EditorValues = {
  templateName: '',
  templateDescription: '',
  clientId: 'c1',
  newClient: { name: '', company: '', email: '', whatsapp: '' },
  creatingClient: false,
  title: 'Site novo',
  summary: '',
  deliverables: [{ value: 'Layout' }, { value: '  ' }],
  timeline: '',
  next_step: '',
  exclusions: '',
  terms: '',
  valid_until: '2026-10-30',
  discount: '100',
  items: [
    { ...emptyItem(), name: 'Design', quantity: '1', unit_price: '2.000,00' },
    { ...emptyItem(), name: 'Blog', quantity: '1', unit_price: '800', is_optional: true },
  ],
};

const errors = (values: EditorValues, mode: 'proposal' | 'template' = 'proposal') => {
  const result = editorSchema(mode).safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
};

describe('editor de proposta', () => {
  it('formulário completo passa', () => {
    expect(errors(base)).toEqual([]);
  });

  it('exige cliente (existente ou novo com nome)', () => {
    expect(errors({ ...base, clientId: null })).toContain('clientId');
    expect(errors({ ...base, clientId: null, creatingClient: true })).toContain('newClient.name');
    expect(errors({ ...base, clientId: null, creatingClient: true, newClient: { ...base.newClient, name: 'Ana', email: 'x' } })).toContain('newClient.email');
  });

  it('modelo não precisa de cliente, mas precisa de nome', () => {
    expect(errors({ ...base, clientId: null }, 'template')).toEqual(['templateName']);
  });

  it('recusa só opcionais, desconto maior que os itens e valor vazio', () => {
    expect(errors({ ...base, items: [{ ...base.items[1] }] })).toContain('items');
    expect(errors({ ...base, discount: '5000' })).toContain('discount');
    expect(errors({ ...base, items: [{ ...base.items[0], unit_price: '' }] })).toContain('items.0.unit_price');
    expect(errors({ ...base, items: [{ ...base.items[0], quantity: '0' }] })).toContain('items.0.quantity');
  });

  it('monta o envio para o banco com números e sem linhas vazias', () => {
    const payload = valuesToPayload(base);
    expect(payload.deliverables).toEqual(['Layout']);
    expect(payload.items[0]).toMatchObject({ quantity: 1, unit_price: 2000, is_optional: false });
    expect(payload.discount).toBe(100);
    expect(payload.client_id).toBe('c1');
    expect(payload.client).toBeNull();
  });

  it('cliente novo vai junto com a proposta', () => {
    const payload = valuesToPayload({ ...base, creatingClient: true, clientId: null, newClient: { name: ' Ana ', company: '', email: 'a@b.com', whatsapp: '' } });
    expect(payload.client).toEqual({ name: 'Ana', company: null, email: 'a@b.com', whatsapp: null });
    expect(payload.client_id).toBeNull();
  });

  it('itens salvos voltam ao formulário no formato brasileiro', () => {
    expect(fromItems([{ name: 'a', description: null, unit: 'h', quantity: 1.5, unit_price: 99.9, is_optional: false }])[0]).toMatchObject({ quantity: '1,50', unit_price: '99,90' });
  });
});
