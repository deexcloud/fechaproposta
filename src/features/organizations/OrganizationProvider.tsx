import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { listMyMemberships } from '@/services/organizations';
import type { MemberRole, Membership, Organization } from '@/types';

const STORAGE_KEY = 'fechaproposta.currentOrganization';

interface OrganizationContextValue {
  memberships: Membership[];
  /** Empresa em uso no painel (null se o usuário ainda não criou nenhuma). */
  organization: Organization | null;
  role: MemberRole | null;
  canManage: boolean;
  loading: boolean;
  error: unknown;
  selectOrganization: (id: string) => void;
  /** Atualiza a empresa no cache após salvar, sem esperar nova consulta. */
  applyOrganization: (org: Organization) => void;
  refresh: () => Promise<unknown>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export const membershipsKey = (userId: string | undefined) => ['memberships', userId] as const;

function readStoredId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(readStoredId);

  const query = useQuery({
    queryKey: membershipsKey(user?.id),
    queryFn: () => listMyMemberships(user!.id),
    enabled: Boolean(user),
  });

  const memberships = useMemo(() => query.data ?? [], [query.data]);
  const current = memberships.find((m) => m.organization.id === selectedId) ?? memberships[0] ?? null;

  const selectOrganization = useCallback((id: string) => {
    setSelectedId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* armazenamento indisponível: seleção vale só nesta sessão */
    }
  }, []);

  const applyOrganization = useCallback(
    (org: Organization) => {
      queryClient.setQueryData<Membership[]>(membershipsKey(user?.id), (old) =>
        old?.some((m) => m.organization.id === org.id)
          ? old.map((m) => (m.organization.id === org.id ? { ...m, organization: org } : m))
          : [...(old ?? []), { role: 'owner', organization: org }],
      );
    },
    [queryClient, user?.id],
  );

  const value: OrganizationContextValue = {
    memberships,
    organization: current?.organization ?? null,
    role: current?.role ?? null,
    canManage: current?.role === 'owner' || current?.role === 'manager',
    loading: query.isPending && Boolean(user),
    error: query.error,
    selectOrganization,
    applyOrganization,
    refresh: query.refetch,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error('useOrganization precisa estar dentro de <OrganizationProvider>');
  return ctx;
}

/** Para telas que só existem com uma empresa selecionada (protegidas por RequireOrganization). */
export function useCurrentOrganization(): Organization {
  const { organization } = useOrganization();
  if (!organization) throw new Error('Nenhuma empresa selecionada');
  return organization;
}
