import { useEffect, useState, type ReactElement } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  ButtonBase,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  BookOpen,
  Check,
  ChevronsUpDown,
  FileText,
  Home,
  LayoutTemplate,
  LogOut,
  Menu as MenuIcon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { BrandMark } from '@/components/common';
import { CommandPalette } from '@/components/CommandPalette';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOrganization } from '@/features/organizations/OrganizationProvider';
import { PaymentReturnNotice, SubscriptionBanner, TrialCard } from '@/features/subscription/subscription';
import { useProposals } from '@/hooks/queries';
import { getPublicMediaUrl } from '@/lib/supabase';
import { effectiveStatus } from '@/lib/proposal';
import { isPlatformAdmin } from '@/services/platform';
import { ROLE_LABELS } from '@/services/team';
import { shadows, tokens } from '@/theme/tokens';

const DRAWER_WIDTH = 256;

interface NavItem {
  label: string;
  to: string;
  icon: ReactElement;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Início', to: '/painel', icon: <Home />, exact: true },
  { label: 'Propostas', to: '/painel/propostas', icon: <FileText /> },
  { label: 'Clientes', to: '/painel/clientes', icon: <Users /> },
  { label: 'Catálogo', to: '/painel/catalogo', icon: <BookOpen /> },
  { label: 'Modelos', to: '/painel/modelos', icon: <LayoutTemplate /> },
];
const SETTINGS: NavItem = { label: 'Configurações', to: '/painel/configuracoes', icon: <Settings /> };

function useActive(): string | undefined {
  const { pathname } = useLocation();
  return [...NAV, SETTINGS].find((i) => (i.exact ? pathname === i.to : pathname.startsWith(i.to)))?.to;
}

/** Quantas propostas o cliente pediu para ajustar (selo no menu). */
function useNegotiatingCount(): number {
  const proposals = useProposals();
  return (proposals.data ?? []).filter((p) => effectiveStatus(p) === 'negotiating').length;
}

function OrgAvatar({ size = 34 }: { size?: number }) {
  const { organization } = useOrganization();
  if (!organization) return null;
  const logo = getPublicMediaUrl(organization.logo_path);
  return (
    <Avatar
      src={logo ?? undefined}
      variant="rounded"
      alt={organization.name}
      sx={{ width: size, height: size, borderRadius: '9px', bgcolor: organization.brand_color ?? tokens.primary, color: '#fff', fontWeight: 700, fontSize: size * 0.42, '& img': { objectFit: 'contain', bgcolor: '#fff' } }}
    >
      {organization.name.charAt(0).toUpperCase()}
    </Avatar>
  );
}

function OrgSwitcher() {
  const { organization, role, memberships, selectOrganization } = useOrganization();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!organization) return null;
  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Trocar de empresa"
        sx={{ width: '100%', justifyContent: 'flex-start', gap: 1.25, p: 1, borderRadius: '10px', textAlign: 'left', '&:hover': { bgcolor: tokens.hover } }}
      >
        <OrgAvatar />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 650, fontSize: 14 }}>{organization.name}</Typography>
          <Typography noWrap variant="caption" color="text.secondary">{role ? ROLE_LABELS[role] : ''}</Typography>
        </Box>
        <ChevronsUpDown size={16} color={tokens.textTertiary} />
      </ButtonBase>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { width: 240 } } }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, py: 0.5, display: 'block' }}>Suas empresas</Typography>
        {memberships.map((m) => (
          <MenuItem
            key={m.organization.id}
            onClick={() => {
              selectOrganization(m.organization.id);
              setAnchor(null);
              navigate('/painel');
            }}
          >
            <ListItemText primary={m.organization.name} secondary={ROLE_LABELS[m.role]} />
            {m.organization.id === organization.id && <Check size={16} />}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem component={RouterLink} to="/painel/configurar?nova=1" onClick={() => setAnchor(null)}>
          <Plus /> Criar outra empresa
        </MenuItem>
      </Menu>
    </>
  );
}

function UserRow() {
  const { user, signOut } = useAuth();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const admin = useQuery({ queryKey: ['is-platform-admin', user?.id], queryFn: isPlatformAdmin, enabled: Boolean(user), staleTime: Infinity });
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? '';
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', px: 1 }}>
      <Avatar sx={{ width: 32, height: 32, bgcolor: tokens.muted, color: tokens.textPrimary, fontSize: 13, fontWeight: 650 }}>{name.charAt(0).toUpperCase()}</Avatar>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>{name}</Typography>
        <Typography noWrap variant="caption" color="text.secondary" sx={{ display: 'block' }}>{user?.email}</Typography>
      </Box>
      <IconButton size="small" aria-label="Opções da conta" onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreHorizontal size={18} />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        {admin.data && (
          <MenuItem component={RouterLink} to="/admin" onClick={() => setAnchor(null)}>
            <Shield /> Administração
          </MenuItem>
        )}
        <MenuItem onClick={() => signOut()}>
          <LogOut /> Sair
        </MenuItem>
      </Menu>
    </Stack>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const active = useActive();
  const negotiating = useNegotiatingCount();
  return (
    <List component="nav" aria-label="Menu principal" dense disablePadding>
      {NAV.map((item) => (
        <ListItemButton key={item.to} component={RouterLink} to={item.to} selected={active === item.to} onClick={onNavigate} sx={{ mb: 0.25 }}>
          <ListItemIcon sx={{ '& svg': { width: 18, height: 18 } }}>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontWeight: active === item.to ? 650 : 500 } } }} />
          {item.to === '/painel/propostas' && negotiating > 0 && (
            <Box
              component="span"
              title={`${negotiating} pedido(s) de ajuste`}
              sx={{ minWidth: 20, height: 20, px: 0.75, borderRadius: '10px', bgcolor: tokens.violet, color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }}
            >
              {negotiating}
            </Box>
          )}
        </ListItemButton>
      ))}
    </List>
  );
}

function NewProposalButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button component={RouterLink} to="/painel/propostas/nova" onClick={onClick} variant="contained" fullWidth startIcon={<Plus />} sx={{ justifyContent: 'flex-start', boxShadow: shadows.sm }}>
      Nova proposta
    </Button>
  );
}

export function AppLayout() {
  const active = useActive();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // O editor ocupa a tela toda no celular (tem barra de ações própria).
  const immersive = /\/(nova|editar)$/.test(pathname) || /\/modelos\/(novo|[^/]+)$/.test(pathname);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      {/* Menu lateral (computador) */}
      <Drawer
        variant="permanent"
        className="no-print"
        sx={{ display: { xs: 'none', md: 'block' }, width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: tokens.surface } }}
      >
        <Stack sx={{ height: '100%', p: 1.5 }}>
          <Box sx={{ px: 1, pt: 0.75, pb: 2 }}>
            <RouterLink to="/painel" aria-label="Início"><BrandMark size="small" /></RouterLink>
          </Box>
          <OrgSwitcher />
          <Box sx={{ mt: 1.5, mb: 1 }}><NewProposalButton /></Box>
          <ButtonBase
            onClick={() => setPaletteOpen(true)}
            sx={{ justifyContent: 'flex-start', gap: 1, px: 1.25, height: 36, borderRadius: '8px', border: `1px solid ${tokens.border}`, color: tokens.textTertiary, mb: 2, '&:hover': { bgcolor: tokens.hover } }}
          >
            <Search size={15} />
            <Typography variant="body2" sx={{ flexGrow: 1, textAlign: 'left' }}>Buscar…</Typography>
            <Box component="kbd" sx={{ fontFamily: 'inherit', fontSize: 11, px: 0.75, py: 0.1, borderRadius: '4px', border: `1px solid ${tokens.border}` }}>Ctrl K</Box>
          </ButtonBase>
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <NavList />
          </Box>
          <Stack spacing={1.5}>
            <TrialCard />
            <ListItemButton component={RouterLink} to={SETTINGS.to} selected={active === SETTINGS.to} dense>
              <ListItemIcon sx={{ '& svg': { width: 18, height: 18 } }}>{SETTINGS.icon}</ListItemIcon>
              <ListItemText primary={SETTINGS.label} slotProps={{ primary: { sx: { fontWeight: 500 } } }} />
            </ListItemButton>
            <Divider />
            <UserRow />
          </Stack>
        </Stack>
      </Drawer>

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Topo (celular) */}
        {!immersive && (
          <Stack
            direction="row"
            className="no-print"
            sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', justifyContent: 'space-between', px: 2, height: 56, position: 'sticky', top: 0, zIndex: 10, bgcolor: 'rgba(248,245,238,.9)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${tokens.border}` }}
          >
            <RouterLink to="/painel" aria-label="Início"><BrandMark size="small" /></RouterLink>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <IconButton aria-label="Buscar" onClick={() => setPaletteOpen(true)}><Search size={19} /></IconButton>
              <ButtonBase aria-label="Mais opções" onClick={() => setMoreOpen(true)} sx={{ borderRadius: '9px' }}><OrgAvatar size={30} /></ButtonBase>
            </Stack>
          </Stack>
        )}

        <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, sm: 3, lg: 5 }, py: { xs: 2.5, md: 4 }, pb: { xs: immersive ? 2 : 12, md: 6 } }}>
          <Box sx={{ maxWidth: 1240, mx: 'auto' }}>
            <PaymentReturnNotice />
            {!immersive && <SubscriptionBanner />}
            <Box key={pathname} className="fp-fade-up">
              <Outlet />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Navegação inferior (celular) */}
      {!immersive && (
        <Paper
          className="no-print"
          sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', left: 0, right: 0, bottom: 0, borderTop: `1px solid ${tokens.border}`, pb: 'env(safe-area-inset-bottom)', zIndex: 20, bgcolor: 'rgba(255,255,255,.94)', backdropFilter: 'blur(10px)' }}
        >
          <BottomNavigation showLabels value={active ?? 'mais'} sx={{ bgcolor: 'transparent', height: 62 }}>
            <BottomNavigationAction label="Início" value="/painel" icon={<Home size={20} />} component={RouterLink} to="/painel" />
            <BottomNavigationAction label="Propostas" value="/painel/propostas" icon={<FileText size={20} />} component={RouterLink} to="/painel/propostas" />
            <BottomNavigationAction
              label="Nova"
              value="nova"
              aria-label="Nova proposta"
              onClick={() => navigate('/painel/propostas/nova')}
              icon={<Box sx={{ width: 40, height: 40, mt: -1.25, borderRadius: '12px', bgcolor: tokens.primary, color: '#fff', display: 'grid', placeItems: 'center', boxShadow: shadows.md }}><Plus size={22} /></Box>}
            />
            <BottomNavigationAction label="Clientes" value="/painel/clientes" icon={<Users size={20} />} component={RouterLink} to="/painel/clientes" />
            <BottomNavigationAction label="Mais" value="mais" icon={<MenuIcon size={20} />} onClick={() => setMoreOpen(true)} />
          </BottomNavigation>
        </Paper>
      )}

      <Drawer anchor="bottom" open={moreOpen} onClose={() => setMoreOpen(false)} slotProps={{ paper: { sx: { borderTopLeftRadius: 18, borderTopRightRadius: 18, pb: 'env(safe-area-inset-bottom)', maxHeight: '88dvh' } } }}>
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: tokens.border, mx: 'auto' }} />
          <OrgSwitcher />
          <NewProposalButton onClick={() => setMoreOpen(false)} />
          <NavList onNavigate={() => setMoreOpen(false)} />
          <ListItemButton component={RouterLink} to={SETTINGS.to} onClick={() => setMoreOpen(false)} dense>
            <ListItemIcon sx={{ '& svg': { width: 18, height: 18 } }}>{SETTINGS.icon}</ListItemIcon>
            <ListItemText primary={SETTINGS.label} />
          </ListItemButton>
          <TrialCard />
          <Divider />
          <UserRow />
        </Stack>
      </Drawer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </Box>
  );
}
