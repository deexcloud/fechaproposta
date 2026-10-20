import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Card, Skeleton, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import { BadgeCheck, Download, MessageCircle, ShieldCheck } from 'lucide-react';
import { BrandMark, Mono } from '@/components/common';
import { ProposalDocument } from '@/components/ProposalDocument';
import { textOn } from '@/lib/color';
import { dateTime, longDate, money, relativeTime } from '@/lib/format';
import { computeTotals, whatsappUrl } from '@/lib/proposal';
import { getPublicMediaUrl } from '@/lib/supabase';
import { getPublicProposal, registerView } from '@/services/publicProposal';
import type { PublicProposal } from '@/types';
import { AcceptDialog, ChangesDialog, DeclineDialog } from './PublicDialogs';
import { AcceptedCelebration, DecisionPanel, MobileDecisionBar, PublicHeader } from './Decision';
import { palettes, signatureFont, tokens } from '@/theme/tokens';

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

/**
 * Selo discreto do FechaProposta: quem recebe proposta muitas vezes também vende serviço.
 * `pitch` é a versão logo depois do aceite, com convite para criar as próprias.
 */
function MadeWith({ pitch, sx }: { pitch?: boolean; sx?: SxProps<Theme> }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      className="no-print"
      sx={[{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 0.75, rowGap: 0.5, mt: 2, textAlign: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {pitch ? 'Também vende serviço? Crie propostas assim com' : 'Proposta enviada com'}
      <Box component="a" href={`/?ref=${pitch ? 'aceite' : 'proposta'}`} target="_blank" rel="noopener" aria-label="FechaProposta (abre em nova aba)" sx={{ color: 'inherit', display: 'inline-flex', minHeight: 24, alignItems: 'center' }}>
        <BrandMark size="small" />
      </Box>
    </Typography>
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
              <Typography sx={{ mt: 1, fontFamily: signatureFont, fontStyle: 'italic', fontSize: 30 }}>{a.signer_name}</Typography>
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
    document.title = p ? `${p.title} · ${p.organization.name}` : 'Proposta · FechaProposta';
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
  const brandBg = org.brand_color ?? palettes.light.primary;
  const brand = { bg: brandBg, fg: textOn(brandBg) };
  const logo = getPublicMediaUrl(org.logo_path);
  const clientName = p.client?.name ?? '';
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
    <Box sx={{ minHeight: '100dvh', bgcolor: tokens.background, pb: { xs: open ? 17 : 4, md: 8 }, '@media print': { bgcolor: '#fff', pb: 0 } }}>
      <PublicHeader orgName={org.name} logo={logo} brand={brand} contactUrl={contact} />

      <Box component="main" sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 0, sm: 3 }, pt: { xs: 0, sm: 4 }, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 340px' }, alignItems: 'start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ px: { xs: 2, sm: 0 }, pt: { xs: 2, sm: 0 } }} className="no-print">
            {celebrate && p.acceptance && (
              <>
                <AcceptedCelebration name={p.acceptance.signer_name} orgName={org.name} nextStep={p.next_step} brand={brand} />
                <MadeWith pitch sx={{ mt: -1, mb: 3 }} />
              </>
            )}
            {!celebrate && <StateBanner p={p} contact={contact} />}
          </Box>
          <ProposalDocument data={p} selectable={open} selected={p.acceptance?.selected_items ?? selected} onToggleOptional={toggle} />
          {/* No computador o selo fica embaixo do painel lateral. */}
          <MadeWith sx={{ display: { md: 'none' }, pb: 1 }} />
        </Box>

        <Box className="no-print" sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 88 }}>
          {open ? (
            <DecisionPanel
              orgName={org.name}
              base={totals.total}
              extras={totals.withSelected - totals.total}
              extrasCount={selected.length}
              total={totals.withSelected}
              validUntil={p.valid_until}
              brand={brand}
              contactUrl={contact}
              onAccept={() => setDialog('accept')}
              onChanges={() => setDialog('changes')}
              onDecline={() => setDialog('decline')}
            />
          ) : (
            <Card sx={{ p: 2.5, borderRadius: '20px' }}>
              <Typography variant="body2" color="text.secondary">{p.status === 'accepted' ? 'Total aceito' : 'Total'}</Typography>
              <Typography sx={{ fontWeight: 750, fontSize: 30, letterSpacing: '-0.03em', fontFeatureSettings: '"tnum"' }}>{money(total)}</Typography>
              <Button fullWidth sx={{ mt: 2 }} variant="outlined" startIcon={<Download />} onClick={() => window.print()}>Baixar PDF</Button>
            </Card>
          )}
          <MadeWith />
        </Box>
      </Box>

      {open && (
        <MobileDecisionBar
          total={totals.withSelected}
          extrasCount={selected.length}
          validUntil={p.valid_until}
          brand={brand}
          onAccept={() => setDialog('accept')}
          onChanges={() => setDialog('changes')}
          onDecline={() => setDialog('decline')}
        />
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
