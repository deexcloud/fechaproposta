import { useRef, useState } from 'react';
import { Box, Button, ButtonBase, Stack, TextField, Typography } from '@mui/material';
import { Check, ImagePlus, Trash2 } from 'lucide-react';
import { BRAND_SWATCHES } from '@/lib/color';
import { getPublicMediaUrl } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import { uploadLogo, validateLogoFile } from '@/services/organizations';
import { useNotify } from '@/components/NotifyProvider';
import { tokens } from '@/theme/tokens';

/** Escolha da cor da marca: sugestões + campo livre. */
export function BrandColorPicker({ value, onChange }: { value: string | null; onChange: (color: string) => void }) {
  const [custom, setCustom] = useState(value ?? '');
  return (
    <Box>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }} role="radiogroup" aria-label="Cor da marca">
        {BRAND_SWATCHES.map((c) => (
          <ButtonBase
            key={c}
            role="radio"
            aria-checked={value?.toUpperCase() === c}
            aria-label={`Cor ${c}`}
            onClick={() => {
              onChange(c);
              setCustom(c);
            }}
            sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: c, color: '#fff', boxShadow: value?.toUpperCase() === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none' }}
          >
            {value?.toUpperCase() === c && <Check size={16} strokeWidth={3} />}
          </ButtonBase>
        ))}
        <Box component="label" sx={{ position: 'relative', width: 34, height: 34, borderRadius: '10px', border: `1px dashed ${tokens.borderStrong}`, overflow: 'hidden', cursor: 'pointer', background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }} title="Outra cor">
          <Box
            component="input"
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(custom) ? custom : '#0F2A22'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setCustom(e.target.value.toUpperCase());
              onChange(e.target.value.toUpperCase());
            }}
            aria-label="Escolher outra cor"
            sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
          />
        </Box>
      </Stack>
      <TextField
        size="small"
        label="Código da cor"
        value={custom}
        onChange={(e) => {
          const v = e.target.value.trim();
          setCustom(v);
          if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toUpperCase());
        }}
        placeholder="#0F2A22"
        sx={{ mt: 1.5, maxWidth: 160 }}
      />
    </Box>
  );
}

/** Envio de logo com prévia. Devolve o caminho no armazenamento. */
export function LogoUploader({ orgId, value, onChange }: { orgId: string; value: string | null; onChange: (path: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const notify = useNotify();
  const [uploading, setUploading] = useState(false);
  const url = getPublicMediaUrl(value);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const problem = validateLogoFile(file);
    if (problem) return notify.error(problem);
    setUploading(true);
    try {
      onChange(await uploadLogo(orgId, file));
    } catch (e) {
      notify.error(friendlyError(e, 'Não foi possível enviar a imagem.'));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 88, height: 64, borderRadius: '12px', border: `1px dashed ${tokens.borderStrong}`, bgcolor: '#fff', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
        {url ? <Box component="img" src={url} alt="Logo atual" sx={{ maxWidth: '86%', maxHeight: '80%', objectFit: 'contain' }} /> : <ImagePlus size={22} color={tokens.textTertiary} />}
      </Box>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" loading={uploading} onClick={() => input.current?.click()}>
            {url ? 'Trocar logo' : 'Enviar logo'}
          </Button>
          {url && (
            <Button size="small" color="inherit" startIcon={<Trash2 />} onClick={() => onChange(null)}>Remover</Button>
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary">PNG, JPG ou WEBP até 2 MB. Fundo transparente fica melhor.</Typography>
      </Stack>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </Stack>
  );
}
