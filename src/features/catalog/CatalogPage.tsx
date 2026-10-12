import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { BookOpen, PenLine, Plus, Search, Trash2 } from 'lucide-react';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/common';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotifyProvider';
import { useCurrentOrganization, useOrganization } from '@/features/organizations/OrganizationProvider';
import { keys, useServices } from '@/hooks/queries';
import { friendlyError } from '@/lib/errors';
import { money, parseMoney } from '@/lib/format';
import { deleteService, saveService } from '@/services/catalog';
import type { Service } from '@/types';
import { tokens } from '@/theme/tokens';

const UNITS = ['un', 'h', 'dia', 'mês', 'projeto', 'página', 'm²', 'pacote'];

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.').max(140),
  description: z.string().max(600),
  unit: z.string().trim().min(1, 'Informe a unidade.').max(20),
  unit_price: z.string().refine((v) => (parseMoney(v) ?? -1) >= 0, 'Informe o valor.'),
  is_active: z.boolean(),
});
type Values = z.infer<typeof schema>;

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function ServiceDialog({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const org = useCurrentOrganization();
  const qc = useQueryClient();
  const notify = useNotify();
  const { register, handleSubmit, formState, setValue, watch } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: service?.name ?? '',
      description: service?.description ?? '',
      unit: service?.unit ?? 'un',
      unit_price: service ? String(service.unit_price).replace('.', ',') : '',
      is_active: service?.is_active ?? true,
    },
  });

  const submit = handleSubmit(async (v) => {
    try {
      await saveService(org.id, service?.id ?? null, {
        name: v.name.trim(),
        description: v.description.trim() || null,
        unit: v.unit.trim(),
        unit_price: parseMoney(v.unit_price) ?? 0,
        is_active: v.is_active,
      });
      qc.invalidateQueries({ queryKey: keys.services(org.id) });
      notify.success(service ? 'Serviço atualizado.' : 'Serviço cadastrado.');
      onClose();
    } catch (e) {
      notify.error(friendlyError(e));
    }
  });

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{service ? 'Editar serviço' : 'Novo serviço'}</DialogTitle>
      <DialogContent>
        <Stack component="form" spacing={2} sx={{ pt: 1 }} onSubmit={submit} noValidate>
          <TextField label="Nome" placeholder="Ex.: Landing page" autoFocus {...register('name')} error={Boolean(formState.errors.name)} helperText={formState.errors.name?.message} />
          <TextField label="Descrição (opcional)" multiline minRows={2} placeholder="Aparece na proposta, abaixo do nome do item." {...register('description')} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <TextField
              label="Valor"
              placeholder="0,00"
              {...register('unit_price')}
              error={Boolean(formState.errors.unit_price)}
              helperText={formState.errors.unit_price?.message}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> }, htmlInput: { inputMode: 'decimal' } }}
            />
            <Autocomplete freeSolo options={UNITS} value={watch('unit')} onInputChange={(_, v) => setValue('unit', v)} renderInput={(params) => <TextField {...params} label="Por" error={Boolean(formState.errors.unit)} />} />
          </Box>
          <FormControlLabel control={<Switch checked={watch('is_active')} onChange={(e) => setValue('is_active', e.target.checked)} />} label="Disponível nas propostas" />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 1 }}>
            <Button color="inherit" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="contained" loading={formState.isSubmitting}>Salvar</Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export function CatalogPage() {
  const org = useCurrentOrganization();
  const { canManage } = useOrganization();
  const services = useServices();
  const qc = useQueryClient();
  const notify = useNotify();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Service | null | 'new'>(null);
  const [removing, setRemoving] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return (services.data ?? []).filter((s) => !q || normalize(`${s.name} ${s.description ?? ''}`).includes(q));
  }, [services.data, query]);

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await deleteService(removing.id);
      qc.invalidateQueries({ queryKey: keys.services(org.id) });
      notify.success('Serviço removido.');
      setRemoving(null);
    } catch (e) {
      notify.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Catálogo"
        subtitle="Seus serviços com preço padrão. Na proposta, adicione com um clique e ajuste se precisar."
        actions={canManage && <Button variant="contained" startIcon={<Plus />} onClick={() => setEditing('new')}>Novo serviço</Button>}
      />
      {!canManage && <Alert severity="info" sx={{ mb: 2 }}>Só o dono ou o gerente alteram o catálogo. Você pode usar os serviços nas propostas.</Alert>}

      {(services.data?.length ?? 0) > 6 && (
        <TextField
          size="small"
          placeholder="Buscar serviço"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ maxWidth: 360, mb: 2 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }, htmlInput: { 'aria-label': 'Buscar serviço' } }}
        />
      )}

      {services.error ? (
        <ErrorState message={friendlyError(services.error, 'Não foi possível carregar o catálogo.')} onRetry={() => services.refetch()} />
      ) : services.isPending ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen />}
            title={services.data?.length ? 'Nenhum serviço encontrado' : 'Cadastre o que você vende'}
            description={services.data?.length ? undefined : 'Com o catálogo, montar uma proposta vira escolher itens de uma lista. Comece pelos 3 serviços que você mais vende.'}
            action={canManage && !services.data?.length && <Button variant="contained" startIcon={<Plus />} onClick={() => setEditing('new')}>Cadastrar serviço</Button>}
          />
        </Card>
      ) : (
        <Card sx={{ overflow: 'hidden' }}>
          {rows.map((s, i) => (
            <Stack key={s.id} direction="row" spacing={2} sx={{ px: 2, py: 1.5, alignItems: 'center', borderTop: i ? `1px solid ${tokens.border}` : 'none', opacity: s.is_active ? 1 : 0.55 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>
                  {s.name}
                  {!s.is_active && <Box component="span" sx={{ ml: 1, fontSize: 11, color: tokens.textTertiary, fontWeight: 600 }}>INATIVO</Box>}
                </Typography>
                {s.description && <Typography noWrap variant="caption" color="text.secondary" sx={{ display: 'block' }}>{s.description}</Typography>}
              </Box>
              <Typography sx={{ fontWeight: 650, whiteSpace: 'nowrap', fontFeatureSettings: '"tnum"' }}>
                {money(s.unit_price)}<Box component="span" sx={{ color: tokens.textTertiary, fontWeight: 400 }}> / {s.unit}</Box>
              </Typography>
              {canManage && (
                <Stack direction="row">
                  <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${s.name}`} onClick={() => setEditing(s)}><PenLine size={16} /></IconButton></Tooltip>
                  <Tooltip title="Remover"><IconButton size="small" aria-label={`Remover ${s.name}`} onClick={() => setRemoving(s)}><Trash2 size={16} /></IconButton></Tooltip>
                </Stack>
              )}
            </Stack>
          ))}
        </Card>
      )}

      {editing && <ServiceDialog service={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remover ${removing?.name ?? ''}?`}
        message="As propostas que já usam este serviço não mudam."
        confirmLabel="Remover"
        danger
        loading={busy}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
      />
    </>
  );
}
