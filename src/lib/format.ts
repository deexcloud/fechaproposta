// Formatação para o público brasileiro (valores, datas, telefones).

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlShort = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/** R$ 1.234,50 */
export function money(value: number | string | null | undefined): string {
  return brl.format(Number(value ?? 0));
}

/** R$ 1.235 (sem centavos, para painéis). Mantém centavos quando o valor é pequeno. */
export function moneyShort(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return Math.abs(n) < 100 && n % 1 !== 0 ? brl.format(n) : brlShort.format(n);
}

/** Lê "1.234,56", "1234.56" ou "R$ 10" como número. Vazio ou inválido = null. */
export function parseMoney(text: string): number | null {
  const clean = text.replace(/[^\d,.-]/g, '');
  if (!clean) return null;
  // Com vírgula: padrão brasileiro (ponto é milhar).
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Datas "AAAA-MM-DD" são dias, não instantes: lidas ao meio-dia para não mudar de dia no fuso. */
export function parseDay(day: string): Date {
  return new Date(`${day}T12:00:00`);
}

/** 12 de outubro de 2026 */
export function longDate(day: string | null | undefined): string {
  if (!day) return '—';
  return parseDay(day).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** 12 out */
export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = value.length === 10 ? parseDay(value) : new Date(value);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

/** 12/10/2026 às 14:32 */
export function dateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias", "12 out" */
export function relativeTime(value: string | null | undefined, now = new Date()): string {
  if (!value) return '—';
  const diff = now.getTime() - new Date(value).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  return shortDate(value);
}

/** Hoje como "AAAA-MM-DD" no horário local. */
export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(day: string, days: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

/** Dias inteiros de hoje até a data (negativo = já passou). */
export function daysUntil(day: string, now = new Date()): number {
  return Math.round((parseDay(day).getTime() - parseDay(todayISO(now)).getTime()) / 86_400_000);
}

export function onlyDigits(text: string | null | undefined): string {
  return (text ?? '').replace(/\D/g, '');
}

/** (11) 98888-7777 */
export function formatPhone(digits: string | null | undefined): string {
  const d = onlyDigits(digits).replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits ?? '';
}

/** CPF ou CNPJ formatado. */
export function formatDocument(digits: string | null | undefined): string {
  const d = onlyDigits(digits);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return digits ?? '';
}

export function initials(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
}

/** Primeiro nome, pulando pronomes de tratamento (Dra. Paula → Paula). */
export function firstName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const titled = parts.length > 1 && /^(dr|dra|sr|sra|srta|prof|profa)\.?$/i.test(parts[0]);
  return (titled ? parts[1] : parts[0]) ?? '';
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
