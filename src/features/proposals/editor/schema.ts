import { z } from 'zod';
import { parseMoney } from '@/lib/format';
import { computeTotals } from '@/lib/proposal';
import type { ProposalContent, ProposalItem } from '@/types';
import type { ProposalPayload } from '@/services/proposals';

export type EditorMode = 'proposal' | 'template';

const amount = (message: string, positive = false) =>
  z.string().refine((v) => {
    const n = parseMoney(v);
    return n !== null && (positive ? n > 0 : n >= 0);
  }, message);

const itemSchema = z.object({
  name: z.string().trim().min(1, 'Descreva o item.').max(160, 'Até 160 letras.'),
  description: z.string().max(600, 'Até 600 letras.'),
  unit: z.string().trim().min(1, 'Unidade').max(20, 'Até 20 letras.'),
  quantity: amount('Qtd. inválida', true),
  unit_price: amount('Informe o valor'),
  is_optional: z.boolean(),
});

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function editorSchema(mode: EditorMode) {
  return z
    .object({
      templateName: z.string().max(80),
      templateDescription: z.string().max(300),
      clientId: z.string().nullable(),
      newClient: z.object({ name: z.string().max(120), company: z.string().max(120), email: z.string().max(254), whatsapp: z.string().max(20) }),
      creatingClient: z.boolean(),
      title: z.string().trim().min(3, 'Dê um título com pelo menos 3 letras.').max(160, 'Até 160 letras.'),
      summary: z.string().max(3000, 'Até 3000 letras.'),
      deliverables: z.array(z.object({ value: z.string().max(300, 'Até 300 letras.') })).max(30, 'Até 30 entregas.'),
      timeline: z.string().max(200),
      next_step: z.string().max(500),
      exclusions: z.string().max(2000),
      terms: z.string().max(2000),
      valid_until: z.string(),
      discount: z.string(),
      items: z.array(itemSchema).min(1, 'Adicione pelo menos um item.').max(50, 'Até 50 itens.'),
    })
    .superRefine((v, ctx) => {
      if (mode === 'template') {
        if (v.templateName.trim().length < 2) ctx.addIssue({ code: 'custom', path: ['templateName'], message: 'Dê um nome ao modelo.' });
      } else {
        if (v.creatingClient) {
          if (v.newClient.name.trim().length < 2) ctx.addIssue({ code: 'custom', path: ['newClient', 'name'], message: 'Informe o nome do cliente.' });
          if (v.newClient.email.trim() && !EMAIL.test(v.newClient.email.trim()))
            ctx.addIssue({ code: 'custom', path: ['newClient', 'email'], message: 'E-mail inválido.' });
          const phone = v.newClient.whatsapp.replace(/\D/g, '');
          if (phone && (phone.length < 10 || phone.length > 13))
            ctx.addIssue({ code: 'custom', path: ['newClient', 'whatsapp'], message: 'Use DDD + número.' });
        } else if (!v.clientId) {
          ctx.addIssue({ code: 'custom', path: ['clientId'], message: 'Escolha quem vai receber a proposta.' });
        }
        if (!v.valid_until) ctx.addIssue({ code: 'custom', path: ['valid_until'], message: 'Informe a validade.' });
      }
      if (v.items.length && v.items.every((i) => i.is_optional))
        ctx.addIssue({ code: 'custom', path: ['items'], message: 'Pelo menos um item precisa ser fixo (não opcional).' });
      const discount = parseMoney(v.discount || '0');
      if (discount === null || discount < 0) ctx.addIssue({ code: 'custom', path: ['discount'], message: 'Desconto inválido.' });
      else {
        const { subtotal } = computeTotals(toItems(v.items));
        if (discount > subtotal) ctx.addIssue({ code: 'custom', path: ['discount'], message: 'Maior que o valor dos itens.' });
      }
    });
}

export type EditorValues = z.infer<ReturnType<typeof editorSchema>>;
export type EditorItem = EditorValues['items'][number];

export const emptyItem = (): EditorItem => ({ name: '', description: '', unit: 'un', quantity: '1', unit_price: '', is_optional: false });

const numberText = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','));

/** Itens do formulário (texto) como itens de proposta (número). Inválidos viram 0. */
export function toItems(items: EditorItem[]): Omit<ProposalItem, 'id'>[] {
  return items.map((i) => ({
    name: i.name.trim(),
    description: i.description.trim() || null,
    unit: i.unit.trim() || 'un',
    quantity: parseMoney(i.quantity) ?? 0,
    unit_price: parseMoney(i.unit_price) ?? 0,
    is_optional: i.is_optional,
  }));
}

export function fromItems(items: Pick<ProposalItem, 'name' | 'description' | 'unit' | 'quantity' | 'unit_price' | 'is_optional'>[] | undefined): EditorItem[] {
  if (!items?.length) return [emptyItem()];
  return items.map((i) => ({
    name: i.name,
    description: i.description ?? '',
    unit: i.unit || 'un',
    quantity: numberText(Number(i.quantity)),
    unit_price: numberText(Number(i.unit_price)),
    is_optional: Boolean(i.is_optional),
  }));
}

/** Conteúdo (de proposta ou modelo) como valores iniciais do formulário. */
export function contentToValues(content: Partial<ProposalContent>, base: EditorValues): EditorValues {
  return {
    ...base,
    title: content.title ?? base.title,
    summary: content.summary ?? base.summary,
    deliverables: content.deliverables?.length ? content.deliverables.map((value) => ({ value })) : base.deliverables,
    timeline: content.timeline ?? base.timeline,
    next_step: content.next_step ?? base.next_step,
    exclusions: content.exclusions ?? base.exclusions,
    terms: content.terms ?? base.terms,
    items: content.items?.length ? fromItems(content.items) : base.items,
  };
}

const textOrNull = (s: string) => s.trim() || null;

export function valuesToContent(v: EditorValues): ProposalContent {
  return {
    title: v.title.trim(),
    summary: textOrNull(v.summary),
    deliverables: v.deliverables.map((d) => d.value.trim()).filter(Boolean),
    timeline: textOrNull(v.timeline),
    next_step: textOrNull(v.next_step),
    exclusions: textOrNull(v.exclusions),
    terms: textOrNull(v.terms),
    items: toItems(v.items),
  };
}

export function valuesToPayload(v: EditorValues): ProposalPayload {
  const content = valuesToContent(v);
  return {
    ...content,
    client_id: v.creatingClient ? null : v.clientId,
    client: v.creatingClient
      ? {
          name: v.newClient.name.trim(),
          company: textOrNull(v.newClient.company),
          email: textOrNull(v.newClient.email),
          whatsapp: textOrNull(v.newClient.whatsapp),
        }
      : null,
    valid_until: v.valid_until,
    discount: parseMoney(v.discount || '0') ?? 0,
  };
}
