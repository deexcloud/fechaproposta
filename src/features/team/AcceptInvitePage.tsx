import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { AuthLayout } from '@/layouts/AuthLayout';
import { BrandLoader } from '@/components/common';
import { useNotify } from '@/components/NotifyProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOrganization } from '@/features/organizations/OrganizationProvider';
import { friendlyError } from '@/lib/errors';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, acceptInvitation, getInvitation } from '@/services/team';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AcceptInvitePage() {
  const { token = '' } = useParams();
  const { user, loading, signOut } = useAuth();
  const { refresh, selectOrganization } = useOrganization();
  const navigate = useNavigate();
  const notify = useNotify();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = UUID.test(token);

  const invitation = useQuery({ queryKey: ['invitation', token], queryFn: () => getInvitation(token), enabled: valid });
  const from = `/convite/${token}`;

  if (loading || (valid && invitation.isPending)) return <BrandLoader />;

  const inv = invitation.data;
  if (!valid || !inv) {
    return (
      <AuthLayout title="Convite não encontrado">
        <Typography color="text.secondary">Confira se o link está completo ou peça um novo convite para a empresa.</Typography>
      </AuthLayout>
    );
  }
  if (inv.expired && !inv.accepted) {
    return (
      <AuthLayout title="Convite expirado">
        <Typography color="text.secondary">Este convite para a {inv.organization_name} venceu. Peça um novo para a empresa.</Typography>
      </AuthLayout>
    );
  }

  const accept = async () => {
    setError(null);
    setAccepting(true);
    try {
      const orgId = await acceptInvitation(token);
      await refresh();
      selectOrganization(orgId);
      notify.success(`Bem-vindo(a) à equipe da ${inv.organization_name}!`);
      navigate('/painel', { replace: true });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setAccepting(false);
    }
  };

  const wrongEmail = user && user.email?.toLowerCase() !== inv.email.toLowerCase();

  return (
    <AuthLayout title={`Convite da ${inv.organization_name}`} subtitle={`Você foi convidado(a) como ${ROLE_LABELS[inv.role]}.`}>
      <Stack spacing={2}>
        <Typography color="text.secondary">{ROLE_DESCRIPTIONS[inv.role]}</Typography>
        {error && <Alert severity="error">{error}</Alert>}

        {!user && (
          <>
            <Typography>
              Para aceitar, crie uma conta ou entre com o e-mail <strong>{inv.email}</strong>.
            </Typography>
            <Button component={RouterLink} to="/criar-conta" state={{ from, email: inv.email }} variant="contained" size="large">
              Criar conta e aceitar
            </Button>
            <Button component={RouterLink} to="/entrar" state={{ from }} variant="outlined">
              Já tenho conta
            </Button>
          </>
        )}

        {user && wrongEmail && (
          <>
            <Alert severity="warning">
              Você está conectado como <strong>{user.email}</strong>, mas o convite é para <strong>{inv.email}</strong>.
            </Alert>
            <Button variant="contained" onClick={() => signOut()}>Sair e entrar com {inv.email}</Button>
          </>
        )}

        {user && !wrongEmail && (
          <Button variant="contained" size="large" loading={accepting} onClick={accept}>
            {inv.accepted ? 'Abrir o painel' : 'Entrar na equipe'}
          </Button>
        )}
      </Stack>
    </AuthLayout>
  );
}
