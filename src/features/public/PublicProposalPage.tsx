import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Card, Skeleton, Stack, Typography } from '@mui/material';
import { BadgeCheck, CalendarClock, Download, MessageCircle, MessageSquareText, PartyPopper, ShieldCheck } from 'lucide-react';
import { BrandMark, Mono } from '@/components/common';
import { ProposalDocument } from '@/components/ProposalDocument';
import { textOn } from '@/lib/color';
import { dateTime, daysUntil, firstName, longDate, money, relativeTime } from '@/lib/format';
import { computeTotals, whatsappUrl } from '@/lib/proposal';
import { getPublicMediaUrl } from '@/lib/supabase';
import { getPublicProposal, registerView } from '@/services/publicProposal';
import type { PublicProposal } from '@/types';
import { AcceptDialog, ChangesDialog, DeclineDialog } from './PublicDialogs';
import { displayFont, tokens } from '@/theme/tokens';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

/** Conta a abertura uma vez por sessão do navegador. */
function useRegisterView(token: string, open: boolean) {
  useEffect(() => {
    if (!open) return;
    const key = `fp-viewed:${token}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* sem armazenamento: conta mesmo assim */
    }
    registerView(token).catch(() => undefined);
  }, [token, open]);
}

function NotFound() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3, textAlign: 'center' }}>
      <Stack spacing={2} sx={{ alignItems: 'center', maxWidth: 420 }}>
        <Typography variant="h2">Não encontramos esta proposta</Typography>
        <Typography color="text.secondary">
          O link pode estar incompleto ou a proposta foi retirada por quem enviou. Confira a mensagem que você recebeu ou fale com a empresa.
        </Typography>
        <Box sx={{ pt: 3, opacity: 0.6 }}><BrandMark size="small" /></Box>
      </Stack>
    </Box>
  );
}

function StateBanner({ p, contact }: { p: PublicProposal; contact: string | null }) {
  if (p.status === 'accepted' && p.acceptance) {
    const a = p.acceptance;
    return (
      <Card className="fp-fade-up" sx={{ p: { xs: 2.5, sm: 3 }, mb: 3, borderColor: tokens.success, bgcolor: tokens.successSoft }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: tokens.success, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}><BadgeCheck size={22} /></Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 18 }}>Proposta aceita</Typography>
            <Typography variant="body2" sx={{ mt: 0.25 }}>
              {a.signature_mode === 'manual' ? `Aprovada por ${a.signer_name}` : `Assinada por ${a.signer_name}`} em {dateTime(a.accepted_at)} · {money(a.total)}
            </Typography>
            {a.signature_mode === 'drawn' && a.signature_data && (
              <Box component="img" src={a.signature_data} alt={`Assinatura de ${a.signer_name}`} sx={{ mt: 1.5, maxHeight: 70, maxWidth: '100%', bgcolor: '#fff', borderRadius: '8px', p: 1 }} />
            )}
            {a.signature_mode === 'typed' && (
              <Typography sx={{ mt: 1, fontFamily: displayFont, fontStyle: 'italic', fontSize: 30 }}>{a.signer_name}</Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 1 }}>
              <ShieldCheck size={12} /> Código de verificação: <Mono>{a.content_hash.slice(0, 20)}</Mono>
            </Typography>
          </Box>
        </Stack>
      </Card>
    );
  }
  if (p.status === 'declined') {
    return (
      <Card sx={{ p: 2.5, mb: 3, bgcolor: tokens.muted, borderColor: 'transparent' }}>
        <Typography sx={{ fontWeight: 650 }}>Esta proposta foi recusada {relativeTime(p.declined_at)}.</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Mudou de ideia? Fale com {p.organization.name} para receber uma nova versão.</Typography>
        {contact && <Button sx={{ mt: 1.5 }} variant="outlined" startIcon={<MessageCircle />} href={contact} target="_blank" rel="noopener">Falar no WhatsApp</Button>}
      </Card>
    );
  }
  if (p.status === 'expired') {
    return (
      <Card sx={{ p: 2.5, mb: 3, bgcolor: tokens.warningSoft, borderColor: 'transparent' }}>
        <Typography sx={{ fontWeight: 650 }}>Esta proposta venceu em {longDate(p.valid_until)}.</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Ainda tem interesse? Peça para {p.organization.name} renovar a validade. O link continua o mesmo.</Typography>
        {contact && <Button sx={{ mt: 1.5 }} variant="contained" startIcon={<MessageCircle />} href={contact} target="_blank" rel="noopener">Pedir nova data</Button>}
      </Card>
    );
  }
  if (p.status === 'negotiating' && p.messages?.length) {
    const lastMessage = p.messages[p.messages.length - 1];
    return (
      <Card sx={{ p: 2.5, mb: 3, bgcolor: tokens.violetSoft, borderColor: 'transparent' }}>
        <Typography sx={{ fontWeight: 650 }}>Seu pedido de ajuste foi enviado</Typography>
        <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>“{lastMessage.message}”</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          {relativeTime(lastMessage.created_at)} · {p.organization.name} pode atualizar esta proposta no mesmo link. Você ainda pode aceitar como está.
        </Typography>
      </Card>
    );
  }
  return null;
}

export function PublicProposalPage() {
  const { token = '' } = useParams();
  const valid = UUID.test(token);
  useNoIndex();

  const query = useQuery({
    queryKey: ['public-proposal', token],
    queryFn: () => getPublicProposal(token),
    enabled: valid,
    refetchOnWindowFocus: true,
  });
  const p = query.data;
  const open = Boolean(p && ['sent', 'viewed', 'negotiating'].includes(p.status));
  useRegisterView(token, open);

  const [selected, setSelected] = useState<string[]>([]);
  const [dialog, setDialog] = useState<null | 'accept' | 'changes' | 'decline'>(null);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (p) document.title = `${p.title} · ${p.organization.name}`;
  }, [p]);

  const totals = useMemo(() => (p ? computeTotals(p.items, p.discount, selected, (item) => item.id) : null), [p, selected]);

  if (!valid) return <NotFound />;
  if (query.isPending) {
    return (
      <Box sx={{ maxWidth: 860, mx: 'auto', p: 3 }} role="status" aria-label="Carregando proposta">
        <Skeleton variant="rounded" height={64} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={480} />
      </Box>
    );
  }
  if (query.isError) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3, textAlign: 'center' }}>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="h2">Não conseguimos carregar</Typography>
          <Typography color="text.secondary">Confira sua conexão com a internet e tente de novo.</Typography>
          <Button variant="contained" onClick={() => query.refetch()}>Tentar de novo</Button>
        </Stack>
      </Box>
    );
  }
  if (!p || !totals) return <NotFound />;

  const org = p.organization;
  const brandBg = org.brand_color ?? tokens.ink;
  const brand = { bg: brandBg, fg: textOn(brandBg) };
  const logo = getPublicMediaUrl(org.logo_path);
  const clientName = p.client?.name ?? '';
  const left = daysUntil(p.valid_until);
  const contact = org.whatsapp
    ? whatsappUrl(`Olá! Recebi a proposta "${p.title}" (${p.code}) e tenho uma dúvida.`, org.whatsapp)
    : null;
  const total = p.status === 'accepted' && p.acceptance ? p.acceptance.total : totals.withSelected;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const afterChange = async () => {
    setDialog(null);
    await query.refetch();
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: tokens.muted, pb: { xs: open ? 16 : 4, md: 6 }, '@media print': { bgcolor: '#fff', pb: 0 } }}>
      {/* Topo com a marca de quem enviou */}
      <Box className="no-print" sx={{ bgcolor: '#fff', borderBottom: `1px solid ${tokens.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <Stack direction="row" sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 2, sm: 3 }, height: 60, alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            {logo ? (
              <Box component="img" src={logo} alt={org.name} sx={{ maxHeight: 34, maxWidth: 140, objectFit: 'contain' }} />
            ) : (
              <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: brand.bg, color: brand.fg, display: 'grid', placeItems: 'center', fontWeight: 700 }}>{org.name.charAt(0).toUpperCase()}</Box>
            )}
            {!logo && <Typography noWrap sx={{ fontWeight: 650 }}>{org.name}</Typography>}
          </Stack>
          <Stack direction="row" spacing={1}>
            {contact && (
              <Button size="small" variant="outlined" startIcon={<MessageCircle />} href={contact} target="_blank" rel="noopener">
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Tirar dúvida</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>WhatsApp</Box>
              </Button>
            )}
            <Button size="small" variant="outlined" startIcon={<Download />} onClick={() => window.print()} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>PDF</Button>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 0, sm: 3 }, pt: { xs: 0, sm: 4 }, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' }, alignItems: 'start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ px: { xs: 2, sm: 0 }, pt: { xs: 2, sm: 0 } }} className="no-print">
            {celebrate && (
              <Card className="fp-fade-up" sx={{ p: 2.5, mb: 2, bgcolor: tokens.ink, color: '#fff', borderColor: tokens.ink }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <PartyPopper color={tokens.lime} />
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>Tudo certo, {firstName(p.acceptance?.signer_name) || 'obrigado'}!</Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.75)' }}>{org.name} já foi avisado(a). Você pode baixar a proposta assinada em PDF.</Typography>
                  </Box>
                </Stack>
              </Card>
            )}
            <StateBanner p={p} contact={contact} />
          </Box>
          <ProposalDocument data={p} selectable={open} selected={p.acceptance?.selected_items ?? selected} onToggleOptional={toggle} />
        </Box>

        {/* Decisão (computador) */}
        <Box className="no-print" sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 84 }}>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="body2" color="text.secondary">{p.status === 'accepted' ? 'Total aceito' : 'Total'}</Typography>
            <Typography sx={{ fontWeight: 750, fontSize: 30, letterSpacing: '-0.03em', fontFeatureSettings: '"tnum"' }}>{money(total)}</Typography>
            {totals.optional > 0 && open && (
              <Typography variant="caption" color="text.secondary">
                {selected.length ? `Inclui ${selected.length} opcional${selected.length > 1 ? 'is' : ''}` : 'Opcionais disponíveis abaixo dos valores'}
              </Typography>
            )}
            {open && (
              <>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 1.5, color: left <= 3 ? tokens.error : tokens.textSecondary }}>
                  <CalendarClock size={15} />
                  <Typography variant="body2" sx={{ fontWeight: left <= 3 ? 650 : 400 }}>
                    {left === 0 ? 'Vence hoje' : left === 1 ? 'Vence amanhã' : `Válida por mais ${left} dias`}
                  </Typography>
                </Stack>
                <Stack spacing={1} sx={{ mt: 2.5 }}>
                  <Button size="large" variant="contained" onClick={() => setDialog('accept')} sx={{ bgcolor: brand.bg, color: brand.fg, minHeight: 50, fontSize: 15.5, '&:hover': { bgcolor: brand.bg, filter: 'brightness(0.92)' } }}>
                    Aceitar proposta
                  </Button>
                  <Button size="large" variant="outlined" startIcon={<MessageSquareText />} onClick={() => setDialog('changes')}>Pedir ajuste</Button>
                  <Button size="small" color="inherit" onClick={() => setDialog('decline')} sx={{ color: tokens.textTertiary }}>Recusar</Button>
                </Stack>
              </>
            )}
            {!open && (
              <Button fullWidth sx={{ mt: 2 }} variant="outlined" startIcon={<Download />} onClick={() => window.print()}>Baixar PDF</Button>
            )}
          </Card>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 2, justifyContent: 'center' }}>
            Proposta enviada com <Box component="a" href="/" target="_blank" sx={{ color: 'inherit', display: 'inline-flex' }}><BrandMark size="small" /></Box>
          </Typography>
        </Box>
      </Box>

      {/* Decisão (celular): barra fixa com o total */}
      {open && (
        <Box className="no-print" sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, bgcolor: '#fff', borderTop: `1px solid ${tokens.border}`, boxShadow: '0 -8px 24px -12px rgba(20,26,22,.18)', px: 2, pt: 1.25, pb: 'calc(12px + env(safe-area-inset-bottom))' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                {left <= 3 ? (left === 0 ? 'Vence hoje' : `Vence em ${left} ${left === 1 ? 'dia' : 'dias'}`) : 'Total'}
              </Typography>
              <Typography sx={{ fontWeight: 750, fontSize: 20, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }} noWrap>{money(total)}</Typography>
            </Box>
            <Button size="large" variant="contained" onClick={() => setDialog('accept')} sx={{ bgcolor: brand.bg, color: brand.fg, minHeight: 48, px: 3, '&:hover': { bgcolor: brand.bg } }}>
              Aceitar
            </Button>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'center', gap: 2, mt: 0.5 }}>
            <Button size="small" color="inherit" onClick={() => setDialog('changes')} sx={{ color: tokens.textSecondary }}>Pedir ajuste</Button>
            <Button size="small" color="inherit" onClick={() => setDialog('decline')} sx={{ color: tokens.textTertiary }}>Recusar</Button>
          </Stack>
        </Box>
      )}

      {dialog === 'accept' && (
        <AcceptDialog
          open
          onClose={() => setDialog(null)}
          token={token}
          title={p.title}
          total={totals.withSelected}
          selectedItems={selected}
          defaultName={clientName}
          orgName={org.name}
          brand={brand}
          onDone={async () => {
            await afterChange();
            setCelebrate(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
      {dialog === 'changes' && (
        <ChangesDialog open onClose={() => setDialog(null)} token={token} defaultName={clientName} orgName={org.name} onDone={async () => { await afterChange(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      )}
      {dialog === 'decline' && <DeclineDialog open onClose={() => setDialog(null)} token={token} defaultName={clientName} onDone={afterChange} />}
    </Box>
  );
}
