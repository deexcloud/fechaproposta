import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, Stack, Typography } from '@mui/material';
import { ArrowRight, Sparkles } from 'lucide-react';
import { BrandMark } from '@/components/common';
import { ProposalDocument } from '@/components/ProposalDocument';
import { textOn } from '@/lib/color';
import { computeTotals } from '@/lib/proposal';
import { TRIAL_DAYS } from '@/lib/pricing';
import { AcceptedCelebration, DecisionPanel, MobileDecisionBar, PublicHeader } from '@/features/public/Decision';
import { AcceptDialog, ChangesDialog, DeclineDialog } from '@/features/public/PublicDialogs';
import { demoProposal } from './demo';
import { palettes, tokens } from '@/theme/tokens';

type Outcome = { kind: 'accepted'; name: string } | { kind: 'changes' } | { kind: 'declined' };

/** Proposta de exemplo: a mesma experiência do cliente real, sem gravar nada. */
export function DemoProposalPage() {
  const data = useMemo(demoProposal, []);
  const [selected, setSelected] = useState<string[]>([]);
  const [dialog, setDialog] = useState<null | 'accept' | 'changes' | 'decline'>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const totals = computeTotals(data.items, data.discount, selected, (item, i) => item.id ?? i);
  const org = data.organization;
  const brand = { bg: org.brand_color ?? palettes.light.primary, fg: textOn(org.brand_color ?? palettes.light.primary) };
  const open = outcome?.kind !== 'accepted' && outcome?.kind !== 'declined';
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const finish = (next: Outcome) => {
    setDialog(null);
    setOutcome(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    document.title = 'Exemplo de proposta · FechaProposta';
  }, []);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: tokens.background, pb: { xs: open ? 17 : 4, md: 8 } }}>
      <Box sx={{ bgcolor: tokens.accentSoft, color: tokens.textPrimary, px: 2, py: 1, borderBottom: `1px solid ${tokens.border}` }}>
        <Stack direction="row" spacing={1.5} sx={{ maxWidth: 1200, mx: 'auto', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Sparkles size={15} color={tokens.primary} />
            <Typography variant="body2" noWrap>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Exemplo interativo: é assim que o seu cliente recebe a proposta. Teste os botões.</Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Exemplo interativo</Box>
            </Typography>
          </Stack>
          <Button component={RouterLink} to="/criar-conta" size="small" variant="contained" sx={{ flexShrink: 0 }}>
            Criar a minha
          </Button>
        </Stack>
      </Box>
      <PublicHeader orgName={org.name} logo={null} brand={brand} contactUrl={null} />

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 0, sm: 3 }, pt: { xs: 0, sm: 4 }, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 340px' }, alignItems: 'start' }}>
        <Box sx={{ minWidth: 0 }}>
          {outcome && (
            <Box sx={{ px: { xs: 2, sm: 0 }, pt: { xs: 2, sm: 0 } }}>
              {outcome.kind === 'accepted' && <AcceptedCelebration name={outcome.name} orgName={org.name} nextStep={data.next_step} brand={brand} />}
              {outcome.kind === 'changes' && (
                <Alert severity="info" sx={{ mb: 2, bgcolor: tokens.violetSoft, borderColor: 'transparent' }}>
                  Pedido de ajuste enviado. No painel, quem enviou vê a mensagem na hora e ajusta no mesmo link.
                </Alert>
              )}
              {outcome.kind === 'declined' && (
                <Alert severity="info" sx={{ mb: 2 }}>Recusa registrada com o motivo. Quem enviou fica sabendo e pode mandar uma nova versão.</Alert>
              )}
              <Card sx={{ p: { xs: 2.5, sm: 3 }, mb: 3, borderColor: tokens.primary, borderWidth: 1.5 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 18 }}>Viu como é simples para o seu cliente?</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Monte a sua com a sua marca e saiba quando ele abrir. {TRIAL_DAYS} dias grátis, sem cartão.
                    </Typography>
                  </Box>
                  <Button component={RouterLink} to="/criar-conta" variant="contained" endIcon={<ArrowRight />} sx={{ flexShrink: 0 }}>
                    Criar minha proposta
                  </Button>
                </Stack>
              </Card>
            </Box>
          )}
          <ProposalDocument data={data} selectable={open} selected={selected} onToggleOptional={toggle} />
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 88 }}>
          {open ? (
            <DecisionPanel
              orgName={org.name}
              base={totals.total}
              extras={totals.withSelected - totals.total}
              extrasCount={selected.length}
              total={totals.withSelected}
              validUntil={data.valid_until}
              brand={brand}
              contactUrl={null}
              onAccept={() => setDialog('accept')}
              onChanges={() => setDialog('changes')}
              onDecline={() => setDialog('decline')}
            />
          ) : (
            <Card sx={{ p: 2.5 }}>
              <BrandMark size="small" />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Crie propostas assim com a sua marca.</Typography>
              <Button component={RouterLink} to="/criar-conta" variant="contained" fullWidth endIcon={<ArrowRight />} sx={{ mt: 2 }}>
                Testar {TRIAL_DAYS} dias grátis
              </Button>
            </Card>
          )}
          {outcome && (
            <Button fullWidth size="small" color="inherit" onClick={() => { setOutcome(null); setSelected([]); }} sx={{ mt: 1.5, color: tokens.textTertiary }}>
              Recomeçar o exemplo
            </Button>
          )}
        </Box>
      </Box>

      {open && (
        <MobileDecisionBar
          total={totals.withSelected}
          extrasCount={selected.length}
          validUntil={data.valid_until}
          brand={brand}
          onAccept={() => setDialog('accept')}
          onChanges={() => setDialog('changes')}
          onDecline={() => setDialog('decline')}
        />
      )}

      {dialog === 'accept' && (
        <AcceptDialog
          open
          demo
          onClose={() => setDialog(null)}
          token="exemplo"
          title={data.title}
          total={totals.withSelected}
          selectedItems={selected}
          defaultName={data.client?.name ?? ''}
          orgName={org.name}
          brand={brand}
          onDone={(name) => finish({ kind: 'accepted', name })}
        />
      )}
      {dialog === 'changes' && (
        <ChangesDialog open demo onClose={() => setDialog(null)} token="exemplo" defaultName={data.client?.name ?? ''} orgName={org.name} onDone={() => finish({ kind: 'changes' })} />
      )}
      {dialog === 'decline' && (
        <DeclineDialog open demo onClose={() => setDialog(null)} token="exemplo" defaultName={data.client?.name ?? ''} onDone={() => finish({ kind: 'declined' })} />
      )}
    </Box>
  );
}
