import { describe, expect, it } from 'vitest';
import { accentOnWhite, contrastRatio, textOn, tint } from './color';

describe('cor da marca', () => {
  it('escolhe texto legível sobre a cor', () => {
    expect(textOn('#0F2A22')).toBe('#FFFFFF');
    expect(textOn('#FACC15')).toBe('#0F2A22');
  });

  it('escurece cores claras até ficarem legíveis no branco', () => {
    const accent = accentOnWhite('#FACC15');
    expect(contrastRatio(accent, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(accentOnWhite('#2F6FEB')).toBe('#2F6FEB');
  });

  it('cor inválida usa a padrão', () => {
    expect(accentOnWhite('azul')).toBe('#0F2A22');
    expect(tint(null)).toBe('#EFF0EA');
    expect(tint('#000000', 0.5)).toBe('#808080');
  });
});
