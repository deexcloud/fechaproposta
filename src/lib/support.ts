import { whatsappUrl } from './proposal';

/** WhatsApp do FechaProposta para dúvidas e suporte (VITE_SUPPORT_WHATSAPP, só números com DDD). */
const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined)?.replace(/\D/g, '') || null;

/** Link do WhatsApp de suporte com a mensagem pronta, ou null quando o número não foi configurado. */
export function supportUrl(text = 'Oi! Tenho uma dúvida sobre o FechaProposta.'): string | null {
  return SUPPORT_WHATSAPP ? whatsappUrl(text, SUPPORT_WHATSAPP) : null;
}
