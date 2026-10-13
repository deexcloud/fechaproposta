import { useState, type ReactNode } from 'react';
import { Box, Button, Card, Stack, Typography } from '@mui/material';
import { CalendarClock, Download, FileSignature, Lock, MessageCircle, MessageSquareText, PartyPopper, UserX } from 'lucide-react';
import { accentOnWhite, tint } from '@/lib/color';
import { daysUntil, firstName, money } from '@/lib/format';
import { tokens } from '@/theme/tokens';

export interface Brand {
  bg: string;
  fg: string;
}

export interface DecisionProps {
  orgName: string;
  base: number;
  extras: number;
  extrasCount: number;
  total: number;
  validUntil: string;
  brand: Brand;
  contactUrl: string | null;
  onAccept: () => void;
  onChanges: () => void;
  onDecline: () => void;
}

/** Quantas vezes o valor mudou (0 = nunca), para animar só na mudança e não ao abrir a página. */
function useChangeCount(value: number): number {
  const [state, setState] = useState({ value, count: 0 });
  if (state.value !== value) setState({ value, count: state.count + 1 });
  return state.count;
}

/** Valor que dá um pulinho na cor da marca quando muda (ex.: ao marcar um extra). */
function BumpOnChange({ value, color, origin, children }: { value: number; color: string; origin: 'left' | 'right'; children: ReactNode }) {
  const changes = useChangeCount(value);
  return (
    <Box
      key={changes}
      component="span"
      sx={{
        display: 'inline-block',
        transformOrigin: `${origin} center`,
        '--fp-flash': color,
        animation: changes ? 'fp-total-bump .55s cubic-bezier(.2,.7,.2,1)' : 'none',
      }}
    >
      {children}
    </Box>
  );
}

function validityText(left: number) {
  if (left <= 0) return 'Vence hoje';
  if (left === 1) return 'Vence amanhã';
  return `Válida por mais ${left} dias`;
}

const TRUST = [
  { icon: <UserX size={15} />, text: 'Sem cadastro e sem baixar nada' },
  { icon: <FileSignature size={15} />, text: 'Você recebe o comprovante do aceite' },
  { icon: <Lock size={15} />, text: 'Seus dados ficam protegidos' },
];

/** Resumo e decisão (computador): fica fixo ao lado da proposta. */
export function DecisionPanel({ orgName, base, extras, extrasCount, total, validUntil, brand, contactUrl, onAccept, onChanges, onDecline }: DecisionProps) {
  const left = daysUntil(validUntil);
  const urgent = left <= 3;
  return (
    <Stack spacing={2}>
      <Card sx={{ p: 2.5, borderRadius: '12px', boxShadow: '0 12px 32px -20px rgba(9,9,11,.18)' }}>
        <Typography variant="overline" color="text.secondary">Resumo</Typography>
        <Stack spacing={0.75} sx={{ mt: 1 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Proposta</Typography>
            <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>{money(base)}</Typography>
          </Stack>
          {extrasCount > 0 && (
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">{extrasCount === 1 ? '1 extra' : `${extrasCount} extras`}</Typography>
              <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>+ {money(extras)}</Typography>
            </Stack>
          )}
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 1.5, pt: 1.5, borderTop: `1px solid ${tokens.border}` }}>
          <Typography sx={{ fontWeight: 650 }}>Total</Typography>
          <Typography aria-live="polite" sx={{ fontWeight: 750, fontSize: 30, letterSpacing: '-0.03em', fontFeatureSettings: '"tnum"' }}>
            <BumpOnChange value={total} color={accentOnWhite(brand.bg)} origin="right">{money(total)}</BumpOnChange>
          </Typography>
        </Stack>

        <Stack
          direction="row"
          spacing={0.75}
          sx={{ mt: 1.5, alignItems: 'center', px: 1.25, py: 0.75, borderRadius: '8px', border: `1px solid ${tokens.border}`, bgcolor: urgent ? tokens.errorSoft : tokens.subtle, color: urgent ? tokens.error : tokens.textSecondary }}
        >
          <CalendarClock size={15} />
          <Typography variant="body2" sx={{ fontWeight: urgent ? 650 : 500 }}>{validityText(left)}</Typography>
        </Stack>

        <Stack spacing={1} sx={{ mt: 2.5 }}>
          <Button
            size="large"
            variant="contained"
            onClick={onAccept}
            sx={{ bgcolor: brand.bg, color: brand.fg, minHeight: 50, fontSize: 15.5, fontWeight: 650, borderRadius: '8px', '&:hover': { bgcolor: brand.bg, filter: 'brightness(0.92)' } }}
          >
            Aceitar proposta
          </Button>
          <Button size="large" variant="outlined" startIcon={<MessageSquareText />} onClick={onChanges}>
            Pedir um ajuste
          </Button>
          <Button size="small" color="inherit" onClick={onDecline} sx={{ color: tokens.textTertiary }}>
            Não tenho interesse
          </Button>
        </Stack>

        <Stack spacing={1} sx={{ mt: 2, pt: 2, borderTop: `1px solid ${tokens.border}` }}>
          {TRUST.map((t) => (
            <Stack key={t.text} direction="row" spacing={1} sx={{ alignItems: 'center', color: tokens.textSecondary }}>
              <Box sx={{ color: tokens.accentText, display: 'flex' }}>{t.icon}</Box>
              <Typography variant="caption" sx={{ fontSize: 12.5 }}>{t.text}</Typography>
            </Stack>
          ))}
        </Stack>
      </Card>

      {contactUrl && (
        <Card sx={{ p: 2, borderRadius: '12px' }}>
          <Typography variant="body2" sx={{ fontWeight: 650 }}>Ficou alguma dúvida?</Typography>
          <Typography variant="caption" color="text.secondary">Fale direto com {orgName}.</Typography>
          <Button fullWidth size="small" variant="outlined" startIcon={<MessageCircle />} href={contactUrl} target="_blank" rel="noopener" sx={{ mt: 1.25 }}>
            Chamar no WhatsApp
          </Button>
        </Card>
      )}
    </Stack>
  );
}

/** Barra fixa (celular): total sempre visível e o aceite a um toque. */
export function MobileDecisionBar({ total, extrasCount, validUntil, brand, onAccept, onChanges, onDecline }: Pick<DecisionProps, 'total' | 'extrasCount' | 'validUntil' | 'brand' | 'onAccept' | 'onChanges' | 'onDecline'>) {
  const left = daysUntil(validUntil);
  return (
    <Box
      className="no-print"
      sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, bgcolor: '#fff', borderTop: `1px solid ${tokens.border}`, boxShadow: '0 -10px 30px -12px rgba(15,42,34,.22)', px: 2, pt: 1.25, pb: 'calc(4px + env(safe-area-inset-bottom))' }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2, color: left <= 3 ? tokens.error : tokens.textSecondary, fontWeight: left <= 3 ? 650 : 400 }}>
            {left <= 3 ? validityText(left) : extrasCount ? `Total com ${extrasCount} ${extrasCount === 1 ? 'extra' : 'extras'}` : 'Total'}
          </Typography>
          <Typography aria-live="polite" sx={{ fontWeight: 750, fontSize: 21, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }} noWrap>
            <BumpOnChange value={total} color={accentOnWhite(brand.bg)} origin="left">{money(total)}</BumpOnChange>
          </Typography>
        </Box>
        <Button size="large" variant="contained" onClick={onAccept} sx={{ bgcolor: brand.bg, color: brand.fg, minHeight: 48, px: 3, borderRadius: '8px', fontWeight: 650, '&:hover': { bgcolor: brand.bg } }}>
          Aceitar
        </Button>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'center', gap: 2, mt: 0.25 }}>
        {/* 44px de altura: alvo de toque confortável no celular. */}
        <Button size="small" color="inherit" onClick={onChanges} sx={{ color: tokens.textSecondary, minHeight: 44 }}>Pedir ajuste</Button>
        <Button size="small" color="inherit" onClick={onDecline} sx={{ color: tokens.textTertiary, minHeight: 44 }}>Não tenho interesse</Button>
      </Stack>
    </Box>
  );
}

/** Topo da página do cliente: a marca de quem enviou e os atalhos de contato e PDF. */
export function PublicHeader({ orgName, logo, brand, contactUrl }: { orgName: string; logo: string | null; brand: Brand; contactUrl: string | null }) {
  return (
    <Box className="no-print" sx={{ bgcolor: tokens.glassStrong, backdropFilter: 'blur(10px)', borderBottom: `1px solid ${tokens.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
      <Stack direction="row" sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, height: 62, alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        {/* No celular a capa já mostra a marca: o topo fica só com o selo e o contato. */}
        <Stack direction="row" spacing={0.75} sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', color: tokens.textSecondary }}>
          <Lock size={14} />
          <Typography variant="body2" sx={{ fontWeight: 550 }}>Link seguro</Typography>
        </Stack>
        <Stack direction="row" spacing={1.25} sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', minWidth: 0 }}>
          {logo ? (
            <Box component="img" src={logo} alt={orgName} sx={{ maxHeight: 34, maxWidth: 140, objectFit: 'contain' }} />
          ) : (
            <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: brand.bg, color: brand.fg, display: 'grid', placeItems: 'center', fontWeight: 750 }}>{orgName.charAt(0).toUpperCase()}</Box>
          )}
          {!logo && <Typography noWrap sx={{ fontWeight: 650 }}>{orgName}</Typography>}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', color: tokens.textTertiary, mr: 1 }}>
            <Lock size={13} />
            <Typography variant="caption">Link seguro</Typography>
          </Stack>
          {contactUrl && (
            <Button size="small" variant="outlined" startIcon={<MessageCircle />} href={contactUrl} target="_blank" rel="noopener">
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Tirar dúvida</Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>WhatsApp</Box>
            </Button>
          )}
          <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => window.print()} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>PDF</Button>
        </Stack>
      </Stack>
    </Box>
  );
}

/** Logo depois de aceitar: confirma, diz o que acontece agora e oferece o PDF. */
export function AcceptedCelebration({ name, orgName, nextStep, brand }: { name: string; orgName: string; nextStep: string | null; brand: Brand }) {
  return (
    <Card className="fp-fade-up" sx={{ p: { xs: 2.5, sm: 3 }, mb: { xs: 2, sm: 3 }, borderRadius: '12px', borderTop: `3px solid ${brand.bg}`, overflow: 'visible' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: { sm: 'center' } }}>
        {/* O momento do "fechou": ícone entra com um pulo, halo e faíscas na cor da marca, uma vez só. */}
        <Box sx={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, borderRadius: '12px', bgcolor: brand.bg, animation: 'fp-pulse 1.1s .25s ease-out 2 both' }} />
          {Array.from({ length: 10 }, (_, i) => (
            <Box
              key={i}
              aria-hidden
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 7,
                height: 7,
                ml: '-3.5px',
                mt: '-3.5px',
                borderRadius: '50%',
                bgcolor: i % 2 ? tint(brand.bg, 0.45) : brand.bg,
                '--fp-angle': `${i * 36}deg`,
                animation: 'fp-burst .9s .2s cubic-bezier(.2,.7,.2,1) both',
              }}
            />
          ))}
          <Box sx={{ position: 'relative', width: 48, height: 48, borderRadius: '12px', bgcolor: brand.bg, color: brand.fg, display: 'grid', placeItems: 'center', animation: 'fp-pop-in .6s cubic-bezier(.2,.7,.2,1.3) both' }}>
            <PartyPopper size={24} />
          </Box>
        </Box>
        <Box sx={{ flexGrow: 1, animation: 'fp-fade-up .5s .25s cubic-bezier(.2,.7,.2,1) both' }}>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: 19, sm: 21 }, letterSpacing: '-0.02em' }}>Proposta aceita! Obrigado, {firstName(name) || 'tudo certo'}.</Typography>
          <Typography sx={{ mt: 0.5, color: tokens.textSecondary }}>
            {orgName} já recebeu o aviso. {nextStep ? `Próximo passo: ${nextStep}` : 'Em breve entram em contato para combinar o início.'}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Download />} onClick={() => window.print()} sx={{ flexShrink: 0, animation: 'fp-fade-up .5s .45s cubic-bezier(.2,.7,.2,1) both' }}>
          Baixar PDF assinado
        </Button>
      </Stack>
    </Card>
  );
}
