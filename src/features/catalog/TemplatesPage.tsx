import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Button, Card, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { FilePlus2, LayoutTemplate, MoreHorizontal, PenLine, Plus, Sparkles, Trash2 } from 'lucide-react';
import { ErrorState, ListSkeleton, PageHeader } from '@/components/common';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotifyProvider';
import { useCurrentOrganization, useOrganization } from '@/features/organizations/OrganizationProvider';
import { keys, useTemplates } from '@/hooks/queries';
import { friendlyError } from '@/lib/errors';
import { money, relativeTime } from '@/lib/format';
import { computeTotals } from '@/lib/proposal';
import { deleteTemplate, saveTemplate } from '@/services/catalog';
import type { ProposalTemplate } from '@/types';
import { PRESETS } from './presets';
import { tokens } from '@/theme/tokens';

function TemplateCard({ template, onDelete }: { template: ProposalTemplate; onDelete?: () => void }) {
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const items = template.content.items ?? [];
  const totals = computeTotals(items);
  return (
    <Card sx={{ p: 2.25, display: 'flex', flexDirection: 'column', minHeight: 190 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: tokens.accentSoft, color: tokens.accentText, display: 'grid', placeItems: 'center' }}>
          <LayoutTemplate size={18} />
        </Box>
        <IconButton size="small" aria-label={`Opções do modelo ${template.name}`} onClick={(e) => setMenu(e.currentTarget)}><MoreHorizontal size={18} /></IconButton>
        <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
          <MenuItem component={RouterLink} to={`/painel/modelos/${template.id}`}><PenLine /> Editar modelo</MenuItem>
          {onDelete && (
            <MenuItem onClick={() => { setMenu(null); onDelete(); }} sx={{ color: tokens.error, '& svg': { color: `${tokens.error} !important` } }}><Trash2 /> Apagar</MenuItem>
          )}
        </Menu>
      </Stack>
      <Typography sx={{ fontWeight: 650, mt: 1.5 }}>{template.name}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, flexGrow: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {template.description || template.content.summary || 'Sem descrição.'}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5 }}>
        {items.length} {items.length === 1 ? 'item' : 'itens'} · {money(totals.total)} · editado {relativeTime(template.updated_at)}
      </Typography>
      <Button component={RouterLink} to={`/painel/propostas/nova?modelo=${template.id}`} variant="outlined" size="small" startIcon={<FilePlus2 />} sx={{ mt: 1.5, alignSelf: 'flex-start' }}>
        Usar modelo
      </Button>
    </Card>
  );
}

export function TemplatesPage() {
  const org = useCurrentOrganization();
  const { canManage } = useOrganization();
  const templates = useTemplates();
  const qc = useQueryClient();
  const notify = useNotify();
  const [removing, setRemoving] = useState<ProposalTemplate | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const addPreset = async (key: string) => {
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setBusy(key);
    try {
      await saveTemplate(org.id, null, { name: preset.name, description: preset.description, content: preset.content });
      qc.invalidateQueries({ queryKey: keys.templates(org.id) });
      notify.success(`Modelo “${preset.name}” adicionado. Ajuste os valores para a sua realidade.`);
    } catch (e) {
      notify.error(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy('remove');
    try {
      await deleteTemplate(removing.id);
      qc.invalidateQueries({ queryKey: keys.templates(org.id) });
      notify.success('Modelo apagado.');
      setRemoving(null);
    } catch (e) {
      notify.error(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const existingNames = new Set((templates.data ?? []).map((t) => t.name));
  const presets = PRESETS.filter((p) => !existingNames.has(p.name));

  return (
    <>
      <PageHeader
        title="Modelos"
        subtitle="Pontos de partida para não começar do zero. Escopo, itens e condições já preenchidos."
        actions={<Button component={RouterLink} to="/painel/modelos/novo" variant="contained" startIcon={<Plus />}>Novo modelo</Button>}
      />

      {templates.error ? (
        <ErrorState message={friendlyError(templates.error, 'Não foi possível carregar os modelos.')} onRetry={() => templates.refetch()} />
      ) : templates.isPending ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          {(templates.data?.length ?? 0) > 0 && (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, mb: 4 }}>
              {templates.data!.map((t) => (
                <TemplateCard key={t.id} template={t} onDelete={canManage ? () => setRemoving(t) : undefined} />
              ))}
            </Box>
          )}

          {presets.length > 0 && (
            <>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                <Sparkles size={16} color={tokens.accentText} />
                <Typography variant="h3" component="h2">{templates.data?.length ? 'Mais ideias para começar' : 'Comece com um modelo pronto'}</Typography>
              </Stack>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
                {presets.map((p) => (
                  <Card key={p.key} sx={{ p: 2, borderStyle: 'dashed', bgcolor: 'transparent', boxShadow: 'none' }}>
                    <Typography sx={{ fontWeight: 650 }}>{p.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{p.description}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {p.content.deliverables.length} entregas · {p.content.items.length} itens
                    </Typography>
                    <Button size="small" sx={{ mt: 1.5 }} startIcon={<Plus />} loading={busy === p.key} onClick={() => addPreset(p.key)}>
                      Adicionar aos meus modelos
                    </Button>
                  </Card>
                ))}
              </Box>
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title={`Apagar o modelo ${removing?.name ?? ''}?`}
        message="As propostas criadas com ele não mudam."
        confirmLabel="Apagar"
        danger
        loading={busy === 'remove'}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
      />
    </>
  );
}
