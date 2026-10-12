import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Check, Copy, ExternalLink, Mail, MessageCircle, PartyPopper, X } from 'lucide-react';
import { useNotify } from '@/components/NotifyProvider';
import { useCurrentOrganization } from '@/features/organizations/OrganizationProvider';
import { keys, useInvalidateProposals } from '@/hooks/queries';
import { friendlyError } from '@/lib/errors';
import { formatPhone, money } from '@/lib/format';
import { followUpMessage, itemTotal, mailtoUrl, publicProposalUrl, shareMessage, whatsappUrl } from '@/lib/proposal';
import { saveTemplate } from '@/services/catalog';
import { markDeclined, recordManualAcceptance, sendProposal } from '@/services/proposals';
import type { ProposalFull } from '@/types';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function DialogHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <DialogTitle sx={{ pr: 6 }}>
      {title}
      <IconButton aria-label="Fechar" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}><X size={18} /></IconButton>
    </DialogTitle>
  );
}

/**
 * Enviar ou compartilhar. Ao abrir uma proposta em rascunho, ela é marcada
 * como enviada e o link passa a funcionar.
 */
export function ShareDialog({ open, onClose, proposal, followUp = false }: { open: boolean; onClose: () => void; proposal: ProposalFull; followUp?: boolean }) {
  const org = useCurrentOrganization();
  const notify = useNotify();
  const invalidate = useInvalidateProposals();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);
  const link = publicProposalUrl(proposal.share_token);
  const input = { clientName: proposal.client?.name, title: proposal.title, link, validUntil: proposal.valid_until, senderName: org.name };
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setMessage(followUp ? followUpMessage(input) : shareMessage(input));
    setError(null);
    if (proposal.status !== 'draft') return;
    setSending(true);
    sendProposal(proposal.id)
      .then(() => {
        setJustSent(true);
        invalidate(proposal.id);
      })
      .catch((e) => setError(friendlyError(e, 'Não foi possível ativar o link.')))
      .finally(() => setSending(false));
  }, [open]);

  const ready = !sending && !error;
  const phone = proposal.client?.whatsapp;
  const email = proposal.client?.email;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogHeader title={followUp ? 'Lembrar o cliente' : justSent ? 'Proposta pronta para enviar' : 'Enviar proposta'} onClose={onClose} />
      <DialogContent>
        {justSent && (
          <Alert icon={<PartyPopper size={18} />} severity="success" sx={{ mb: 2 }}>
            O link está ativo. Escolha como mandar: avisamos aqui quando {proposal.client?.name.split(' ')[0] ?? 'o cliente'} abrir.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="Link da proposta"
          value={link}
          size="small"
          sx={{ mt: 1 }}
          slotProps={{
            input: {
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Copiar link"
                    disabled={!ready}
                    onClick={async () => (await copyText(link)) ? notify.success('Link copiado.') : notify.error('Não foi possível copiar. Selecione e copie manualmente.')}
                  >
                    <Copy size={16} />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          onFocus={(e) => e.target.select()}
        />

        <TextField label="Mensagem" multiline minRows={5} value={message} onChange={(e) => setMessage(e.target.value)} sx={{ mt: 2 }} />

        <Box sx={{ mt: 2, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Button variant="contained" size="large" startIcon={<MessageCircle />} disabled={!ready} href={whatsappUrl(message, phone)} target="_blank" rel="noopener" sx={{ bgcolor: '#1F8F4E', '&:hover': { bgcolor: '#187A42' } }}>
            WhatsApp{phone ? ` · ${formatPhone(phone)}` : ''}
          </Button>
          <Button variant="outlined" size="large" startIcon={<Mail />} disabled={!ready} href={mailtoUrl(email, `Proposta: ${proposal.title}`, message)}>
            E-mail{email ? '' : ' (sem endereço)'}
          </Button>
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, justifyContent: 'center' }}>
          <Button size="small" color="inherit" startIcon={<Copy />} disabled={!ready} onClick={async () => (await copyText(message)) && notify.success('Mensagem copiada.')}>
            Copiar mensagem
          </Button>
          <Button size="small" color="inherit" startIcon={<ExternalLink />} disabled={!ready} href={link} target="_blank" rel="noopener">
            Abrir como cliente
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

/** Aceite combinado por fora (WhatsApp, reunião): a equipe registra. */
export function ManualAcceptDialog({ open, onClose, proposal }: { open: boolean; onClose: () => void; proposal: ProposalFull }) {
  const notify = useNotify();
  const invalidate = useInvalidateProposals();
  const [name, setName] = useState(proposal.client?.name ?? '');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optional = proposal.items.filter((i) => i.is_optional);
  const total = proposal.total_amount + optional.filter((i) => selected.includes(i.id)).reduce((s, i) => s + itemTotal(i), 0);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await recordManualAcceptance(proposal.id, name.trim(), selected, note.trim() || null);
      invalidate(proposal.id);
      notify.success('Aceite registrado. Parabéns pelo fechamento!');
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogHeader title="Registrar aceite" onClose={onClose} />
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Use quando o cliente aprovou por outro canal. Fica registrado quem aprovou e a data.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          <TextField label="Quem aprovou" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          {optional.length > 0 && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Opcionais incluídos</Typography>
              {optional.map((i) => (
                <FormControlLabel
                  key={i.id}
                  sx={{ display: 'flex' }}
                  control={<Checkbox size="small" checked={selected.includes(i.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, i.id] : s.filter((x) => x !== i.id)))} />}
                  label={<Typography variant="body2">{i.name} · + {money(itemTotal(i))}</Typography>}
                />
              ))}
            </Box>
          )}
          <TextField label="Observação (opcional)" placeholder="Ex.: Aprovou por WhatsApp em 12/10" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
          <Typography variant="body2">Total fechado: <strong>{money(total)}</strong></Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<Check />} loading={saving} disabled={name.trim().length < 3} onClick={submit}>Registrar aceite</Button>
      </DialogActions>
    </Dialog>
  );
}

export function DeclineDialog({ open, onClose, proposal }: { open: boolean; onClose: () => void; proposal: ProposalFull }) {
  const notify = useNotify();
  const invalidate = useInvalidateProposals();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await markDeclined(proposal.id, reason.trim() || null);
      invalidate(proposal.id);
      notify.info('Proposta marcada como recusada.');
      onClose();
    } catch (e) {
      notify.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogHeader title="Marcar como recusada" onClose={onClose} />
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Saber o motivo ajuda a melhorar as próximas propostas.</Typography>
        <TextField label="Motivo (opcional)" placeholder="Ex.: Preço acima do orçamento" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} autoFocus />
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="error" loading={saving} onClick={submit}>Marcar recusada</Button>
      </DialogActions>
    </Dialog>
  );
}

export function SaveTemplateDialog({ open, onClose, proposal }: { open: boolean; onClose: () => void; proposal: ProposalFull }) {
  const org = useCurrentOrganization();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [name, setName] = useState(proposal.title);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await saveTemplate(org.id, null, {
        name: name.trim(),
        description: null,
        content: {
          title: proposal.title,
          summary: proposal.summary,
          deliverables: proposal.deliverables,
          timeline: proposal.timeline,
          next_step: proposal.next_step,
          exclusions: proposal.exclusions,
          terms: proposal.terms,
          items: proposal.items.map(({ name: n, description, unit, quantity, unit_price, is_optional }) => ({ name: n, description, unit, quantity, unit_price, is_optional })),
        },
      });
      queryClient.invalidateQueries({ queryKey: keys.templates(org.id) });
      notify.success('Modelo salvo. Use em Nova proposta → Começar de um modelo.');
      onClose();
    } catch (e) {
      notify.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogHeader title="Salvar como modelo" onClose={onClose} />
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Escopo, itens e condições viram um ponto de partida. O cliente e a validade não entram.
        </Typography>
        <TextField label="Nome do modelo" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>Cancelar</Button>
        <Button variant="contained" loading={saving} disabled={name.trim().length < 2} onClick={submit}>Salvar modelo</Button>
      </DialogActions>
    </Dialog>
  );
}

