import { useRef, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import {
  Autocomplete,
  Box,
  Button,
  Collapse,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowDown, ArrowUp, BookOpen, GripVertical, Plus, Text, Trash2 } from 'lucide-react';
import { useNotify } from '@/components/NotifyProvider';
import { useServices } from '@/hooks/queries';
import { money, parseMoney } from '@/lib/format';
import { computeTotals, itemTotal } from '@/lib/proposal';
import { emptyItem, fromItems, toItems, type EditorValues } from './schema';
import { tokens } from '@/theme/tokens';

const UNITS = ['un', 'h', 'dia', 'mês', 'projeto', 'página', 'm²', 'pacote'];

/** Entregas: uma por linha. Enter cria a próxima, Backspace numa linha vazia apaga. */
export function DeliverablesEditor() {
  const { control, register, formState, getValues } = useFormContext<EditorValues>();
  const { fields, append, remove, insert } = useFieldArray({ control, name: 'deliverables' });
  const notify = useNotify();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // Remover pela lixeira avisa e deixa desfazer; linha vazia some sem aviso.
  const removeWithUndo = (i: number) => {
    const value = getValues(`deliverables.${i}.value`);
    remove(i);
    if (value.trim()) notify.info('Entrega removida.', { label: 'Desfazer', onClick: () => insert(i, { value }) });
  };
  const focus = (i: number) => setTimeout(() => refs.current[i]?.focus(), 0);

  return (
    <Stack spacing={1}>
      {fields.map((field, i) => {
        const { ref, ...rest } = register(`deliverables.${i}.value`);
        return (
          <Stack key={field.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography sx={{ width: 22, color: tokens.textTertiary, fontSize: 13, fontWeight: 600, textAlign: 'right', fontFeatureSettings: '"tnum"' }}>{String(i + 1).padStart(2, '0')}</Typography>
            <TextField
              size="small"
              placeholder={i === 0 ? 'Ex.: Reunião de briefing e pesquisa' : 'Próxima entrega'}
              {...rest}
              inputRef={(el: HTMLInputElement | null) => {
                ref(el);
                refs.current[i] = el;
              }}
              error={Boolean(formState.errors.deliverables?.[i]?.value)}
              helperText={formState.errors.deliverables?.[i]?.value?.message}
              onKeyDown={(e) => {
                const target = e.target as HTMLInputElement;
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (fields.length < 30) {
                    insert(i + 1, { value: '' });
                    focus(i + 1);
                  }
                } else if (e.key === 'Backspace' && !target.value && fields.length > 1) {
                  e.preventDefault();
                  remove(i);
                  focus(Math.max(0, i - 1));
                }
              }}
            />
            <IconButton size="small" aria-label={`Remover entrega ${i + 1}`} onClick={() => removeWithUndo(i)} disabled={fields.length === 1}>
              <Trash2 size={15} />
            </IconButton>
          </Stack>
        );
      })}
      <Box>
        <Button
          size="small"
          startIcon={<Plus />}
          disabled={fields.length >= 30}
          onClick={() => {
            append({ value: '' });
            focus(fields.length);
          }}
        >
          Adicionar entrega
        </Button>
      </Box>
    </Stack>
  );
}

function ItemCard({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (to: number) => void; onRemove: () => void }) {
  const { control, register, setValue, formState } = useFormContext<EditorValues>();
  const item = useWatch({ control, name: `items.${index}` });
  const [showDescription, setShowDescription] = useState(Boolean(item?.description));
  const err = formState.errors.items?.[index];
  const total = itemTotal(toItems([item])[0]);

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: '12px',
        border: `1px solid ${item.is_optional ? tokens.borderStrong : tokens.border}`,
        borderStyle: item.is_optional ? 'dashed' : 'solid',
        bgcolor: item.is_optional ? tokens.background : tokens.surface,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ pt: 1.1, color: tokens.borderStrong, display: { xs: 'none', sm: 'block' } }}><GripVertical size={16} /></Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <TextField
            size="small"
            placeholder="Nome do item. Ex.: Criação do site"
            {...register(`items.${index}.name`)}
            error={Boolean(err?.name)}
            helperText={err?.name?.message}
            slotProps={{ htmlInput: { 'aria-label': `Nome do item ${index + 1}` } }}
          />
          <Collapse in={showDescription}>
            <TextField
              size="small"
              multiline
              minRows={2}
              placeholder="Detalhes que ajudam o cliente a entender o valor deste item"
              {...register(`items.${index}.description`)}
              sx={{ mt: 1 }}
              slotProps={{ htmlInput: { 'aria-label': `Descrição do item ${index + 1}` } }}
            />
          </Collapse>
          <Box sx={{ mt: 1, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr', sm: '90px 120px 1fr' }, alignItems: 'start' }}>
            <TextField
              size="small"
              label="Qtd."
              {...register(`items.${index}.quantity`)}
              error={Boolean(err?.quantity)}
              helperText={err?.quantity?.message}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <Autocomplete
              freeSolo
              size="small"
              options={UNITS}
              value={item.unit}
              onInputChange={(_, v) => setValue(`items.${index}.unit`, v, { shouldDirty: true })}
              renderInput={(params) => <TextField {...params} label="Unidade" error={Boolean(err?.unit)} helperText={err?.unit?.message} />}
            />
            <TextField
              size="small"
              label="Valor unitário"
              placeholder="0,00"
              {...register(`items.${index}.unit_price`)}
              error={Boolean(err?.unit_price)}
              helperText={err?.unit_price?.message}
              sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> }, htmlInput: { inputMode: 'decimal' } }}
            />
          </Box>
          <Stack direction="row" sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
            <FormControlLabel
              control={<Switch size="small" checked={item.is_optional} onChange={(e) => setValue(`items.${index}.is_optional`, e.target.checked, { shouldDirty: true, shouldValidate: formState.isSubmitted })} />}
              label={<Typography variant="body2">Opcional <Box component="span" sx={{ color: tokens.textTertiary, display: { xs: 'none', sm: 'inline' } }}>(o cliente escolhe se inclui)</Box></Typography>}
              sx={{ mr: 1 }}
            />
            {!showDescription && (
              <Button size="small" color="inherit" startIcon={<Text />} onClick={() => setShowDescription(true)} sx={{ color: tokens.textSecondary }}>
                Descrição
              </Button>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Typography sx={{ fontWeight: 650, fontFeatureSettings: '"tnum"', color: item.is_optional ? tokens.textSecondary : tokens.textPrimary }}>
              {item.is_optional ? '+ ' : ''}{money(total)}
            </Typography>
          </Stack>
        </Box>
        <Stack spacing={0.25}>
          <Tooltip title="Subir"><span><IconButton size="small" aria-label="Subir item" disabled={index === 0} onClick={() => onMove(index - 1)}><ArrowUp size={15} /></IconButton></span></Tooltip>
          <Tooltip title="Descer"><span><IconButton size="small" aria-label="Descer item" disabled={index === count - 1} onClick={() => onMove(index + 1)}><ArrowDown size={15} /></IconButton></span></Tooltip>
          <Tooltip title="Remover"><span><IconButton size="small" aria-label={`Remover item ${index + 1}`} disabled={count === 1} onClick={onRemove}><Trash2 size={15} /></IconButton></span></Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}

/** Itens com valores, opcionais, catálogo e desconto. */
export function ItemsEditor() {
  const { control, register, formState, getValues } = useFormContext<EditorValues>();
  const { fields, append, remove, move, insert } = useFieldArray({ control, name: 'items' });
  const notify = useNotify();
  const removeItem = (i: number) => {
    const item = getValues(`items.${i}`);
    remove(i);
    if (item.name.trim() || item.unit_price.trim()) {
      notify.info(`“${item.name.trim() || 'Item'}” removido.`, { label: 'Desfazer', onClick: () => insert(i, item) });
    }
  };
  const items = useWatch({ control, name: 'items' });
  const discount = useWatch({ control, name: 'discount' });
  const services = useServices();
  const [catalogAnchor, setCatalogAnchor] = useState<HTMLElement | null>(null);
  const active = (services.data ?? []).filter((s) => s.is_active);
  const totals = computeTotals(toItems(items ?? []), parseMoney(discount || '0') ?? 0);
  const rootError = formState.errors.items?.root?.message ?? formState.errors.items?.message;

  return (
    <Stack spacing={1.5}>
      {fields.map((field, i) => (
        <ItemCard key={field.id} index={i} count={fields.length} onMove={(to) => move(i, to)} onRemove={() => removeItem(i)} />
      ))}
      {rootError && <Typography variant="body2" color="error">{rootError}</Typography>}

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <Button variant="outlined" size="small" startIcon={<Plus />} disabled={fields.length >= 50} onClick={() => append(emptyItem())}>
          Adicionar item
        </Button>
        <Button variant="outlined" size="small" startIcon={<BookOpen />} disabled={fields.length >= 50} onClick={(e) => setCatalogAnchor(e.currentTarget)}>
          Do catálogo
        </Button>
        <Menu anchorEl={catalogAnchor} open={Boolean(catalogAnchor)} onClose={() => setCatalogAnchor(null)} slotProps={{ paper: { sx: { maxHeight: 360, width: 320 } } }}>
          {active.length === 0 && (
            <MenuItem disabled sx={{ whiteSpace: 'normal' }}>
              Nenhum serviço no catálogo ainda. Cadastre em Catálogo para adicionar com um clique.
            </MenuItem>
          )}
          {active.map((s) => (
            <MenuItem
              key={s.id}
              onClick={() => {
                const [item] = fromItems([{ ...s, quantity: 1, is_optional: false }]);
                // Substitui o primeiro item se ele ainda estiver vazio.
                const first = items?.[0];
                if (fields.length === 1 && first && !first.name && !first.unit_price) {
                  remove(0);
                }
                append(item);
                setCatalogAnchor(null);
              }}
              sx={{ justifyContent: 'space-between', gap: 2 }}
            >
              <Typography variant="body2" noWrap sx={{ fontWeight: 550 }}>{s.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{money(s.unit_price)}/{s.unit}</Typography>
            </MenuItem>
          ))}
        </Menu>
      </Stack>

      <Box sx={{ mt: 1, p: 2, borderRadius: '12px', bgcolor: tokens.muted }}>
        <Stack spacing={1}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Itens fixos</Typography>
            <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>{money(totals.subtotal)}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">Desconto</Typography>
            <TextField
              size="small"
              placeholder="0,00"
              {...register('discount')}
              error={Boolean(formState.errors.discount)}
              helperText={formState.errors.discount?.message}
              sx={{ width: 150, '& input': { textAlign: 'right' } }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> }, htmlInput: { inputMode: 'decimal', 'aria-label': 'Desconto' } }}
            />
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', pt: 1, borderTop: `1px solid ${tokens.border}` }}>
            <Typography sx={{ fontWeight: 650 }}>Total da proposta</Typography>
            <Typography sx={{ fontWeight: 750, fontSize: 22, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>{money(totals.total)}</Typography>
          </Stack>
          {totals.optional > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
              + até {money(totals.optional)} em opcionais, se o cliente escolher
            </Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
