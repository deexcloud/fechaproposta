import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Lock, X } from 'lucide-react';
import { friendlyError } from '@/lib/errors';
import { money } from '@/lib/format';
import { acceptProposal, declineProposal, requestChanges } from '@/services/publicProposal';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';
import { displayFont, tokens } from '@/theme/tokens';

interface Brand {
  bg: string;
  fg: string;
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <DialogTitle sx={{ pr: 6 }}>
      {title}
      <IconButton aria-label="Fechar" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}><X size={18} /></IconButton>
    </DialogTitle>
  );
}

function useFullScreen() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}

export function AcceptDialog({
  open,
  onClose,
  token,
  title,
  total,
  selectedItems,
  defaultName,
  orgName,
  brand,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  title: string;
  total: number;
  selectedItems: string[];
  defaultName: string;
  orgName: string;
  brand: Brand;
  onDone: () => void;
}) {
  const fullScreen = useFullScreen();
  const pad = useRef<SignaturePadHandle>(null);
  const [mode, setMode] = useState<'drawn' | 'typed'>('drawn');
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState('');
  const [hasInk, setHasInk] = useState(false);
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameOk = name.trim().length >= 3;
  const ready = nameOk && agree && (mode === 'typed' || hasInk);

  const submit = async () => {
    setError(null);
    const signature = mode === 'drawn' ? pad.current?.toDataUrl() ?? null : null;
    if (mode === 'drawn' && !signature) return setError('Desenhe sua assinatura.');
    setSaving(true);
    try {
      await acceptProposal(token, { name: name.trim(), email: email.trim() || null, mode, signature, selectedItems });
      onDone();
    } catch (e) {
      setError(friendlyError(e, 'Não foi possível registrar o aceite. Tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <Header title="Aceitar proposta" onClose={onClose} />
      <DialogContent>
        <Box sx={{ p: 2, borderRadius: '12px', bgcolor: tokens.muted, mb: 2.5 }}>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography sx={{ fontWeight: 750, fontSize: 24, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>{money(total)}</Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          <TextField label="Seu nome completo" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" error={name.length > 0 && !nameOk} />
          <TextField label="Seu e-mail (opcional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" helperText="Para receber o comprovante de quem enviou." />
          <Box>
            <Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ mb: 1.5, minHeight: 36 }}>
              <Tab value="drawn" label="Desenhar assinatura" sx={{ minHeight: 36 }} />
              <Tab value="typed" label="Digitar nome" sx={{ minHeight: 36 }} />
            </Tabs>
            {mode === 'drawn' ? (
              <SignaturePad ref={pad} onChange={setHasInk} />
            ) : (
              <Box sx={{ borderRadius: '12px', border: `1px dashed ${tokens.borderStrong}`, bgcolor: '#fff', height: 120, display: 'grid', placeItems: 'center', px: 2 }}>
                <Typography sx={{ fontFamily: displayFont, fontStyle: 'italic', fontSize: 40, color: name.trim() ? tokens.ink : tokens.textTertiary }} noWrap>
                  {name.trim() || 'Seu nome'}
                </Typography>
              </Box>
            )}
          </Box>
          <FormControlLabel
            control={<Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} />}
            label={<Typography variant="body2">Li a proposta e concordo com o escopo, os valores e as condições apresentadas por {orgName}.</Typography>}
            sx={{ alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.25 } }}
          />
          <Button
            size="large"
            variant="contained"
            disabled={!ready}
            loading={saving}
            onClick={submit}
            sx={{ bgcolor: brand.bg, color: brand.fg, minHeight: 52, fontSize: 16, '&:hover': { bgcolor: brand.bg, filter: 'brightness(0.92)' } }}
          >
            Aceitar e assinar
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
            <Lock size={13} style={{ marginTop: 2, flexShrink: 0 }} />
            Guardamos seu nome, a assinatura, a data, o IP e uma cópia do conteúdo aceito como comprovante. Não é assinatura com certificado digital.
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export function ChangesDialog({ open, onClose, token, defaultName, orgName, onDone }: { open: boolean; onClose: () => void; token: string; defaultName: string; orgName: string; onDone: () => void }) {
  const fullScreen = useFullScreen();
  const [name, setName] = useState(defaultName);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const SUGGESTIONS = ['Dá para parcelar?', 'Preciso de um prazo menor', 'Quero tirar um item', 'Tenho uma dúvida sobre o escopo'];

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await requestChanges(token, name.trim(), message.trim());
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <Header title="Pedir um ajuste" onClose={onClose} />
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Conte o que você gostaria de mudar. {orgName} recebe sua mensagem e pode enviar uma versão ajustada no mesmo link.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          <TextField label="Seu nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {SUGGESTIONS.map((s) => (
              <Chip key={s} label={s} variant="outlined" onClick={() => setMessage((m) => (m ? `${m}\n${s}` : s))} />
            ))}
          </Stack>
          <TextField label="Mensagem" value={message} onChange={(e) => setMessage(e.target.value)} multiline minRows={4} slotProps={{ htmlInput: { maxLength: 1000 } }} helperText={`${message.length}/1000`} />
          <Button size="large" variant="contained" loading={saving} disabled={name.trim().length < 2 || message.trim().length < 3} onClick={submit}>
            Enviar pedido de ajuste
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export function DeclineDialog({ open, onClose, token, defaultName, onDone }: { open: boolean; onClose: () => void; token: string; defaultName: string; onDone: () => void }) {
  const fullScreen = useFullScreen();
  const [name, setName] = useState(defaultName);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const REASONS = ['O valor ficou acima do orçamento', 'O prazo não atende', 'Escolhi outra opção', 'Não é o momento'];

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await declineProposal(token, name.trim(), reason.trim() || null);
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <Header title="Recusar proposta" onClose={onClose} />
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tudo bem. Se puder, conte o motivo: ajuda quem enviou a fazer uma proposta melhor.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          <TextField label="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {REASONS.map((r) => (
              <Chip key={r} label={r} variant={reason === r ? 'filled' : 'outlined'} onClick={() => setReason(r)} />
            ))}
          </Stack>
          <TextField label="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} />
          <Button variant="outlined" color="error" size="large" loading={saving} disabled={name.trim().length < 2} onClick={submit}>
            Recusar proposta
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
