import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { BrandLoader, ErrorState } from '@/components/common';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOrganization } from '@/features/organizations/OrganizationProvider';
import { friendlyError } from '@/lib/errors';

/** Exige login; guarda a página pedida para voltar a ela depois de entrar. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <BrandLoader />;
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Exige uma empresa. Quem ainda não criou é levado ao assistente. */
export function RequireOrganization() {
  const { organization, loading, error, refresh } = useOrganization();
  if (loading) return <BrandLoader label="Abrindo sua empresa…" />;
  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 560, mx: 'auto' }}>
        <ErrorState message={friendlyError(error, 'Não foi possível carregar sua empresa.')} onRetry={() => refresh()} />
      </Box>
    );
  }
  if (!organization) return <Navigate to="/painel/configurar" replace />;
  return <Outlet />;
}
