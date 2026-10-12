// Cor da marca da empresa aplicada com segurança (contraste legível).

const HEX = /^#[0-9a-f]{6}$/i;

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Texto preto ou branco, o que tiver mais contraste sobre a cor. */
export function textOn(hex: string): '#FFFFFF' | '#121915' {
  return contrastRatio(hex, '#FFFFFF') >= contrastRatio(hex, '#121915') ? '#FFFFFF' : '#121915';
}

/**
 * Cor de destaque para usar como texto/linha sobre fundo branco.
 * Cores muito claras (amarelo, por exemplo) são escurecidas até ficarem legíveis.
 */
export function accentOnWhite(hex: string | null | undefined, fallback = '#121915'): string {
  if (!hex || !HEX.test(hex)) return fallback;
  let n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  for (let i = 0; i < 12; i++) {
    const current = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
    if (contrastRatio(current, '#FFFFFF') >= 4.5) return current.toUpperCase();
    r = Math.round(r * 0.85);
    g = Math.round(g * 0.85);
    b = Math.round(b * 0.85);
  }
  n = (r << 16) | (g << 8) | b;
  return `#${n.toString(16).padStart(6, '0')}`.toUpperCase();
}

/** Versão bem clara da cor, para fundos de destaque. */
export function tint(hex: string | null | undefined, amount = 0.9, fallback = '#EFF0EA'): string {
  if (!hex || !HEX.test(hex)) return fallback;
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`.toUpperCase();
}

export const BRAND_SWATCHES = ['#121915', '#1F4E3D', '#2F6FEB', '#7357D1', '#C2413A', '#E07A1F', '#0E7C86', '#B58A2C'];
