import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FormProvider, useForm, useFormContext, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, Chip, IconButton, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { ArrowLeft, Eye, LayoutTemplate, PenLine, Send } from 'lucide-react';
import { BrandLoader, ErrorState } from '@/components/common';
import { useNotify } from '@/components/NotifyProvider';
import { ProposalDocument, type DocumentData } from '@/components/ProposalDocument';
import { useCurrentOrganization } from '@/features/organizations/OrganizationProvider';
import { useSubscription } from '@/features/subscription/subscription';
import { keys, useClients, useInvalidateProposals, useProposal, useTemplates } from '@/hooks/queries';
import { friendlyError } from '@/lib/errors';
import { addDays, longDate, money, parseMoney, todayISO } from '@/lib/format';
import { canEdit, computeTotals } from '@/lib/proposal';
import { getTemplate, saveTemplate } from '@/services/catalog';
import { saveProposal } from '@/services/proposals';
import { ClientPicker } from './ClientPicker';
import { DeliverablesEditor, ItemsEditor } from './ListEditors';
import { contentToValues, editorSchema, emptyItem, fromItems, toItems, valuesToContent, valuesToPayload, type EditorMode, type EditorValues } from './schema';
import { tokens } from '@/theme/tokens';

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
        <Box sx={{ width: 24, height: 24, borderRadius: '7px', bgcolor: tokens.accentSoft, color: tokens.accentText, fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{n}</Box>
        <Box>
          <Typography variant="h3" component="h2">{title}</Typography>
          {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
        </Box>
      </Stack>
      {children}
    </Card>
  );
}

function blankValues(validity: string, terms: string | null, nextStep: string | null): EditorValues {
  return {
    templateName: '',
    templateDescription: '',
    clientId: null,
    newClient: { name: '', company: '', email: '', whatsapp: '' },
    creatingClient: false,
    title: '',
    summary: '',
    deliverables: [{ value: '' }],
    timeline: '',
    next_step: nextStep ?? '',
    exclusions: '',
    terms: terms ?? '',
    valid_until: validity,
    discount: '',
    items: [emptyItem()],
  };
}

/** Prévia ao vivo: mesmo componente que o cliente vê. */
function LivePreview({ code }: { code: string }) {
  const org = useCurrentOrganization();
  const clients = useClients();
  const v = useWatch<EditorValues>() as EditorValues;
  const client = v.creatingClient
    ? v.newClient.name.trim()
      ? { name: v.newClient.name.trim(), company: v.newClient.company.trim() || null }
      : null
    : (clients.data?.find((c) => c.id === v.clientId) ?? null);
  const data: DocumentData = {
    ...valuesToContent({ ...v, title: v.title ?? '' } as EditorValues),
    code,
    valid_until: v.valid_until || todayISO(),
    discount: parseMoney(v.discount || '0') ?? 0,
    client: client ? { name: client.name, company: client.company } : null,
    organization: org,
  };
  return <ProposalDocument data={data} compact />;
}

function ValidityField() {
  const { register, setValue, formState } = useFormContext<EditorValues>();
  const value = useWatch<EditorValues, 'valid_until'>({ name: 'valid_until' });
  const today = todayISO();
  return (
    <Box>
      <TextField
        type="date"
        label="Válida até"
        {...register('valid_until')}
        error={Boolean(formState.errors.valid_until)}
        helperText={formState.errors.valid_until?.message ?? (value ? longDate(value) : undefined)}
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today } }}
        sx={{ maxWidth: 240 }}
      />
      <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
        {[7, 15, 30].map((d) => (
          <Chip key={d} size="small" label={`${d} dias`} variant={value === addDays(today, d) ? 'filled' : 'outlined'} onClick={() => setValue('valid_until', addDays(today, d), { shouldDirty: true, shouldValidate: true })} />
        ))}
      </Stack>
    </Box>
  );
}

function firstErrorMessage(errors: FieldErrors<EditorValues>): string {
  const walk = (e: unknown): string | null => {
    if (!e || typeof e !== 'object') return null;
    const obj = e as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    for (const v of Object.values(obj)) {
      const m = walk(v);
      if (m) return m;
    }
    return null;
  };
  return walk(errors) ?? 'Revise os campos destacados.';
}

function Editor({ mode, initial, proposalId, templateId, code, title }: { mode: EditorMode; initial: EditorValues; proposalId?: string; templateId?: string; code: string; title: string }) {
  const org = useCurrentOrganization();
  const navigate = useNavigate();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProposals();
  const subscription = useSubscription();
  const templates = useTemplates();
  const [params] = useSearchParams();
  const [view, setView] = useState<'form' | 'preview'>('form');
  const [saving, setSaving] = useState<null | 'draft' | 'send'>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const submitted = useRef(false);

  const form = useForm<EditorValues>({ resolver: zodResolver(editorSchema(mode)), defaultValues: initial, mode: 'onTouched' });
  const { register, handleSubmit, formState, reset, getValues } = form;
  const items = useWatch({ control: form.control, name: 'items' });
  const discountText = useWatch({ control: form.control, name: 'discount' });
  const totals = computeTotals(toItems(items ?? []), parseMoney(discountText || '0') ?? 0);
  const blocked = mode === 'proposal' && subscription !== null && !subscription.active;

  // Aviso ao fechar a aba com alterações não salvas.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formState.isDirty && !submitted.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [formState.isDirty]);

  const save = (intent: 'draft' | 'send') =>
    handleSubmit(
      async (values) => {
        setFormError(null);
        setSaving(intent);
        try {
          if (mode === 'template') {
            const id = await saveTemplate(org.id, templateId ?? null, {
              name: values.templateName.trim(),
              description: values.templateDescription.trim() || null,
              content: valuesToContent(values),
            });
            queryClient.invalidateQueries({ queryKey: keys.templates(org.id) });
            submitted.current = true;
            notify.success('Modelo salvo.');
            navigate(templateId ? '/painel/modelos' : `/painel/modelos?novo=${id}`);
            return;
          }
          const id = await saveProposal(org.id, proposalId ?? null, valuesToPayload(values));
          invalidate(id);
          submitted.current = true;
          reset(values);
          if (intent === 'send') navigate(`/painel/propostas/${id}?enviar=1`);
          else {
            notify.success(proposalId ? 'Alterações salvas.' : 'Rascunho salvo.');
            navigate(`/painel/propostas/${id}`);
          }
        } catch (e) {
          setFormError(friendlyError(e, 'Não foi possível salvar. Tente novamente.'));
        } finally {
          setSaving(null);
        }
      },
      (errors) => {
        setView('form');
        notify.error(firstErrorMessage(errors));
      },
    )();

  // Ctrl+S salva sem sair do teclado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saving) save('draft');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const applyTemplate = async (id: string) => {
    try {
      const tpl = await getTemplate(id);
      const current = getValues();
      reset(contentToValues(tpl.content, current), { keepDefaultValues: true });
      form.setValue('title', tpl.content.title || current.title, { shouldDirty: true });
      notify.info(`Modelo “${tpl.name}” aplicado. Ajuste o que precisar.`);
    } catch (e) {
      notify.error(friendlyError(e, 'Não foi possível abrir o modelo.'));
    }
  };

  const showTemplatePicker = mode === 'proposal' && !proposalId && !params.get('modelo') && (templates.data?.length ?? 0) > 0 && !formState.isDirty;
  const back = mode === 'template' ? '/painel/modelos' : proposalId ? `/painel/propostas/${proposalId}` : '/painel/propostas';

  return (
    <FormProvider {...form}>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); save('draft'); }} noValidate>
        {/* Barra superior fixa */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            position: 'sticky', top: { xs: 0, md: 0 }, zIndex: 15, alignItems: 'center',
            mx: { xs: -2, sm: -3, lg: -5 }, px: { xs: 1, sm: 3, lg: 5 }, py: 1.25, mb: 2.5, mt: { xs: -2.5, md: -4 },
            bgcolor: 'rgba(248,245,238,.92)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${tokens.border}`,
          }}
        >
          <IconButton component={RouterLink} to={back} aria-label="Voltar"><ArrowLeft size={19} /></IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 650, fontSize: 15 }}>{title}</Typography>
            <Typography noWrap variant="caption" color="text.secondary">
              {mode === 'template' ? 'Modelo de proposta' : `${code} · ${money(totals.total)}${formState.isDirty ? ' · alterações não salvas' : ''}`}
            </Typography>
          </Box>
          <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v) => v && setView(v)} sx={{ display: { xs: 'flex', lg: 'none' } }} aria-label="Alternar entre edição e prévia">
            <ToggleButton value="form" aria-label="Editar"><PenLine size={16} /></ToggleButton>
            <ToggleButton value="preview" aria-label="Prévia"><Eye size={16} /></ToggleButton>
          </ToggleButtonGroup>
          {mode === 'template' ? (
            <Button type="submit" variant="contained" loading={saving === 'draft'}>Salvar modelo</Button>
          ) : (
            <>
              <Tooltip title="Ctrl + S">
                <Button type="submit" variant="outlined" loading={saving === 'draft'} disabled={blocked || Boolean(saving)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                  {proposalId ? 'Salvar' : 'Salvar rascunho'}
                </Button>
              </Tooltip>
              <Button variant="contained" startIcon={<Send />} loading={saving === 'send'} disabled={blocked || Boolean(saving)} onClick={() => save('send')}>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Salvar e enviar</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Enviar</Box>
              </Button>
            </>
          )}
        </Stack>

        {blocked && <Alert severity="warning" sx={{ mb: 2 }}>Seu acesso está pausado. Assine para salvar e enviar propostas.</Alert>}
        {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' }, alignItems: 'start' }}>
          <Stack spacing={2} sx={{ display: { xs: view === 'form' ? 'flex' : 'none', lg: 'flex' } }}>
            {showTemplatePicker && (
              <Card sx={{ p: 2, bgcolor: tokens.accentSoft, borderColor: 'transparent' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                  <LayoutTemplate size={16} />
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>Começar de um modelo</Typography>
                </Stack>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {templates.data!.slice(0, 6).map((t) => (
                    <Chip key={t.id} label={t.name} onClick={() => applyTemplate(t.id)} sx={{ bgcolor: '#fff' }} />
                  ))}
                </Stack>
              </Card>
            )}

            {mode === 'template' ? (
              <Section n={1} title="Modelo" hint="Só a sua equipe vê o nome e a descrição.">
                <Stack spacing={2}>
                  <TextField label="Nome do modelo" placeholder="Ex.: Site institucional" {...register('templateName')} error={Boolean(formState.errors.templateName)} helperText={formState.errors.templateName?.message} />
                  <TextField label="Quando usar (opcional)" placeholder="Ex.: Para clientes que precisam de um site simples" {...register('templateDescription')} />
                </Stack>
              </Section>
            ) : (
              <Section n={1} title="Para quem" hint="Busque um cliente ou cadastre na hora.">
                <ClientPicker />
              </Section>
            )}

            <Section n={2} title="O que você propõe" hint="Comece pelo resultado que o cliente quer.">
              <Stack spacing={2}>
                <TextField label="Título" placeholder="Ex.: Novo site para o Café Aurora" {...register('title')} error={Boolean(formState.errors.title)} helperText={formState.errors.title?.message} />
                <TextField label="Resumo e objetivo" placeholder="Explique o desafio do cliente e o resultado que vocês vão buscar juntos." multiline minRows={3} {...register('summary')} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Entregas</Typography>
                  <DeliverablesEditor />
                </Box>
                <TextField label="Prazo" placeholder="Ex.: 4 semanas após o aceite" {...register('timeline')} sx={{ maxWidth: 360 }} />
              </Stack>
            </Section>

            <Section n={3} title="Itens e valores" hint="Marque como opcional o que o cliente pode escolher incluir.">
              <ItemsEditor />
            </Section>

            <Section n={4} title="Condições" hint={mode === 'template' ? undefined : 'Validade, pagamento e o que acontece depois do aceite.'}>
              <Stack spacing={2}>
                {mode === 'proposal' && <ValidityField />}
                <TextField label="Condições de pagamento" placeholder="Ex.: 50% no aceite e 50% na entrega, via Pix." multiline minRows={2} {...register('terms')} />
                <TextField label="Próximo passo depois do aceite" placeholder="Ex.: Agendamos a reunião de início em até 2 dias úteis." {...register('next_step')} />
                <TextField label="O que não está incluído (opcional)" placeholder="Deixe claros os limites do escopo para evitar surpresas." multiline minRows={2} {...register('exclusions')} />
              </Stack>
            </Section>
          </Stack>

          <Box sx={{ display: { xs: view === 'preview' ? 'block' : 'none', lg: 'block' }, position: { lg: 'sticky' }, top: { lg: 88 }, maxHeight: { lg: 'calc(100dvh - 110px)' }, overflowY: { lg: 'auto' }, borderRadius: '12px' }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Prévia · como o cliente vê</Typography>
            <LivePreview code={code} />
          </Box>
        </Box>
      </Box>
    </FormProvider>
  );
}

/** Nova proposta (/painel/propostas/nova) ou edição (/painel/propostas/:id/editar). */
export function ProposalEditorPage() {
  const { id } = useParams();
  const org = useCurrentOrganization();
  const [params] = useSearchParams();
  const templateId = params.get('modelo');
  const clientId = params.get('cliente');
  const existing = useProposal(id);
  const template = useQuery({ queryKey: ['template', templateId], queryFn: () => getTemplate(templateId!), enabled: Boolean(templateId) && !id });

  const initial = useMemo<EditorValues | null>(() => {
    const base = blankValues(addDays(todayISO(), org.default_validity_days), org.default_terms, org.default_next_step);
    if (id) {
      const p = existing.data;
      if (!p) return null;
      return {
        ...base,
        clientId: p.client_id,
        title: p.title,
        summary: p.summary ?? '',
        deliverables: p.deliverables.length ? p.deliverables.map((value) => ({ value })) : [{ value: '' }],
        timeline: p.timeline ?? '',
        next_step: p.next_step ?? '',
        exclusions: p.exclusions ?? '',
        terms: p.terms ?? '',
        // Proposta vencida: sugere nova validade para poder reenviar.
        valid_until: p.valid_until < todayISO() ? addDays(todayISO(), org.default_validity_days) : p.valid_until,
        discount: p.discount ? String(p.discount).replace('.', ',') : '',
        items: fromItems(p.items),
      };
    }
    if (templateId) {
      if (!template.data) return template.isError ? { ...base, clientId } : null;
      return { ...contentToValues(template.data.content, base), clientId };
    }
    return { ...base, clientId };
  }, [id, existing.data, templateId, template.data, template.isError, clientId, org]);

  if (id && existing.error) return <ErrorState message={friendlyError(existing.error, 'Não foi possível abrir a proposta.')} onRetry={() => existing.refetch()} />;
  if (!initial) return <BrandLoader label="Abrindo a proposta…" />;
  if (id && existing.data && !canEdit(existing.data)) {
    return (
      <Alert severity="info" action={<Button component={RouterLink} to={`/painel/propostas/${id}`} color="inherit">Voltar</Button>}>
        Esta proposta já foi respondida e não pode mais ser alterada. Duplique para criar uma nova versão.
      </Alert>
    );
  }

  const code = existing.data?.code ?? `FP-${String(org.next_proposal_number).padStart(4, '0')}`;
  return <Editor key={id ?? `new-${templateId ?? ''}`} mode="proposal" initial={initial} proposalId={id} code={code} title={id ? `Editar ${existing.data?.title ?? 'proposta'}` : 'Nova proposta'} />;
}

/** Novo modelo (/painel/modelos/novo) ou edição (/painel/modelos/:templateId). */
export function TemplateEditorPage() {
  const { templateId } = useParams();
  const isNew = !templateId || templateId === 'novo';
  const template = useQuery({ queryKey: ['template', templateId], queryFn: () => getTemplate(templateId!), enabled: !isNew });

  if (!isNew && template.error) return <ErrorState message={friendlyError(template.error, 'Não foi possível abrir o modelo.')} />;
  if (!isNew && !template.data) return <BrandLoader label="Abrindo o modelo…" />;

  const base = blankValues(todayISO(), null, null);
  const initial: EditorValues = template.data
    ? { ...contentToValues(template.data.content, base), templateName: template.data.name, templateDescription: template.data.description ?? '' }
    : base;
  return <Editor key={templateId ?? 'novo'} mode="template" initial={initial} templateId={isNew ? undefined : templateId} code="FP-0000" title={isNew ? 'Novo modelo' : `Editar modelo`} />;
}
