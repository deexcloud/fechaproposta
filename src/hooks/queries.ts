// Consultas compartilhadas entre telas. As chaves começam pela empresa para
// que trocar de empresa nunca mostre dados da anterior.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentOrganization } from '@/features/organizations/OrganizationProvider';
import { listClients } from '@/services/clients';
import { listServices, listTemplates } from '@/services/catalog';
import { getAcceptance, getProposal, listProposalEvents, listProposals, listRecentActivity } from '@/services/proposals';

export const keys = {
  proposals: (org: string) => ['proposals', org] as const,
  proposal: (id: string) => ['proposal', id] as const,
  events: (id: string) => ['proposal-events', id] as const,
  acceptance: (id: string) => ['proposal-acceptance', id] as const,
  activity: (org: string) => ['activity', org] as const,
  clients: (org: string) => ['clients', org] as const,
  services: (org: string) => ['services', org] as const,
  templates: (org: string) => ['templates', org] as const,
};

/** Lista de propostas. Atualiza a cada minuto para mostrar quando o cliente abre. */
export function useProposals() {
  const org = useCurrentOrganization();
  return useQuery({ queryKey: keys.proposals(org.id), queryFn: () => listProposals(org.id), refetchInterval: 60_000 });
}

export function useProposal(id: string | undefined) {
  return useQuery({ queryKey: keys.proposal(id ?? ''), queryFn: () => getProposal(id!), enabled: Boolean(id), refetchInterval: 60_000 });
}

export function useProposalEvents(id: string | undefined) {
  return useQuery({ queryKey: keys.events(id ?? ''), queryFn: () => listProposalEvents(id!), enabled: Boolean(id), refetchInterval: 60_000 });
}

export function useAcceptance(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: keys.acceptance(id ?? ''), queryFn: () => getAcceptance(id!), enabled: Boolean(id) && enabled });
}

export function useActivity() {
  const org = useCurrentOrganization();
  return useQuery({ queryKey: keys.activity(org.id), queryFn: () => listRecentActivity(org.id), refetchInterval: 60_000 });
}

export function useClients() {
  const org = useCurrentOrganization();
  return useQuery({ queryKey: keys.clients(org.id), queryFn: () => listClients(org.id) });
}

export function useServices() {
  const org = useCurrentOrganization();
  return useQuery({ queryKey: keys.services(org.id), queryFn: () => listServices(org.id) });
}

export function useTemplates() {
  const org = useCurrentOrganization();
  return useQuery({ queryKey: keys.templates(org.id), queryFn: () => listTemplates(org.id) });
}

/** Depois de mexer numa proposta: recarrega lista, detalhe, histórico e o feed. */
export function useInvalidateProposals() {
  const queryClient = useQueryClient();
  const org = useCurrentOrganization();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: keys.proposals(org.id) });
    queryClient.invalidateQueries({ queryKey: keys.activity(org.id) });
    queryClient.invalidateQueries({ queryKey: keys.clients(org.id) });
    if (id) {
      queryClient.invalidateQueries({ queryKey: keys.proposal(id) });
      queryClient.invalidateQueries({ queryKey: keys.events(id) });
      queryClient.invalidateQueries({ queryKey: keys.acceptance(id) });
    }
  };
}
