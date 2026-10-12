import { useEffect } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowLeft, Printer } from 'lucide-react';
import { BrandLoader, ErrorState } from '@/components/common';
import { ProposalDocument } from '@/components/ProposalDocument';
import { useCurrentOrganization } from '@/features/organizations/OrganizationProvider';
import { useAcceptance, useProposal } from '@/hooks/queries';
import { friendlyError } from '@/lib/errors';
import { tokens } from '@/theme/tokens';

/** A proposta como o cliente vê, em tela cheia. Também é a página do PDF (imprimir → salvar como PDF). */
export function ProposalPreviewPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const org = useCurrentOrganization();
  const proposal = useProposal(id);
  const p = proposal.data;
  const acceptance = useAcceptance(id, p?.status === 'accepted');
  const autoPrint = params.get('imprimir') === '1';

  useEffect(() => {
    if (p) document.title = `${p.code} · ${p.title}`;
    return () => {
      document.title = 'FechaProposta — propostas que viram sim';
    };
  }, [p]);

  useEffect(() => {
    if (!autoPrint || !p) return;
    // Espera fontes e logo carregarem antes de abrir a impressão.
    const timer = setTimeout(() => document.fonts.ready.then(() => window.print()), 500);
    return () => clearTimeout(timer);
  }, [autoPrint, p]);

  if (proposal.error) return <Box sx={{ p: 3 }}><ErrorState message={friendlyError(proposal.error, 'Não foi possível abrir a proposta.')} /></Box>;
  if (!p) return <BrandLoader />;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: tokens.muted, '@media print': { bgcolor: '#fff' } }}>
      <Stack
        direction="row"
        className="no-print"
        sx={{ position: 'sticky', top: 0, zIndex: 5, alignItems: 'center', gap: 1, px: { xs: 1, sm: 3 }, py: 1.25, bgcolor: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${tokens.border}` }}
      >
        <Button component={RouterLink} to={`/painel/propostas/${p.id}`} startIcon={<ArrowLeft />} color="inherit">Voltar</Button>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
          Prévia exata do que o cliente vê. Para PDF, escolha “Salvar como PDF” na impressão.
        </Typography>
        <Box sx={{ flexGrow: { xs: 1, sm: 0 } }} />
        <Button variant="contained" startIcon={<Printer />} onClick={() => window.print()}>Imprimir / PDF</Button>
      </Stack>
      <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 0, sm: 3 }, py: { xs: 0, sm: 5 } }} className="print-plain">
        <ProposalDocument
          data={{ ...p, client: p.client ? { name: p.client.name, company: p.client.company } : null, organization: org }}
          selected={acceptance.data?.selected_items ?? []}
        />
      </Box>
    </Box>
  );
}
