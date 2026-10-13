import { whatsappUrl } from './proposal';

/** WhatsApp do FechaProposta para dúvidas e suporte. VITE_SUPPORT_WHATSAPP (só números com DDD) troca o padrão. */
const DEFAULT_SUPPORT_WHATSAPP = '53991944938';
const SUPPORT_WHATSAPP = ((import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined) || DEFAULT_SUPPORT_WHATSAPP).replace(/\D/g, '') || null;

/** Link do WhatsApp de suporte com a mensagem pronta, ou null quando o número não foi configurado. */
export function supportUrl(text = 'Oi! Tenho uma dúvida sobre o FechaProposta.'): string | null {
  return SUPPORT_WHATSAPP ? whatsappUrl(text, SUPPORT_WHATSAPP) : null;
}
