import type { ReactNode } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { CalendarDays, Check, CircleCheck, Clock3, Globe, Mail, MessageCircle, PenLine, Rocket, Sparkles, Wallet } from 'lucide-react';
import { computeTotals, itemTotal } from '@/lib/proposal';
import { accentOnWhite, textOn, tint } from '@/lib/color';
import { firstName, formatDocument, formatPhone, longDate, money } from '@/lib/format';
import { getPublicMediaUrl } from '@/lib/supabase';
import type { Organization, ProposalItem } from '@/types';
import { displayFont, tokens } from '@/theme/tokens';

export interface DocumentData {
  code: string;
  title: string;
  summary: string | null;
  deliverables: string[];
  timeline: string | null;
  next_step: string | null;
  exclusions: string | null;
  terms: string | null;
  valid_until: string;
  discount: number;
  items: (ProposalItem & { id?: string })[];
  client: { name: string; company: string | null } | null;
  organization: Pick<Organization, 'name' | 'email' | 'whatsapp' | 'website' | 'document' | 'city' | 'logo_path' | 'brand_color'>;
}

interface ProposalDocumentProps {
  data: DocumentData;
  /** Cliente pode marcar e desmarcar os opcionais. */
  selectable?: boolean;
  selected?: string[];
  onToggleOptional?: (id: string) => void;
  /** Versão menor, para a prévia ao lado do editor. */
  compact?: boolean;
  /** Bloco extra no fim (ex.: aceite registrado). */
  footer?: ReactNode;
}

function Section({ index, title, subtitle, children, accent }: { index: string; title: string; subtitle?: string; children: ReactNode; accent: string }) {
  return (
    <Box component="section" sx={{ mt: { xs: 6, sm: 8 }, breakInside: 'avoid-page' }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: subtitle ? 0.5 : 2.5 }}>
        <Typography sx={{ color: accent, fontWeight: 700, fontSize: 12, fontFeatureSettings: '"tnum"', px: 0.75, py: 0.25, borderRadius: '6px', border: `1px solid ${tokens.border}` }}>{index}</Typography>
        <Typography component="h2" sx={{ fontFamily: displayFont, fontWeight: 700, fontSize: { xs: 22, sm: 26 }, lineHeight: 1.2, letterSpacing: '-0.03em' }}>
          {title}
        </Typography>
      </Stack>
      {subtitle && <Typography sx={{ color: tokens.textSecondary, mb: 2.5, pl: { sm: 4 } }}>{subtitle}</Typography>}
      {children}
    </Box>
  );
}

function CoverStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: tokens.textTertiary, '& svg': { width: 14, height: 14 } }}>
        {icon}
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: tokens.textSecondary }}>{label}</Typography>
      </Stack>
      <Typography sx={{ fontWeight: 650, fontSize: { xs: 15, sm: 17 }, mt: 0.5, fontFeatureSettings: '"tnum"' }}>{value}</Typography>
    </Box>
  );
}

/** Cartão do opcional: o cartão inteiro liga e desliga. */
function OptionalCard({ item, checked, selectable, accent, onToggle }: { item: ProposalItem; checked: boolean; selectable?: boolean; accent: string; onToggle: () => void }) {
  const body = (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', width: '100%', textAlign: 'left' }}>
      <Box
        sx={{
          mt: 0.25,
          width: 22,
          height: 22,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          border: `2px solid ${checked ? accent : tokens.borderStrong}`,
          bgcolor: checked ? accent : 'transparent',
          color: '#fff',
          transition: 'all .15s ease',
        }}
      >
        {checked && <Check size={13} strokeWidth={3.5} />}
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 650, fontSize: 15 }}>{item.name}</Typography>
        {item.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, whiteSpace: 'pre-line' }}>{item.description}</Typography>}
        {Number(item.quantity) !== 1 && (
          <Typography variant="caption" sx={{ color: tokens.textTertiary }}>
            {Number(item.quantity).toLocaleString('pt-BR')} × {money(item.unit_price)}{item.unit && item.unit !== 'un' ? ` por ${item.unit}` : ''}
          </Typography>
        )}
      </Box>
      <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap', color: checked ? accent : tokens.textPrimary, fontFeatureSettings: '"tnum"' }}>
        + {money(itemTotal(item))}
      </Typography>
    </Stack>
  );
  const sx = {
    width: '100%',
    p: 2,
    borderRadius: '10px',
    border: `1.5px solid ${checked ? accent : tokens.border}`,
    bgcolor: checked ? tint(accent, 0.94) : '#fff',
    transition: 'border-color .15s ease, background-color .15s ease, transform .1s ease',
  };
  if (!selectable) return <Box sx={sx}>{body}</Box>;
  return (
    <ButtonBase
      role="checkbox"
      aria-checked={checked}
      aria-label={`${checked ? 'Remover' : 'Incluir'} ${item.name}`}
      onClick={onToggle}
      sx={{ ...sx, display: 'block', '&:hover': { borderColor: accent }, '&:active': { transform: 'scale(.99)' }, '&.Mui-focusVisible': { boxShadow: `0 0 0 3px ${tint(accent, 0.7)}` } }}
    >
      {body}
    </ButtonBase>
  );
}

/** A proposta como o cliente vê. Mesma peça na prévia, no link público, no exemplo e no PDF. */
export function ProposalDocument({ data, selectable, selected = [], onToggleOptional, compact, footer }: ProposalDocumentProps) {
  const org = data.organization;
  const brand = org.brand_color ?? tokens.primary;
  const onBrand = textOn(brand);
  const accent = accentOnWhite(org.brand_color, tokens.primary);
  const logo = getPublicMediaUrl(org.logo_path);
  const fixed = data.items.filter((i) => !i.is_optional);
  const optional = data.items.filter((i) => i.is_optional);
  const optionalId = (item: ProposalItem & { id?: string }) => item.id ?? String(data.items.indexOf(item));
  const totals = computeTotals(data.items, data.discount, selected, optionalId);
  const deliverables = data.deliverables.filter((d) => d.trim());
  const greeting = firstName(data.client?.name);
  const contact = [
    org.email && { icon: <Mail />, text: org.email },
    org.whatsapp && { icon: <MessageCircle />, text: formatPhone(org.whatsapp) },
    org.website && { icon: <Globe />, text: org.website.replace(/^https?:\/\//, '') },
  ].filter(Boolean) as { icon: ReactNode; text: string }[];
  const steps = [
    { icon: <PenLine />, title: 'Você aprova aqui', text: 'Revise, escolha os opcionais e assine online. Leva um minuto.' },
    { icon: <Rocket />, title: 'Próximo passo', text: data.next_step || `${org.name} entra em contato para combinar o início.` },
    { icon: <CircleCheck />, title: 'Entrega', text: data.timeline ? `Prazo estimado: ${data.timeline}.` : 'No prazo combinado entre vocês.' },
  ];

  return (
    <Box
      component="article"
      className="print-plain"
      sx={{
        bgcolor: '#fff',
        color: tokens.textPrimary,
        borderRadius: compact ? '12px' : { xs: 0, sm: '16px' },
        border: compact ? `1px solid ${tokens.border}` : { xs: 'none', sm: `1px solid ${tokens.border}` },
        boxShadow: compact ? 'none' : { xs: 'none', sm: '0 1px 2px rgba(9,9,11,.04), 0 16px 40px -24px rgba(9,9,11,.14)' },
        overflow: 'hidden',
        fontSize: 15,
        ...(compact && { zoom: 0.8 }),
      }}
    >
      {/* Capa clara: a marca aparece na faixa do topo e nos detalhes, sem pintar tudo. */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 6 },
          pt: { xs: 3, sm: 4.5 },
          pb: { xs: 3.5, sm: 5 },
          borderTop: `4px solid ${brand}`,
          background: `linear-gradient(180deg, ${tint(brand, 0.96)} 0%, #fff 70%)`,
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        }}
      >
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box sx={{ height: 40, minWidth: 40, px: logo ? 1 : 0, borderRadius: '10px', bgcolor: logo ? '#fff' : brand, border: logo ? `1px solid ${tokens.border}` : 'none', display: 'grid', placeItems: 'center' }}>
              {logo ? (
                <Box component="img" src={logo} alt={`Logo de ${org.name}`} sx={{ maxHeight: 28, maxWidth: 120, objectFit: 'contain' }} />
              ) : (
                <Typography sx={{ fontWeight: 750, fontSize: 17, color: onBrand }}>{org.name.charAt(0).toUpperCase()}</Typography>
              )}
            </Box>
            <Typography noWrap sx={{ fontWeight: 650, fontSize: 15 }}>{org.name}</Typography>
          </Stack>
          <Box sx={{ px: 1, py: 0.25, borderRadius: '6px', border: `1px solid ${tokens.border}`, bgcolor: '#fff', fontSize: 12, fontWeight: 600, color: tokens.textSecondary, whiteSpace: 'nowrap', fontFeatureSettings: '"tnum"' }}>
            {data.code}
          </Box>
        </Stack>

        <Box sx={{ mt: { xs: 5, sm: 6 }, maxWidth: 720 }}>
          <Typography sx={{ fontSize: 15, color: tokens.textSecondary }}>
            {greeting ? `Olá, ${greeting}.` : 'Olá!'} {data.client?.company ? `Preparamos esta proposta para ${data.client.company}.` : 'Preparamos esta proposta para você.'}
          </Typography>
          <Typography component="h1" sx={{ fontFamily: displayFont, fontWeight: 800, fontSize: { xs: 34, sm: 46 }, lineHeight: 1.05, letterSpacing: '-0.045em', mt: 1 }}>
            {data.title || 'Título da proposta'}
          </Typography>
          {data.summary && (
            <Typography sx={{ mt: 2, fontSize: { xs: 16, sm: 17 }, lineHeight: 1.6, color: tokens.textSecondary, whiteSpace: 'pre-line' }}>
              {data.summary}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            mt: { xs: 3.5, sm: 4 },
            p: { xs: 2, sm: 2.5 },
            borderRadius: '12px',
            border: `1px solid ${tokens.border}`,
            bgcolor: '#fff',
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
            '& > :first-of-type': { gridColumn: { xs: '1 / -1', sm: 'auto' } },
          }}
        >
          <CoverStat icon={<Wallet />} label="Investimento" value={money(totals.total)} />
          <CoverStat icon={<Clock3 />} label="Prazo" value={data.timeline || 'A combinar'} />
          <CoverStat icon={<CalendarDays />} label="Válida até" value={longDate(data.valid_until)} />
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2.5, sm: 6 }, pb: { xs: 4, sm: 6 } }}>
        {deliverables.length > 0 && (
          <Section index="01" title="O que você recebe" accent={accent}>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', sm: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))' } }}>
              {deliverables.map((d, i) => (
                <Stack component="li" key={i} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', p: 1.5, borderRadius: '10px', border: `1px solid ${tokens.border}` }}>
                  <Box sx={{ width: 24, height: 24, borderRadius: '8px', bgcolor: tint(accent, 0.88), color: accent, display: 'grid', placeItems: 'center', flexShrink: 0, mt: 0.1 }}>
                    <Check size={14} strokeWidth={3} />
                  </Box>
                  <Typography sx={{ fontSize: 15, lineHeight: 1.5 }}>{d}</Typography>
                </Stack>
              ))}
            </Box>
          </Section>
        )}

        <Section index={deliverables.length ? '02' : '01'} title="Investimento" accent={accent}>
          <Box sx={{ borderRadius: '12px', border: `1px solid ${tokens.border}`, overflow: 'hidden' }}>
            {fixed.map((item, i) => (
              <Stack key={item.id ?? i} direction="row" spacing={2} sx={{ px: { xs: 2, sm: 2.5 }, py: 2, borderTop: i ? `1px solid ${tokens.border}` : 'none', alignItems: 'flex-start' }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{item.name || 'Item sem nome'}</Typography>
                  {item.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, whiteSpace: 'pre-line' }}>{item.description}</Typography>}
                  {Number(item.quantity) !== 1 && (
                    <Typography variant="caption" sx={{ color: tokens.textTertiary }}>
                      {Number(item.quantity).toLocaleString('pt-BR')} × {money(item.unit_price)}{item.unit && item.unit !== 'un' ? ` por ${item.unit}` : ''}
                    </Typography>
                  )}
                </Box>
                <Typography sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontFeatureSettings: '"tnum"' }}>{money(itemTotal(item))}</Typography>
              </Stack>
            ))}
            <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2.25, bgcolor: tokens.subtle, borderTop: `1px solid ${tokens.border}` }}>
              {totals.discount > 0 && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2" sx={{ textDecoration: 'line-through', color: tokens.textTertiary, fontFeatureSettings: '"tnum"' }}>{money(totals.subtotal)}</Typography>
                </Stack>
              )}
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 650 }}>Total</Typography>
                  {totals.discount > 0 && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5, px: 1, py: 0.25, borderRadius: '999px', bgcolor: tokens.successSoft, color: tokens.success, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      <Sparkles size={12} /> Você economiza {money(totals.discount)}
                    </Box>
                  )}
                </Box>
                <Typography sx={{ fontWeight: 750, fontSize: { xs: 26, sm: 30 }, letterSpacing: '-0.03em', fontFeatureSettings: '"tnum"' }}>{money(totals.total)}</Typography>
              </Stack>
            </Box>
          </Box>

          {optional.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Personalize sua proposta</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.75 }}>
                {selectable ? 'Toque para incluir o que fizer sentido para você. O total é atualizado na hora.' : 'Extras que o cliente pode escolher incluir ao aceitar.'}
              </Typography>
              <Stack spacing={1.25}>
                {optional.map((item, i) => {
                  const id = optionalId(item);
                  return <OptionalCard key={item.id ?? i} item={item} checked={selected.includes(id)} selectable={selectable} accent={accent} onToggle={() => onToggleOptional?.(id)} />;
                })}
              </Stack>
              {selected.length > 0 && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 2, px: 0.5 }}>
                  <Typography sx={{ fontWeight: 650 }}>Total com os extras</Typography>
                  <Typography sx={{ fontWeight: 750, fontSize: 22, color: accent, fontFeatureSettings: '"tnum"' }}>{money(totals.withSelected)}</Typography>
                </Stack>
              )}
            </Box>
          )}
        </Section>

        <Section index={deliverables.length ? '03' : '02'} title="Como seguimos" accent={accent}>
          <Box sx={{ display: 'grid', gap: { xs: 0, sm: 2 }, gridTemplateColumns: { xs: '1fr', sm: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))' } }}>
            {steps.map((s, i) => (
              <Stack key={s.title} direction={{ xs: 'row', sm: compact ? 'row' : 'column' }} spacing={1.75} sx={{ position: 'relative', pb: { xs: i < 2 ? 2.5 : 0, sm: 0 } }}>
                <Stack sx={{ alignItems: { xs: 'center', sm: compact ? 'center' : 'flex-start' } }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: i === 0 ? brand : tint(accent, 0.9), color: i === 0 ? onBrand : accent, display: 'grid', placeItems: 'center', flexShrink: 0, printColorAdjust: 'exact', '& svg': { width: 19, height: 19 } }}>
                    {s.icon}
                  </Box>
                  {i < 2 && <Box sx={{ display: { xs: 'block', sm: compact ? 'block' : 'none' }, width: '2px', flexGrow: 1, mt: 1, bgcolor: tokens.border, borderRadius: 1 }} />}
                </Stack>
                <Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: tokens.textTertiary, letterSpacing: '0.08em' }}>PASSO {i + 1}</Typography>
                  <Typography sx={{ fontWeight: 650, fontSize: 16 }}>{s.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.55 }}>{s.text}</Typography>
                </Box>
              </Stack>
            ))}
          </Box>
        </Section>

        {(data.terms || data.exclusions) && (
          <Section index={deliverables.length ? '04' : '03'} title="Condições" accent={accent}>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: compact || !(data.terms && data.exclusions) ? '1fr' : 'repeat(2, minmax(0, 1fr))' } }}>
              {data.terms && (
                <Box sx={{ p: 2.25, borderRadius: '10px', border: `1px solid ${tokens.border}` }}>
                  <Typography sx={{ fontWeight: 650, fontSize: 14 }}>Pagamento</Typography>
                  <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.65, mt: 0.5, fontSize: 15 }}>{data.terms}</Typography>
                </Box>
              )}
              {data.exclusions && (
                <Box sx={{ p: 2.25, borderRadius: '10px', bgcolor: tokens.subtle, border: `1px solid ${tokens.border}` }}>
                  <Typography sx={{ fontWeight: 650, fontSize: 14 }}>Não está incluído</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', mt: 0.5, lineHeight: 1.6 }}>{data.exclusions}</Typography>
                </Box>
              )}
            </Box>
          </Section>
        )}

        {footer}

        {/* Rodapé: contato de quem enviou */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: { xs: 6, sm: 8 }, pt: 3, borderTop: `1px solid ${tokens.border}`, justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontWeight: 650, fontSize: 14 }}>{org.name}</Typography>
            {(org.document || org.city) && (
              <Typography variant="caption" sx={{ display: 'block', color: tokens.textTertiary }}>
                {[org.document && formatDocument(org.document), org.city].filter(Boolean).join(' · ')}
              </Typography>
            )}
          </Box>
          <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2.5, rowGap: 0.75 }}>
            {contact.map((c) => (
              <Stack key={c.text} direction="row" spacing={0.75} sx={{ alignItems: 'center', color: tokens.textSecondary, '& svg': { width: 14, height: 14 } }}>
                {c.icon}
                <Typography variant="body2">{c.text}</Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
