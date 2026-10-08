import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import MuiDialog from '@mui/material/Dialog'
import Snackbar from '@mui/material/Snackbar'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { ChevronRight, FileText, Plus, X } from 'lucide-react'
import { money, shortDate, statusTone } from '../lib/proposal-domain'

export function Brand() {
  return <div className="brand-lockup" aria-label="FechaProposta"><span className="brand-symbol"><i /><i /><i /><i /></span><span>fecha<span className="brand-dot">.</span></span></div>
}

export function Status({ value }) {
  const tone = statusTone[value] || 'neutral'
  return <span className={'status-pill tone-' + tone}><i />{value}</span>
}

export function Avatar({ name, mark, color = 'lavender', small = false }) {
  return <span className={'avatar avatar-' + color + (small ? ' avatar-small' : '')} aria-hidden="true">{mark || initials(name)}</span>
}

export function Modal({ title, eyebrow, children, onClose, wide = false, className = '' }) {
  return (
    <MuiDialog open onClose={onClose} fullWidth maxWidth={wide ? 'md' : 'sm'} aria-labelledby="app-modal-title" slotProps={{ paper: { component: 'section', tabIndex: -1, className: 'modal-card' + (wide ? ' modal-wide' : '') + (className ? ' ' + className : '') } }}>
        <div className="modal-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id="app-modal-title">{title}</h2></div><Button className="icon-btn" onClick={onClose} aria-label="Fechar janela"><X size={18} /></Button></div>
        {children}
    </MuiDialog>
  )
}

export function Toast({ children, onClose, action }) {
  return <Snackbar open anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} autoHideDuration={5200} onClose={onClose}>
    <Alert severity="success" variant="outlined" onClose={onClose} action={action && <Button color="inherit" size="small" onClick={action.onClick}>{action.label}</Button>} sx={{ alignItems: 'center', bgcolor: 'background.paper' }}>{children}</Alert>
  </Snackbar>
}

export function ProposalRow({ proposal, onOpen }) {
  return <TableRow className="proposal-row" hover tabIndex={0} aria-label={'Abrir proposta ' + proposal.title + ' de ' + proposal.client} onClick={() => onOpen(proposal)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(proposal) } }}>
    <TableCell><span className="proposal-name"><Avatar name={proposal.client} mark={proposal.initials} color={proposal.color} small /><span><strong>{proposal.title}</strong><small>{proposal.id}</small></span></span></TableCell>
    <TableCell className="proposal-client">{proposal.client}</TableCell><TableCell className="proposal-date">{shortDate(proposal.date)}</TableCell><TableCell className="proposal-value">{money(proposal.amount)}</TableCell><TableCell className="proposal-status"><Status value={proposal.status} /></TableCell><TableCell className="proposal-chevron"><ChevronRight size={16} /></TableCell>
  </TableRow>
}

export function ProposalTable({ proposals, onOpen, full = false }) {
  return <TableContainer className={'proposal-table' + (full ? ' full-table' : '')}>
    <Table size="small" aria-label="Propostas">
      <TableHead><TableRow><TableCell>PROPOSTA</TableCell><TableCell>CLIENTE</TableCell><TableCell>CRIADA EM</TableCell><TableCell align="right">VALOR</TableCell><TableCell>STATUS</TableCell><TableCell padding="checkbox" /></TableRow></TableHead>
      <TableBody>{proposals.map((proposal) => <ProposalRow key={proposal.id} proposal={proposal} onOpen={onOpen} />)}</TableBody>
    </Table>
  </TableContainer>
}

export function EmptyState({ search, onCreate, onReset }) {
  return <div className="empty-state"><span><FileText size={21} /></span><strong>{search ? 'Nenhuma proposta encontrada' : 'Sua próxima proposta começa aqui'}</strong><p>{search ? 'Tente buscar pelo nome do cliente, título ou código.' : 'Crie uma proposta clara e acompanhe cada passo até o aceite.'}</p><div>{search && <Button className="btn-secondary" onClick={onReset}>Limpar busca</Button>}<Button className="btn-primary" onClick={onCreate}><Plus size={15} /> Nova proposta</Button></div></div>
}

