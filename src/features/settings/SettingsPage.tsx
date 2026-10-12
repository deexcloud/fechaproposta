import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Card, InputAdornment, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { PageHeader, SectionCard } from '@/components/common';
import { useNotify } from '@/components/NotifyProvider';
import { ProposalDocument } from '@/components/ProposalDocument';
import { useCurrentOrganization, useOrganization } from '@/features/organizations/OrganizationProvider';
import { SubscriptionPanel } from '@/features/subscription/subscription';
import { TeamPanel } from '@/features/team/TeamPanel';
import { friendlyError } from '@/lib/errors';
import { addDays, formatDocument, formatPhone, onlyDigits, todayISO } from '@/lib/format';
import { removeMedia, updateOrganization } from '@/services/organizations';
import type { OrganizationUpdate } from '@/types';
import { BrandColorPicker, LogoUploader } from './BrandFields';
import { tokens } from '@/theme/tokens';

const TABS = [
  { value: 'empresa', label: 'Empresa' },
  { value: 'marca', label: 'Marca' },
  { value: 'propostas', label: 'Propostas' },
  { value: 'equipe', label: 'Equipe' },
  { value: 'assinatura', label: 'Assinatura' },
];

function useSaveOrganization() {
  const org = useCurrentOrganization();
  const { applyOrganization } = useOrganization();
  const notify = useNotify();
  return async (patch: OrganizationUpdate, message = 'Alterações salvas.') => {
    try {
      applyOrganization(await updateOrganization(org.id, patch));
      notify.success(message);
      return true;
    } catch (e) {
      notify.error(friendlyError(e));
      return false;
    }
  };
}

const companySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.').max(80),
  email: z.string().trim().max(254).refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'E-mail inválido.'),
  whatsapp: z.string().refine((v) => {
    const d = onlyDigits(v);
    return !d || (d.length >= 10 && d.length <= 13);
  }, 'Use DDD + número.'),
  website: z.string().max(200),
  document: z.string().refine((v) => [0, 11, 14].includes(onlyDigits(v).length), 'CPF (11) ou CNPJ (14 dígitos).'),
  city: z.string().max(80),
});

function CompanyTab({ readOnly }: { readOnly: boolean }) {
  const org = useCurrentOrganization();
  const save = useSaveOrganization();
  const { register, handleSubmit, formState, reset } = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: org.name,
      email: org.email ?? '',
      whatsapp: org.whatsapp ? formatPhone(org.whatsapp) : '',
      website: org.website ?? '',
      document: org.document ? formatDocument(org.document) : '',
      city: org.city ?? '',
    },
  });
  const submit = handleSubmit(async (v) => {
    const ok = await save({
      name: v.name.trim(),
      email: v.email.trim().toLowerCase() || null,
      whatsapp: onlyDigits(v.whatsapp) || null,
      website: v.website.trim() || null,
      document: onlyDigits(v.document) || null,
      city: v.city.trim() || null,
    });
    if (ok) reset(v);
  });
  const e = formState.errors;
  return (
    <SectionCard title="Dados da empresa" description="Aparecem no topo e no rodapé das propostas.">
      <Box component="form" onSubmit={submit} noValidate>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField label="Nome da empresa" disabled={readOnly} {...register('name')} error={Boolean(e.name)} helperText={e.name?.message} sx={{ gridColumn: { sm: '1 / -1' } }} />
          <TextField label="E-mail de contato" type="email" disabled={readOnly} {...register('email')} error={Boolean(e.email)} helperText={e.email?.message} />
          <TextField label="WhatsApp" disabled={readOnly} placeholder="(11) 98888-7777" {...register('whatsapp')} error={Boolean(e.whatsapp)} helperText={e.whatsapp?.message ?? 'Vira o botão "Tirar dúvida" na proposta.'} />
          <TextField label="Site ou Instagram" disabled={readOnly} placeholder="seusite.com.br" {...register('website')} />
          <TextField label="CNPJ ou CPF (opcional)" disabled={readOnly} {...register('document')} error={Boolean(e.document)} helperText={e.document?.message} />
          <TextField label="Cidade" disabled={readOnly} placeholder="São Paulo/SP" {...register('city')} />
        </Box>
        {!readOnly && (
          <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 2.5 }}>
            <Button type="submit" variant="contained" loading={formState.isSubmitting} disabled={!formState.isDirty}>Salvar</Button>
          </Stack>
        )}
      </Box>
    </SectionCard>
  );
}

function BrandTab({ readOnly }: { readOnly: boolean }) {
  const org = useCurrentOrganization();
  const save = useSaveOrganization();
  const [logo, setLogo] = useState(org.logo_path);
  const [color, setColor] = useState(org.brand_color);
  const [saving, setSaving] = useState(false);
  const dirty = logo !== org.logo_path || color !== org.brand_color;

  const submit = async () => {
    setSaving(true);
    const previous = org.logo_path;
    const ok = await save({ logo_path: logo, brand_color: color }, 'Marca atualizada.');
    if (ok && previous && previous !== logo) removeMedia(previous).catch(() => undefined);
    setSaving(false);
  };

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
      <SectionCard title="Sua marca na proposta" description="O cliente vê a sua logo e a sua cor, não a do FechaProposta.">
        <Stack spacing={3}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Logo</Typography>
            {readOnly ? <Typography variant="body2" color="text.secondary">Só o dono ou o gerente alteram a marca.</Typography> : <LogoUploader orgId={org.id} value={logo} onChange={setLogo} />}
          </Box>
          {!readOnly && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Cor</Typography>
              <BrandColorPicker value={color} onChange={setColor} />
            </Box>
          )}
          {!readOnly && (
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              {dirty && <Button color="inherit" onClick={() => { setLogo(org.logo_path); setColor(org.brand_color); }}>Desfazer</Button>}
              <Button variant="contained" loading={saving} disabled={!dirty} onClick={submit}>Salvar marca</Button>
            </Stack>
          )}
        </Stack>
      </SectionCard>
      <Box>
        <Typography variant="overline" color="text.secondary">Prévia</Typography>
        <Box sx={{ mt: 1, maxHeight: 520, overflow: 'hidden', borderRadius: '12px', position: 'relative', '&::after': { content: '""', position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, background: `linear-gradient(transparent, ${tokens.background})` } }}>
          <ProposalDocument
            compact
            data={{
              code: 'FP-0001',
              title: 'Exemplo de proposta',
              summary: 'É assim que o seu cliente vai ver as propostas que você enviar.',
              deliverables: ['Primeira entrega', 'Segunda entrega'],
              timeline: '2 semanas',
              next_step: null,
              exclusions: null,
              terms: null,
              valid_until: addDays(todayISO(), org.default_validity_days),
              discount: 0,
              items: [{ name: 'Serviço', description: null, unit: 'un', quantity: 1, unit_price: 1500, is_optional: false }],
              client: { name: 'Cliente Exemplo', company: null },
              organization: { ...org, logo_path: logo, brand_color: color },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

const defaultsSchema = z.object({
  default_validity_days: z.string().refine((v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 180;
  }, 'De 1 a 180 dias.'),
  default_terms: z.string().max(2000),
  default_next_step: z.string().max(500),
});

function DefaultsTab({ readOnly }: { readOnly: boolean }) {
  const org = useCurrentOrganization();
  const save = useSaveOrganization();
  const { register, handleSubmit, formState, reset } = useForm<z.infer<typeof defaultsSchema>>({
    resolver: zodResolver(defaultsSchema),
    defaultValues: {
      default_validity_days: String(org.default_validity_days),
      default_terms: org.default_terms ?? '',
      default_next_step: org.default_next_step ?? '',
    },
  });
  const submit = handleSubmit(async (v) => {
    const ok = await save({
      default_validity_days: Number(v.default_validity_days),
      default_terms: v.default_terms.trim() || null,
      default_next_step: v.default_next_step.trim() || null,
    });
    if (ok) reset(v);
  });
  return (
    <SectionCard title="Padrões de proposta nova" description="Já vêm preenchidos ao criar uma proposta. Dá para mudar em cada uma.">
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        <TextField
          label="Validade"
          disabled={readOnly}
          {...register('default_validity_days')}
          error={Boolean(formState.errors.default_validity_days)}
          helperText={formState.errors.default_validity_days?.message ?? 'Propostas com prazo curto costumam ter resposta mais rápida.'}
          sx={{ maxWidth: 220 }}
          slotProps={{ input: { endAdornment: <InputAdornment position="end">dias</InputAdornment> }, htmlInput: { inputMode: 'numeric' } }}
        />
        <TextField label="Condições de pagamento" disabled={readOnly} multiline minRows={3} placeholder="Ex.: 50% no aceite e 50% na entrega, via Pix." {...register('default_terms')} />
        <TextField label="Próximo passo depois do aceite" disabled={readOnly} placeholder="Ex.: Entramos em contato em até 1 dia útil para agendar o início." {...register('default_next_step')} />
        {!readOnly && (
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained" loading={formState.isSubmitting} disabled={!formState.isDirty}>Salvar</Button>
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
}

export function SettingsPage() {
  const { canManage } = useOrganization();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get('aba')) ? params.get('aba')! : 'empresa';

  return (
    <>
      <PageHeader title="Configurações" subtitle="Dados da empresa, marca, padrões, equipe e assinatura." />
      <Tabs value={tab} onChange={(_, v) => setParams({ aba: v }, { replace: true })} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 3, borderBottom: `1px solid ${tokens.border}` }}>
        {TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
      </Tabs>
      {!canManage && tab !== 'equipe' && tab !== 'assinatura' && (
        <Alert severity="info" sx={{ mb: 2 }}>Só o dono ou o gerente alteram estas configurações.</Alert>
      )}
      <Box sx={{ maxWidth: tab === 'marca' ? 'none' : 820 }}>
        {tab === 'empresa' && <CompanyTab readOnly={!canManage} />}
        {tab === 'marca' && <BrandTab readOnly={!canManage} />}
        {tab === 'propostas' && <DefaultsTab readOnly={!canManage} />}
        {tab === 'equipe' && <Card sx={{ p: 2.5 }}><TeamPanel /></Card>}
        {tab === 'assinatura' && <SubscriptionPanel />}
      </Box>
    </>
  );
}
