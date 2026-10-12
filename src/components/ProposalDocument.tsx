import type { ReactNode } from 'react';
import { Box, Checkbox, Stack, Typography } from '@mui/material';
import { CalendarDays, Clock3, Globe, Mail, MessageCircle, Wallet } from 'lucide-react';
import { computeTotals, itemTotal } from '@/lib/proposal';
import { accentOnWhite, tint } from '@/lib/color';
import { formatDocument, formatPhone, longDate, money } from '@/lib/format';
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

function Section({ kicker, title, children, accent }: { kicker: string; title: string; children: ReactNode; accent: string }) {
  return (
    <Box component="section" sx={{ mt: { xs: 5, sm: 6 }, breakInside: 'avoid-page' }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: accent, textTransform: 'uppercase' }}>{kicker}</Typography>
      <Typography component="h2" sx={{ fontFamily: displayFont, fontSize: { xs: 26, sm: 30 }, lineHeight: 1.15, mt: 0.5, mb: 2, letterSpacing: '-0.01em' }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
      <Box sx={{ mt: 0.25, color: tokens.textTertiary, '& svg': { width: 16, height: 16 } }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: tokens.textTertiary, textTransform: 'uppercase' }}>{label}</Typography>
        <Typography sx={{ fontWeight: 600, fontSize: 15, mt: 0.25 }}>{value}</Typography>
      </Box>
    </Stack>
  );
}

function ItemRow({ item, right, control }: { item: ProposalItem; right: ReactNode; control?: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 1.75, borderBottom: `1px solid ${tokens.border}`, alignItems: 'flex-start' }}>
      {control}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{item.name || 'Item sem nome'}</Typography>
        {item.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, whiteSpace: 'pre-line' }}>{item.description}</Typography>}
        <Typography variant="caption" sx={{ color: tokens.textTertiary }}>
          {Number(item.quantity).toLocaleString('pt-BR')} × {money(item.unit_price)}
          {item.unit && item.unit !== 'un' ? ` por ${item.unit}` : ''}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>{right}</Box>
    </Stack>
  );
}

/** A proposta como o cliente vê. Mesma peça na prévia, no link público e no PDF. */
export function ProposalDocument({ data, selectable, selected = [], onToggleOptional, compact, footer }: ProposalDocumentProps) {
  const org = data.organization;
  const accent = accentOnWhite(org.brand_color);
  const soft = tint(org.brand_color ?? '#121915', 0.93);
  const logo = getPublicMediaUrl(org.logo_path);
  const fixed = data.items.filter((i) => !i.is_optional);
  const optional = data.items.filter((i) => i.is_optional);
  const optionalId = (item: ProposalItem & { id?: string }) => item.id ?? String(data.items.indexOf(item));
  const totals = computeTotals(data.items, data.discount, selected, optionalId);
  const deliverables = data.deliverables.filter((d) => d.trim());
  const contact = [
    org.email && { icon: <Mail />, text: org.email },
    org.whatsapp && { icon: <MessageCircle />, text: formatPhone(org.whatsapp) },
    org.website && { icon: <Globe />, text: org.website.replace(/^https?:\/\//, '') },
  ].filter(Boolean) as { icon: ReactNode; text: string }[];

  return (
    <Box
      component="article"
      className="print-plain"
      sx={{
        bgcolor: '#fff',
        color: tokens.textPrimary,
        borderRadius: compact ? '12px' : { xs: 0, sm: '18px' },
        border: compact ? `1px solid ${tokens.border}` : { xs: 'none', sm: `1px solid ${tokens.border}` },
        boxShadow: compact ? 'none' : { xs: 'none', sm: '0 1px 2px rgba(20,26,22,.04), 0 24px 48px -24px rgba(20,26,22,.12)' },
        overflow: 'hidden',
        fontSize: compact ? 13 : 15,
        ...(compact && { zoom: 0.82 }),
      }}
    >
      <Box sx={{ height: 5, bgcolor: org.brand_color ?? tokens.ink }} />
      <Box sx={{ px: { xs: 2.5, sm: 6 }, py: { xs: 3.5, sm: 5.5 } }}>
        {/* Cabeçalho: quem envia */}
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            {logo ? (
              <Box component="img" src={logo} alt={`Logo de ${org.name}`} sx={{ maxHeight: 44, maxWidth: 160, objectFit: 'contain' }} />
            ) : (
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: soft, color: accent, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18 }}>
                {org.name.charAt(0).toUpperCase()}
              </Box>
            )}
            {!logo && <Typography sx={{ fontWeight: 650, fontSize: 16 }} noWrap>{org.name}</Typography>}
          </Stack>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: tokens.textTertiary, textTransform: 'uppercase' }}>Proposta</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: 14, fontFeatureSettings: '"tnum"' }}>{data.code}</Typography>
          </Box>
        </Stack>

        {/* Abertura */}
        <Box sx={{ mt: { xs: 5, sm: 7 } }}>
          {data.client && (
            <Typography sx={{ fontSize: 13, color: tokens.textSecondary }}>
              Preparada para <Box component="strong" sx={{ color: tokens.textPrimary }}>{data.client.name}</Box>
              {data.client.company ? ` · ${data.client.company}` : ''}
            </Typography>
          )}
          <Typography component="h1" sx={{ fontFamily: displayFont, fontSize: { xs: 38, sm: 52 }, lineHeight: 1.04, letterSpacing: '-0.02em', mt: 1.25 }}>
            {data.title || 'Título da proposta'}
          </Typography>
          {data.summary && (
            <Typography sx={{ mt: 2.5, fontSize: { xs: 16, sm: 17 }, lineHeight: 1.65, color: tokens.textSecondary, whiteSpace: 'pre-line', maxWidth: 640 }}>
              {data.summary}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            mt: 4,
            p: 2.5,
            borderRadius: '14px',
            bgcolor: soft,
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
            '& > :first-of-type': { gridColumn: { xs: '1 / -1', sm: 'auto' } },
          }}
        >
          <Meta icon={<Wallet />} label="Investimento" value={money(totals.total)} />
          <Meta icon={<Clock3 />} label="Prazo" value={data.timeline || 'A combinar'} />
          <Meta icon={<CalendarDays />} label="Válida até" value={longDate(data.valid_until)} />
        </Box>

        {deliverables.length > 0 && (
          <Section kicker="Escopo" title="O que será feito" accent={accent}>
            <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 1 }}>
              {deliverables.map((d, i) => (
                <Stack component="li" key={i} direction="row" spacing={2} sx={{ alignItems: 'baseline', py: 1, borderBottom: `1px dashed ${tokens.border}` }}>
                  <Typography sx={{ color: accent, fontWeight: 700, fontSize: 13, fontFeatureSettings: '"tnum"', minWidth: 22 }}>
                    {String(i + 1).padStart(2, '0')}
                  </Typography>
                  <Typography sx={{ fontSize: 15.5 }}>{d}</Typography>
                </Stack>
              ))}
            </Box>
          </Section>
        )}

        <Section kicker="Investimento" title="Valores" accent={accent}>
          {fixed.map((item, i) => (
            <ItemRow key={item.id ?? i} item={item} right={<Typography sx={{ fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{money(itemTotal(item))}</Typography>} />
          ))}
          <Stack spacing={0.75} sx={{ mt: 2, ml: 'auto', maxWidth: 320 }}>
            {totals.discount > 0 && (
              <>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>{money(totals.subtotal)}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Desconto</Typography>
                  <Typography variant="body2" sx={{ color: tokens.success, fontFeatureSettings: '"tnum"' }}>− {money(totals.discount)}</Typography>
                </Stack>
              </>
            )}
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography sx={{ fontWeight: 600 }}>Total</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>{money(totals.total)}</Typography>
            </Stack>
          </Stack>

          {optional.length > 0 && (
            <Box sx={{ mt: 4, p: { xs: 2, sm: 2.5 }, borderRadius: '14px', border: `1px dashed ${tokens.borderStrong}` }}>
              <Typography sx={{ fontWeight: 650 }}>Opcionais</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectable ? 'Marque o que quiser incluir. O total é atualizado na hora.' : 'O cliente pode escolher incluir estes itens ao aceitar.'}
              </Typography>
              {optional.map((item, i) => {
                const id = optionalId(item);
                const checked = selected.includes(id);
                return (
                  <ItemRow
                    key={item.id ?? i}
                    item={item}
                    control={
                      selectable ? (
                        <Checkbox
                          checked={checked}
                          onChange={() => onToggleOptional?.(id)}
                          slotProps={{ input: { 'aria-label': `Incluir ${item.name}` } }}
                          sx={{ p: 0.5, mt: -0.5, ml: -0.5 }}
                        />
                      ) : undefined
                    }
                    right={<Typography sx={{ fontWeight: 600, color: checked ? tokens.textPrimary : tokens.textSecondary, fontFeatureSettings: '"tnum"' }}>+ {money(itemTotal(item))}</Typography>}
                  />
                );
              })}
              {selectable && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 2 }}>
                  <Typography sx={{ fontWeight: 600 }}>Total com os opcionais escolhidos</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: 20, fontFeatureSettings: '"tnum"' }}>{money(totals.withSelected)}</Typography>
                </Stack>
              )}
            </Box>
          )}
        </Section>

        {(data.terms || data.exclusions) && (
          <Section kicker="Combinados" title="Condições" accent={accent}>
            {data.terms && <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>{data.terms}</Typography>}
            {data.exclusions && (
              <Box sx={{ mt: 2.5, p: 2, borderRadius: '12px', bgcolor: tokens.muted }}>
                <Typography sx={{ fontWeight: 650, fontSize: 14 }}>Não está incluído</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', mt: 0.5 }}>{data.exclusions}</Typography>
              </Box>
            )}
          </Section>
        )}

        {data.next_step && (
          <Box sx={{ mt: 5, p: 2.5, borderRadius: '14px', border: `1px solid ${tokens.border}`, borderLeft: `4px solid ${accent}`, breakInside: 'avoid-page' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: accent, textTransform: 'uppercase' }}>Depois do aceite</Typography>
            <Typography sx={{ mt: 0.75, lineHeight: 1.65 }}>{data.next_step}</Typography>
          </Box>
        )}

        {footer}

        {/* Rodapé: contato de quem enviou */}
        <Box sx={{ mt: 6, pt: 3, borderTop: `1px solid ${tokens.border}` }}>
          <Typography sx={{ fontWeight: 650, fontSize: 14 }}>{org.name}</Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2.5, rowGap: 0.75, mt: 1 }}>
            {contact.map((c) => (
              <Stack key={c.text} direction="row" spacing={0.75} sx={{ alignItems: 'center', color: tokens.textSecondary, '& svg': { width: 14, height: 14 } }}>
                {c.icon}
                <Typography variant="body2">{c.text}</Typography>
              </Stack>
            ))}
          </Stack>
          {(org.document || org.city) && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: tokens.textTertiary }}>
              {[org.document && formatDocument(org.document), org.city].filter(Boolean).join(' · ')}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
