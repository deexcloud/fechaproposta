import { describe, expect, it } from 'vitest';
import {
  asaasUrls,
  buildExternalReference,
  checkoutLink,
  PAID_EVENTS,
  parseExternalReference,
  parseMethod,
  readAsaasEvent,
  validMonths,
  validPlanMonths,
  validWebhookToken,
} from './billing';

const ORG = '3f1c2a4e-5b6d-4e7f-8a9b-0c1d2e3f4a5b';

describe('cobrança: referência do pagamento', () => {
  it('ida e volta', () => {
    expect(parseExternalReference(buildExternalReference(ORG, 1))).toEqual({ orgId: ORG, months: 1 });
  });

  it('recusa referência malformada ou adulterada', () => {
    expect(parseExternalReference('nao-e-uuid:1')).toBeNull();
    expect(parseExternalReference(`${ORG}:0`)).toBeNull();
    expect(parseExternalReference(`${ORG}:25`)).toBeNull();
    expect(parseExternalReference(`${ORG}:1.5`)).toBeNull();
    expect(parseExternalReference(`${ORG}:1:extra`)).toBeNull();
    expect(parseExternalReference(null)).toBeNull();
  });

  it('meses válidos', () => {
    expect(validMonths(1)).toBe(true);
    expect(validMonths(12)).toBe(true);
    expect(validMonths(0)).toBe(false);
    expect(validMonths('1')).toBe(false);
  });

  it('só vende os períodos da tabela', () => {
    expect(validPlanMonths(1)).toBe(true);
    expect(validPlanMonths(6)).toBe(true);
    expect(validPlanMonths(12)).toBe(true);
    expect(validPlanMonths(3)).toBe(false);
    expect(validPlanMonths(24)).toBe(false);
  });
});

describe('cobrança: ambiente do Asaas', () => {
  it('chave de teste usa o sandbox', () => {
    expect(asaasUrls('$aact_hmlg_abc').api).toBe('https://api-sandbox.asaas.com/v3');
    expect(asaasUrls('$aact_prod_abc').api).toBe('https://api.asaas.com/v3');
  });

  it('ASAAS_ENV manda', () => {
    expect(asaasUrls('$aact_prod_abc', 'sandbox').sandbox).toBe(true);
    expect(asaasUrls('$aact_hmlg_abc', 'production').sandbox).toBe(false);
  });

  it('monta o link do checkout', () => {
    expect(checkoutLink('https://asaas.com', 'c7b1c696-b27b')).toBe('https://asaas.com/checkoutSession/show?id=c7b1c696-b27b');
  });
});

describe('cobrança: aviso do Asaas', () => {
  it('lê evento e id da cobrança', () => {
    expect(readAsaasEvent({ id: 'evt_1', event: 'PAYMENT_RECEIVED', payment: { object: 'payment', id: 'pay_080225913252' } })).toEqual({
      event: 'PAYMENT_RECEIVED',
      paymentId: 'pay_080225913252',
    });
  });

  it('descarta id estranho e corpo vazio', () => {
    expect(readAsaasEvent({ event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1;drop' } }).paymentId).toBeNull();
    expect(readAsaasEvent(null)).toEqual({ event: null, paymentId: null });
  });

  it('só eventos de pagamento confirmado liberam', () => {
    expect(PAID_EVENTS).toContain('PAYMENT_CONFIRMED');
    expect(PAID_EVENTS).toContain('PAYMENT_RECEIVED');
    expect(PAID_EVENTS).not.toContain('PAYMENT_CREATED');
  });
});

describe('cobrança: token do webhook', () => {
  it('aceita o token certo e recusa o resto', () => {
    expect(validWebhookToken('segredo-de-teste', 'segredo-de-teste')).toBe(true);
    expect(validWebhookToken('segredo-de-teste', 'segredo-de-testX')).toBe(false);
    expect(validWebhookToken('segredo-de-teste', null)).toBe(false);
    expect(validWebhookToken('', '')).toBe(false);
  });
});

describe('cobrança: forma de pagamento', () => {
  it('forma de pagamento: cartão é o padrão', () => {
    expect(parseMethod(undefined)).toBe('card');
    expect(parseMethod('pix')).toBe('pix');
    expect(parseMethod('boleto')).toBeNull();
  });
});
