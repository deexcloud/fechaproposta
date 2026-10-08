import Button from '@mui/material/Button'
import { ArrowUpRight, Plus } from 'lucide-react'

export function ClientsView({ clients, money, shortDate, Avatar, EmptyState, setCreateOpen, openClient }) {
  return <section className="subpage"><div className="page-title-row"><div><h1>Clientes</h1><p>Uma visão por parceria, com contexto e próximos passos.</p></div><Button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> Nova proposta</Button></div>{clients.length ? <div className="client-grid">{clients.map((client) => <Button className="client-card panel client-summary-card" key={client.client} onClick={() => openClient(client.client)}><div className="client-card-top"><Avatar name={client.client} mark={client.initials} color={client.color} /><ArrowUpRight size={15} /></div><strong>{client.client}</strong><span>{client.email}</span><div className="client-card-metrics"><span><b>{client.count}</b> proposta{client.count === 1 ? '' : 's'}</span><span><b>{money(client.total)}</b> total</span></div><small>{client.open ? `${client.open} em acompanhamento` : 'Sem propostas em acompanhamento'} · última atividade {shortDate(client.lastActivity)}</small></Button>)}</div> : <EmptyState onCreate={() => setCreateOpen(true)} />}</section>
}

