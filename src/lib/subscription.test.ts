import { describe, expect, it } from 'vitest';
import { subscriptionState } from './subscription';

const now = new Date('2026-10-10T12:00:00Z');

describe('assinatura', () => {
  it('empresa nova está no teste com 7 dias', () => {
    const s = subscriptionState({ trial_ends_at: '2026-10-17T12:00:00Z', paid_until: null }, now);
    expect(s).toMatchObject({ active: true, inTrial: true, trialDaysLeft: 7, paidDaysLeft: null });
  });

  it('arredonda os dias restantes para cima', () => {
    const s = subscriptionState({ trial_ends_at: '2026-10-10T13:00:00Z', paid_until: null }, now);
    expect(s.trialDaysLeft).toBe(1);
  });

  it('teste vencido e sem pagamento bloqueia', () => {
    const s = subscriptionState({ trial_ends_at: '2026-10-10T11:59:00Z', paid_until: null }, now);
    expect(s).toMatchObject({ active: false, inTrial: false, trialDaysLeft: 0 });
  });

  it('pagamento em dia libera mesmo com o teste vencido', () => {
    const s = subscriptionState({ trial_ends_at: '2026-10-01T00:00:00Z', paid_until: '2026-11-10T12:00:00Z' }, now);
    expect(s).toMatchObject({ active: true, inTrial: false, paidDaysLeft: 31 });
  });

  it('pagamento vencido volta a bloquear', () => {
    const s = subscriptionState({ trial_ends_at: '2026-09-01T00:00:00Z', paid_until: '2026-10-09T00:00:00Z' }, now);
    expect(s.active).toBe(false);
  });
});
