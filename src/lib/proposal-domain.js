export const dbToUiStatus = { draft: 'Rascunho', ready: 'Pronta para envio', sent: 'Enviada', viewed: 'Visualizada', negotiating: 'Em negociação', accepted: 'Aceita', expired: 'Expirada' }
export const uiToDbStatus = Object.fromEntries(Object.entries(dbToUiStatus).map(([database, label]) => [label, database]))
export const avatarColors = ['lavender', 'peach', 'blue', 'mint', 'gold', 'rose']

export const statusTone = {
  'Rascunho': 'neutral',
  'Pronta para envio': 'violet',
  'Enviada': 'blue',
  'Visualizada': 'amber',
  'Em negociação': 'violet',
  'Aceita': 'green',
  'Expirada': 'muted',
}

export function proposalScope(proposal) {
  return {
    deliverables: proposal.deliverables?.length ? proposal.deliverables : proposal.items.map((item) => item.name),
    timeline: proposal.timeline || 'Prazo a combinar após o aceite',
    nextStep: proposal.nextStep || 'Após o aceite, vamos combinar o início do projeto e os materiais necessários.',
    notIncluded: proposal.notIncluded || '',
  }
}

export function mapProposal(row, index = 0) {
  const client = row.client || row.clients || {}
  const items = row.items || row.proposal_items || []
  return {
    dbId: row.id,
    clientId: row.client_id,
    id: row.code || row.id,
    shareToken: row.share_token,
    shareEnabled: row.share_enabled,
    title: row.title,
    client: client.name || '',
    email: client.email || '',
    initials: initials(client.name),
    color: avatarColors[index % avatarColors.length],
    date: (row.created_at || new Date().toISOString()).slice(0, 10),
    due: row.due_date,
    status: dbToUiStatus[row.status] || 'Rascunho',
    amount: Number(row.total_amount || 0),
    summary: row.summary || '',
    deliverables: row.deliverables || [],
    timeline: row.timeline || '',
    nextStep: row.next_step || '',
    notIncluded: row.exclusions || '',
    terms: row.terms || '',
    items: items.slice().sort((a, b) => (a.position || 0) - (b.position || 0)).map((item) => ({ name: item.name, qty: Number(item.quantity), price: Number(item.unit_price) })),
    signedBy: row.accepted_by || '',
    signedAt: row.accepted_at || '',
    signature: row.signature_text || '',
  }
}

export function databaseStatus(status) { return uiToDbStatus[status] || 'draft' }

export function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(value || 0))
}

export function shortDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value + 'T12:00:00')).replace('.', '')
}

export function longDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value + 'T12:00:00'))
}

export function initials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CL'
}

export function escapeHtml(value) {
  return String(value || '').replace(/[&<>\"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[character])
}

