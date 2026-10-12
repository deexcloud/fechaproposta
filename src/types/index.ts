// Tipos das tabelas e funções do Supabase usadas pelo app.

export type MemberRole = 'owner' | 'manager' | 'staff';

export interface Organization {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  website: string | null;
  document: string | null;
  city: string | null;
  logo_path: string | null;
  brand_color: string | null;
  default_validity_days: number;
  default_terms: string | null;
  default_next_step: string | null;
  next_proposal_number: number;
  onboarding_completed_at: string | null;
  trial_ends_at: string;
  paid_until: string | null;
  created_at: string;
  updated_at: string;
}

export type OrganizationUpdate = Partial<
  Pick<
    Organization,
    | 'name' | 'email' | 'whatsapp' | 'website' | 'document' | 'city'
    | 'logo_path' | 'brand_color'
    | 'default_validity_days' | 'default_terms' | 'default_next_step'
    | 'onboarding_completed_at'
  >
>;

export interface Membership {
  role: MemberRole;
  organization: Organization;
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  company: string | null;
  email: string | null;
  whatsapp: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientInput = Pick<Client, 'name' | 'company' | 'email' | 'whatsapp' | 'notes'>;

export interface Service {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  is_active: boolean;
  created_at: string;
}

export type ServiceInput = Pick<Service, 'name' | 'description' | 'unit' | 'unit_price' | 'is_active'>;

/** Status gravado no banco. */
export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'negotiating' | 'accepted' | 'declined';
/** Status mostrado (inclui "expirada", calculada pela validade). */
export type EffectiveStatus = ProposalStatus | 'expired';

export interface ProposalItem {
  id?: string;
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  is_optional: boolean;
}

/** Conteúdo editável de uma proposta (também é o formato dos modelos). */
export interface ProposalContent {
  title: string;
  summary: string | null;
  deliverables: string[];
  timeline: string | null;
  next_step: string | null;
  exclusions: string | null;
  terms: string | null;
  items: ProposalItem[];
}

export interface Proposal extends Omit<ProposalContent, 'items'> {
  id: string;
  organization_id: string;
  client_id: string | null;
  number: number;
  code: string;
  valid_until: string;
  discount: number;
  total_amount: number;
  optional_amount: number;
  status: ProposalStatus;
  share_token: string;
  sent_at: string | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  accepted_at: string | null;
  accepted_total: number | null;
  declined_at: string | null;
  decline_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalListItem extends Proposal {
  client: Pick<Client, 'id' | 'name' | 'company' | 'email' | 'whatsapp'> | null;
}

export interface ProposalFull extends ProposalListItem {
  items: (ProposalItem & { id: string; position: number })[];
}

export type ProposalEventKind =
  | 'created' | 'updated' | 'sent' | 'viewed' | 'change_requested'
  | 'accepted' | 'declined' | 'reopened' | 'duplicated';

export interface ProposalEvent {
  id: string;
  proposal_id: string;
  kind: ProposalEventKind;
  actor: 'team' | 'client';
  actor_user: string | null;
  actor_name: string | null;
  message: string | null;
  created_at: string;
}

export interface ActivityEvent extends ProposalEvent {
  proposal: Pick<Proposal, 'id' | 'code' | 'title'> & { client: Pick<Client, 'name'> | null };
}

export interface ProposalAcceptance {
  proposal_id: string;
  signer_name: string;
  signer_email: string | null;
  signature_mode: 'typed' | 'drawn' | 'manual';
  signature_data: string | null;
  selected_items: string[];
  total: number;
  content_hash: string;
  ip: string | null;
  user_agent: string | null;
  accepted_at: string;
}

/** Dados da proposta no link público (get_public_proposal). */
export interface PublicProposal extends ProposalContent {
  id: string;
  code: string;
  valid_until: string;
  discount: number;
  total_amount: number;
  optional_amount: number;
  status: EffectiveStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  items: (ProposalItem & { id: string })[];
  client: { name: string; company: string | null } | null;
  organization: Pick<Organization, 'name' | 'email' | 'whatsapp' | 'website' | 'document' | 'city' | 'logo_path' | 'brand_color'>;
  decline_reason?: string | null;
  declined_at?: string | null;
  acceptance?: {
    signer_name: string;
    signature_mode: 'typed' | 'drawn' | 'manual';
    signature_data: string | null;
    selected_items: string[];
    total: number;
    accepted_at: string;
    content_hash: string;
  } | null;
  messages?: { actor_name: string | null; message: string; created_at: string }[];
}

export interface ProposalTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  content: Partial<ProposalContent>;
  created_at: string;
  updated_at: string;
}
