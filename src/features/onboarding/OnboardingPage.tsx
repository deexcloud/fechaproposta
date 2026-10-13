import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Card, Stack, TextField, Typography } from '@mui/material';
import { ArrowRight } from 'lucide-react';
import { BrandLoader, BrandMark } from '@/components/common';
import { ProposalDocument } from '@/components/ProposalDocument';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOrganization } from '@/features/organizations/OrganizationProvider';
import { BrandColorPicker, LogoUploader } from '@/features/settings/BrandFields';
import { friendlyError } from '@/lib/errors';
import { addDays, onlyDigits, todayISO } from '@/lib/format';
import { TRIAL_DAYS } from '@/lib/pricing';
import { createOrganization, updateOrganization } from '@/services/organizations';
import type { Organization } from '@/types';
import { shadows, tokens } from '@/theme/tokens';

const nameSchema = z.object({ name: z.string().trim().min(2, 'Informe o nome da empresa.').max(80, 'Nome muito longo.') });

function Steps({ step }: { step: 1 | 2 }) {
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 3 }} aria-label={`Passo ${step} de 2`}>
      {[1, 2].map((s) => (
        <Box key={s} sx={{ height: 4, flex: 1, borderRadius: 2, bgcolor: s <= step ? tokens.primary : tokens.border }} />
      ))}
    </Stack>
  );
}

export function OnboardingPage() {
  const { user } = useAuth();
  const { organization, loading, applyOrganization, selectOrganization } = useOrganization();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const creatingAnother = params.get('nova') === '1';
  const [created, setCreated] = useState<Organization | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [whatsapp, setWhatsapp] = useState('');
  const [color, setColor] = useState<string | null>('#6243F0');
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState, watch } = useForm<{ name: string }>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: '' },
  });

  if (loading) return <BrandLoader />;
  if (organization && !creatingAnother && !created) return <Navigate to="/painel" replace />;

  const firstName = ((user?.user_metadata?.full_name as string | undefined) ?? '').split(' ')[0];

  const onCreate = handleSubmit(async ({ name }) => {
    setFormError(null);
    try {
      const org = await createOrganization(name);
      setCreated(org);
    } catch (e) {
      setFormError(friendlyError(e));
    }
  });

  const finish = async (skip = false) => {
    if (!created) return;
    setSaving(true);
    try {
      const digits = onlyDigits(whatsapp);
      const org = await updateOrganization(created.id, {
        ...(skip ? {} : { whatsapp: digits || null, brand_color: color, logo_path: logo }),
        onboarding_completed_at: new Date().toISOString(),
      });
      applyOrganization(org);
      selectOrganization(org.id);
      navigate('/painel', { replace: true });
    } catch (e) {
      setFormError(friendlyError(e));
      setSaving(false);
    }
  };

  const previewOrg = {
    name: created?.name ?? (watch('name') || 'Sua empresa'),
    email: created?.email ?? user?.email ?? null,
    whatsapp: onlyDigits(whatsapp) || null,
    website: null,
    document: null,
    city: null,
    logo_path: logo,
    brand_color: color,
  };

  return (
    <Box component="main" sx={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '520px 1fr' } }}>
      <Box sx={{ px: { xs: 2, sm: 5 }, py: { xs: 4, sm: 6 }, display: 'flex', flexDirection: 'column' }}>
        <BrandMark />
        <Box sx={{ my: 'auto', pt: 5, maxWidth: 420 }}>
          {!created ? (
            <Box component="form" onSubmit={onCreate} noValidate className="fp-fade-up">
              <Steps step={1} />
              <Typography variant="h1">{firstName ? `Boas-vindas, ${firstName}!` : 'Boas-vindas!'}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Qual o nome da sua empresa? Ele aparece no topo das propostas que você enviar.
              </Typography>
              <Stack spacing={2.5} sx={{ mt: 3 }}>
                {formError && <Alert severity="error">{formError}</Alert>}
                <TextField
                  label="Nome da empresa"
                  placeholder="Ex.: Estúdio Lume"
                  autoFocus
                  {...register('name')}
                  error={Boolean(formState.errors.name)}
                  helperText={formState.errors.name?.message ?? 'Pode ser seu nome, se você trabalha sozinho(a).'}
                />
                <Button type="submit" variant="contained" size="large" loading={formState.isSubmitting} endIcon={<ArrowRight />}>
                  Continuar
                </Button>
                {!creatingAnother && (
                  <Typography variant="caption" color="text.secondary">
                    Seu teste grátis de {TRIAL_DAYS} dias começa agora. Sem cartão.
                  </Typography>
                )}
              </Stack>
            </Box>
          ) : (
            <Box className="fp-fade-up">
              <Steps step={2} />
              <Typography variant="h1">Deixe com a sua cara</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Logo e cor aparecem na proposta do cliente. Dá para mudar depois em Configurações.
              </Typography>
              <Stack spacing={3} sx={{ mt: 3 }}>
                {formError && <Alert severity="error">{formError}</Alert>}
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Logo</Typography>
                  <LogoUploader orgId={created.id} value={logo} onChange={setLogo} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Cor da marca</Typography>
                  <BrandColorPicker value={color} onChange={setColor} />
                </Box>
                <TextField
                  label="WhatsApp para os clientes falarem com você"
                  placeholder="(11) 98888-7777"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  slotProps={{ htmlInput: { inputMode: 'tel' } }}
                  helperText="Opcional. Aparece como botão na proposta."
                />
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" size="large" loading={saving} onClick={() => finish(false)} endIcon={<ArrowRight />} sx={{ flexGrow: 1 }}>
                    Ir para o painel
                  </Button>
                  <Button size="large" color="inherit" disabled={saving} onClick={() => finish(true)}>Pular</Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </Box>
      </Box>

      {/* Prévia ao vivo de uma proposta com a marca escolhida */}
      <Box sx={{ display: { xs: 'none', lg: 'block' }, bgcolor: tokens.muted, borderLeft: `1px solid ${tokens.border}`, p: 6, overflow: 'hidden' }} aria-hidden>
        <Typography variant="overline" color="text.secondary">Assim seu cliente vai ver</Typography>
        <Card sx={{ mt: 2, maxWidth: 680, mx: 'auto', transform: 'rotate(-0.6deg)', boxShadow: shadows.xl, pointerEvents: 'none', borderRadius: '18px' }}>
          <ProposalDocument
            compact
            data={{
              code: 'FP-0001',
              title: 'Identidade visual completa',
              summary: 'Uma marca clara e consistente para a sua empresa ser reconhecida em todos os pontos de contato.',
              deliverables: ['Imersão e pesquisa', 'Logo e variações', 'Paleta e tipografia', 'Manual da marca'],
              timeline: '4 semanas',
              next_step: null,
              exclusions: null,
              terms: null,
              valid_until: addDays(todayISO(), 15),
              discount: 0,
              items: [
                { name: 'Criação da identidade', description: null, unit: 'projeto', quantity: 1, unit_price: 3800, is_optional: false },
                { name: 'Papelaria', description: null, unit: 'un', quantity: 1, unit_price: 900, is_optional: true },
              ],
              client: { name: 'Marina Costa', company: 'Café Aurora' },
              organization: previewOrg,
            }}
          />
        </Card>
      </Box>
    </Box>
  );
}
