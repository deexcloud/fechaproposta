import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Dialog, InputBase, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { FilePlus2, FileText, Search, Settings, User } from 'lucide-react';
import { useClients, useProposals } from '@/hooks/queries';
import { effectiveStatus } from '@/lib/proposal';
import { isNavigationBlocked } from '@/lib/leaveGuard';
import { money } from '@/lib/format';
import { StatusChip } from './StatusChip';
import { tokens } from '@/theme/tokens';

interface Entry {
  key: string;
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  extra?: React.ReactNode;
  to: string;
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca rápida (Ctrl+K): propostas, clientes e atalhos. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const proposals = useProposals();
  const clients = useClients();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const q = normalize(query.trim());
    const actions: Entry[] = [
      { key: 'new', icon: <FilePlus2 />, primary: 'Nova proposta', to: '/painel/propostas/nova' },
      { key: 'settings', icon: <Settings />, primary: 'Configurações', to: '/painel/configuracoes' },
    ];
    const match = (...parts: (string | null | undefined)[]) => !q || normalize(parts.filter(Boolean).join(' ')).includes(q);
    const props = (proposals.data ?? [])
      .filter((p) => match(p.code, p.title, p.client?.name, p.client?.company))
      .slice(0, 8)
      .map<Entry>((p) => ({
        key: p.id,
        icon: <FileText />,
        primary: p.title,
        secondary: `${p.code} · ${p.client?.name ?? 'Sem cliente'} · ${money(p.total_amount)}`,
        extra: <StatusChip status={effectiveStatus(p)} size="small" />,
        to: `/painel/propostas/${p.id}`,
      }));
    const cls = q
      ? (clients.data ?? [])
          .filter((c) => match(c.name, c.company, c.email))
          .slice(0, 5)
          .map<Entry>((c) => ({ key: c.id, icon: <User />, primary: c.name, secondary: c.company ?? c.email ?? undefined, to: `/painel/clientes?cliente=${c.id}` }))
      : [];
    return [...actions.filter((a) => match(a.primary)), ...props, ...cls];
  }, [query, proposals.data, clients.data]);

  const go = (entry: Entry | undefined) => {
    if (!entry) return;
    onClose();
    // Editor com alteração não salva pergunta antes de sair.
    if (!isNavigationBlocked(entry.to)) navigate(entry.to);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { alignSelf: 'flex-start', mt: { xs: 2, sm: '12vh' } } } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1.5, borderBottom: `1px solid ${tokens.border}` }}>
        <Search size={18} color={tokens.textTertiary} />
        <InputBase
          autoFocus
          fullWidth
          placeholder="Buscar proposta, cliente ou ação…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, entries.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              go(entries[active]);
            }
          }}
          inputProps={{ 'aria-label': 'Buscar' }}
          sx={{ fontSize: 15 }}
        />
      </Box>
      <List sx={{ maxHeight: 420, overflowY: 'auto', p: 1 }}>
        {entries.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>Nada encontrado para “{query}”.</Typography>
        )}
        {entries.map((entry, i) => (
          <ListItemButton key={entry.key} selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(entry)}>
            <ListItemIcon sx={{ '& svg': { width: 17, height: 17 } }}>{entry.icon}</ListItemIcon>
            <ListItemText primary={entry.primary} secondary={entry.secondary} slotProps={{ primary: { noWrap: true, sx: { fontWeight: 550 } }, secondary: { noWrap: true } }} />
            {entry.extra}
          </ListItemButton>
        ))}
      </List>
    </Dialog>
  );
}
