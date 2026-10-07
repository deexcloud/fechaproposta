import { useEffect, useMemo, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import Checkbox from '@mui/material/Checkbox'
import InputAdornment from '@mui/material/InputAdornment'
import MuiMenu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import MuiDialog from '@mui/material/Dialog'
import Popover from '@mui/material/Popover'
import Snackbar from '@mui/material/Snackbar'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import {
  Activity, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Copy,
  Download, Ellipsis, FileCheck2, FileSignature, FileText, Filter, Handshake,
  LayoutDashboard, LifeBuoy, Mail, Menu, Plus, Search, Send, Settings2,
  ShieldCheck, Sparkles, Users, WalletCards, X,
} from 'lucide-react'
import LandingPage from './components/landing-page'
import ProductTour from './components/product-tour'
import { PlatformAccess, WorkspaceSetup } from './components/account-flows'
import { supabase } from './lib/supabase'

const navGroups = [
  { title: 'ESPAÇO DE TRABALHO', items: [{ id: 'inicio', label: 'Visão geral', icon: LayoutDashboard }, { id: 'propostas', label: 'Propostas', icon: FileText }, { id: 'clientes', label: 'Clientes', icon: Users }, { id: 'modelos', label: 'Modelos', icon: FileCheck2 }] },
  { title: 'ACOMPANHAMENTO', items: [{ id: 'resultados', label: 'Resultados', icon: Activity }] },
]

const statusTone = {
  'Rascunho': 'neutral',
  'Pronta para envio': 'violet',
  'Enviada': 'blue',
  'Visualizada': 'amber',
  'Em negociação': 'violet',
  'Aceita': 'green',
  'Expirada': 'muted',
}

const dbToUiStatus = { draft: 'Rascunho', ready: 'Pronta para envio', sent: 'Enviada', viewed: 'Visualizada', negotiating: 'Em negociação', accepted: 'Aceita', expired: 'Expirada' }
const uiToDbStatus = Object.fromEntries(Object.entries(dbToUiStatus).map(([database, label]) => [label, database]))
const avatarColors = ['lavender', 'peach', 'blue', 'mint', 'gold', 'rose']

function proposalScope(proposal) {
  return {
    deliverables: proposal.deliverables?.length ? proposal.deliverables : proposal.items.map((item) => item.name),
    timeline: proposal.timeline || 'Prazo a combinar após o aceite',
    nextStep: proposal.nextStep || 'Após o aceite, vamos combinar o início do projeto e os materiais necessários.',
    notIncluded: proposal.notIncluded || '',
  }
}

function mapProposal(row, index = 0) {
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

function databaseStatus(status) { return uiToDbStatus[status] || 'draft' }

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(value || 0))
}

function shortDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value + 'T12:00:00')).replace('.', '')
}

function longDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value + 'T12:00:00'))
}

function initials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CL'
}

function Brand() {
  return <div className="brand-lockup" aria-label="FechaProposta"><span className="brand-symbol"><i /><i /><i /><i /></span><span>fecha<span className="brand-dot">.</span></span></div>
}

function Status({ value }) {
  const tone = statusTone[value] || 'neutral'
  return <span className={'status-pill tone-' + tone}><i />{value}</span>
}

function Avatar({ name, mark, color = 'lavender', small = false }) {
  return <span className={'avatar avatar-' + color + (small ? ' avatar-small' : '')} aria-hidden="true">{mark || initials(name)}</span>
}

function Modal({ title, eyebrow, children, onClose, wide = false, className = '' }) {
  return (
    <MuiDialog open onClose={onClose} fullWidth maxWidth={wide ? 'md' : 'sm'} aria-labelledby="app-modal-title" slotProps={{ paper: { component: 'section', tabIndex: -1, className: 'modal-card' + (wide ? ' modal-wide' : '') + (className ? ' ' + className : '') } }}>
        <div className="modal-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id="app-modal-title">{title}</h2></div><Button className="icon-btn" onClick={onClose} aria-label="Fechar janela"><X size={18} /></Button></div>
        {children}
    </MuiDialog>
  )
}

function Toast({ children, onClose, action }) {
  return <Snackbar open anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} autoHideDuration={5200} onClose={onClose}>
    <Alert severity="success" variant="outlined" onClose={onClose} action={action && <Button color="inherit" size="small" onClick={action.onClick}>{action.label}</Button>} sx={{ alignItems: 'center', bgcolor: 'background.paper' }}>{children}</Alert>
  </Snackbar>
}

function ProposalForm({ onSave, onClose, existing = null }) {
  const [items, setItems] = useState(existing ? existing.items.map((item) => ({ ...item, price: String(item.price) })) : [{ name: '', qty: 1, price: '' }])
  const formRef = useRef(null)
  const total = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0)
  const dueDefault = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)

  function updateItem(index, key, value) {
    setItems((current) => current.map((item, position) => position === index ? { ...item, [key]: value } : item))
  }

  function save(status) {
    if (!formRef.current.reportValidity()) return
    const form = new FormData(formRef.current)
    const scope = proposalScope(existing || { id: '', items })
    onSave({
      title: String(form.get('title')).trim(), client: String(form.get('client')).trim(), email: String(form.get('email')).trim(),
      due: String(form.get('due')), summary: String(form.get('summary')).trim(),
      deliverables: String(form.get('deliverables') || scope.deliverables.join('\n')).split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
      timeline: String(form.get('timeline') || '').trim(), nextStep: String(form.get('nextStep') || '').trim(), notIncluded: String(form.get('notIncluded') || '').trim(),
      items: items.map((item) => ({ name: item.name.trim(), qty: Number(item.qty), price: Number(item.price) })),
      amount: total, terms: String(form.get('terms') || '').trim(), status,
    }, existing && existing.id)
  }

  return (
    <Modal title={existing ? 'Revise os detalhes da proposta.' : 'Uma boa parceria começa por aqui.'} eyebrow={existing ? 'EDITANDO ' + existing.id : 'NOVA PROPOSTA'} onClose={onClose} wide className="create-modal">
      <form ref={formRef} onSubmit={(event) => { event.preventDefault(); save('Rascunho') }}>
        <div className="form-scroll">
          <div className="form-section-title"><span>01</span><div><strong>Quem vai receber?</strong><small>Os dados aparecem na proposta do cliente.</small></div></div>
          <div className="form-grid two-col">
            <label className="field"><span>Nome do cliente <b>*</b></span><TextField variant="outlined" size="small" fullWidth name="client" required defaultValue={existing && existing.client} placeholder="Ex.: Nome do cliente" autoFocus /></label>
            <label className="field"><span>E-mail do cliente <b>*</b></span><TextField variant="outlined" size="small" fullWidth name="email" type="email" required defaultValue={existing && existing.email} placeholder="nome@empresa.com.br" /></label>
          </div>
          <div className="form-section-title section-spaced"><span>02</span><div><strong>O que vamos propor?</strong><small>Descreva o resultado, organize os itens e defina o prazo.</small></div></div>
          <div className="form-grid two-col">
            <label className="field field-full"><span>Título da proposta <b>*</b></span><TextField variant="outlined" size="small" fullWidth name="title" required defaultValue={existing && existing.title} placeholder="Ex.: Estratégia de marca e identidade visual" /></label>
            <label className="field"><span>Validade até <b>*</b></span><TextField variant="outlined" size="small" fullWidth name="due" type="date" required slotProps={{ htmlInput: { min: new Date().toISOString().slice(0, 10) } }} defaultValue={existing ? existing.due : dueDefault} /></label>
            <label className="field"><span>Prazo estimado <b>*</b></span><TextField variant="outlined" size="small" fullWidth name="timeline" required defaultValue={existing ? proposalScope(existing).timeline : ''} placeholder="Ex.: 4 a 6 semanas após o aceite" /></label>
            <label className="field field-full"><span>Resumo e objetivo <b>*</b></span><TextField variant="outlined" size="small" fullWidth multiline rows={3} name="summary" required defaultValue={existing && existing.summary} placeholder="Explique o desafio do cliente e o resultado que vamos buscar." /></label>
            <label className="field field-full"><span>O que será feito e entregue <b>*</b></span><TextField variant="outlined" size="small" fullWidth multiline rows={4} name="deliverables" required defaultValue={existing ? proposalScope(existing).deliverables.join('\n') : ''} placeholder={'Uma entrega por linha. Ex.:\nImersão e definição do objetivo\nDesign das páginas principais\nPublicação e entrega dos arquivos'} /><small className="field-help">Cada linha aparece como uma entrega separada na proposta do cliente.</small></label>
            <label className="field field-full"><span>Próximo passo depois do aceite</span><TextField variant="outlined" size="small" fullWidth name="nextStep" defaultValue={existing ? proposalScope(existing).nextStep : ''} placeholder="Ex.: Agendar a reunião inicial e reunir os materiais." /></label>
            <label className="field field-full"><span>O que não está incluído <small>(opcional)</small></span><TextField variant="outlined" size="small" fullWidth multiline rows={2} name="notIncluded" defaultValue={existing ? proposalScope(existing).notIncluded : ''} placeholder="Deixe claros os limites do escopo para evitar surpresas." /></label>
          </div>
          <div className="items-label"><div><strong>Itens e investimento</strong><span>Deixe o valor e o escopo fáceis de conferir.</span></div><Button className="text-action" type="button" onClick={() => setItems((current) => [...current, { name: '', qty: 1, price: '' }])}><Plus size={15} /> Adicionar item</Button></div>
          <div className="line-items">
            <div className="line-head"><span>DESCRIÇÃO</span><span>QTD.</span><span>VALOR UNITÁRIO</span><span>TOTAL</span><span /></div>
            {items.map((item, index) => <div className="line-row" key={index}>
              <TextField variant="outlined" size="small" aria-label={'Descrição do item ' + (index + 1)} value={item.name} onChange={(event) => updateItem(index, 'name', event.target.value)} required placeholder="Ex.: Pesquisa e estratégia" />
              <TextField variant="outlined" size="small" aria-label={'Quantidade do item ' + (index + 1)} value={item.qty} onChange={(event) => updateItem(index, 'qty', event.target.value)} type="number" slotProps={{ htmlInput: { min: 1 } }} required />
              <TextField variant="outlined" size="small" aria-label={'Valor unitário do item ' + (index + 1)} value={item.price} onChange={(event) => updateItem(index, 'price', event.target.value)} type="number" slotProps={{ input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> }, htmlInput: { min: 0.01, step: 0.01 } }} required placeholder="0,00" />
              <strong className="line-total">{money((Number(item.qty) || 0) * (Number(item.price) || 0))}</strong>
              <Button className="remove-line" type="button" aria-label={'Remover item ' + (index + 1)} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, position) => position !== index))}><X size={15} /></Button>
            </div>)}
          </div>
          <div className="total-box"><span>Investimento total</span><strong>{money(total)}</strong></div>
          <label className="field terms-field"><span>Condições de pagamento <small>(opcional)</small></span><TextField variant="outlined" size="small" fullWidth multiline rows={3} name="terms" defaultValue={existing && existing.terms} placeholder="Ex.: 50% no aceite e 50% na entrega." /></label>
        </div>
        <div className="modal-footer form-footer"><span><ShieldCheck size={15} /> {existing ? 'As alterações ficam salvas no Supabase.' : 'Seu rascunho fica salvo no Supabase.'}</span><div><Button type="button" className="btn-secondary" onClick={() => save(existing ? existing.status : 'Rascunho')}>{existing ? 'Salvar alterações' : 'Salvar rascunho'}</Button><Button type="button" className="btn-primary" onClick={() => save('Pronta para envio')}>{existing ? 'Salvar e preparar envio' : 'Criar proposta'} <ArrowRight size={15} /></Button></div></div>
      </form>
    </Modal>
  )
}

function SignatureModal({ proposal, onClose, onSign }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [hasInk, setHasInk] = useState(false)
  const [signatureMode, setSignatureMode] = useState('desenhar')

  function point(event) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) }
  }

  function start(event) {
    const canvas = canvasRef.current
    canvas.setPointerCapture(event.pointerId)
    const ctx = canvas.getContext('2d')
    const pos = point(event)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#c6ab7a'
    drawing.current = true
  }

  function draw(event) {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const pos = point(event)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasInk(true)
  }

  function clear() {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }

  function submit(event) {
    event.preventDefault()
    if (!name.trim() || !consent || (signatureMode === 'desenhar' && !hasInk)) return
    onSign({ name: name.trim(), signature: signatureMode === 'desenhar' ? canvasRef.current.toDataURL('image/png') : 'typed:' + name.trim() })
  }

  const canSign = Boolean(name.trim() && consent && (signatureMode === 'digitar' || hasInk))

  return <Modal title="Assine para aceitar" eyebrow="ACEITE DA PROPOSTA" onClose={onClose} className="sign-modal">
    <form onSubmit={submit}>
      <div className="sign-doc-summary"><span>{proposal.id}</span><strong>{proposal.title}</strong><span>{proposal.client} <i>·</i> {money(proposal.amount)}</span></div>
      <p className="sign-intro">Confira os dados e assine abaixo. O aceite será registrado nesta proposta.</p>
      <label className="field"><span>Nome completo <b>*</b></span><TextField variant="outlined" size="small" fullWidth value={name} onChange={(event) => setName(event.target.value)} required placeholder="Como aparece no documento" /></label>
      <div className="signature-heading"><label htmlFor={signatureMode === 'desenhar' ? 'signature-canvas' : 'signature-name'}>Sua assinatura <b>*</b></label><div className="signature-options" role="group" aria-label="Forma de assinatura"><Button type="button" className={signatureMode === 'desenhar' ? 'option-active' : ''} onClick={() => { setSignatureMode('desenhar'); setHasInk(false) }}>Desenhar</Button><Button type="button" className={signatureMode === 'digitar' ? 'option-active' : ''} onClick={() => { setSignatureMode('digitar'); setHasInk(false) }}>Digitar nome</Button></div></div>
      {signatureMode === 'desenhar' ? <><canvas id="signature-canvas" ref={canvasRef} width="560" height="150" className="signature-canvas" aria-label="Desenhe sua assinatura aqui" onPointerDown={start} onPointerMove={draw} onPointerUp={() => { drawing.current = false }} onPointerCancel={() => { drawing.current = false }} /><span className="signature-hint">Use o mouse, dedo ou caneta para assinar</span></> : <div id="signature-name" className="typed-signature-preview" aria-label="Prévia da assinatura digitada">{name || 'Seu nome aparecerá aqui'}</div>}
      <label className="consent-check"><Checkbox size="small" checked={consent} onChange={(event) => setConsent(event.target.checked)} slotProps={{ input: { 'aria-label': 'Concordo com o escopo, os valores e as condições da proposta' } }} /><span>Li a proposta e concordo com o escopo, os valores e as condições descritas.</span></label>
      <div className="signature-notice"><ShieldCheck size={15} /><span>Registro de aceite guardado no Supabase. Para assinatura eletrônica com validade e trilha de auditoria, conecte um provedor especializado.</span></div>
      <div className="modal-footer"><Button type="button" className="btn-secondary" onClick={onClose}>Voltar</Button><Button className="btn-primary" type="submit" disabled={!canSign}>Confirmar aceite <Check size={15} /></Button></div>
    </form>
  </Modal>
}

function ProposalDetail({ proposal, onClose, onPdf, onShare, onMail, onMarkSent, onPreview, onEdit }) {
  if (!proposal) return null
  const scope = proposalScope(proposal)
  return <Modal title="Detalhes da proposta" eyebrow={proposal.id} onClose={onClose} wide className="detail-modal">
    <div className="detail-toolbar"><Status value={proposal.status} /><div>{['Rascunho', 'Pronta para envio'].includes(proposal.status) && <Button className="btn-secondary btn-compact" onClick={() => onEdit(proposal)}>Editar</Button>}<Button className="btn-secondary btn-compact" onClick={() => onPdf(proposal)}><Download size={14} /> PDF</Button><Button className="btn-secondary btn-compact" onClick={() => onShare(proposal)}><Copy size={14} /> Copiar link</Button></div></div>
    <div className="detail-content">
      <div className="detail-main">
        <h3>{proposal.title}</h3><p className="detail-summary">{proposal.summary}</p><div className="detail-scope"><div><span>ENTREGAS</span><strong>{scope.deliverables.length} itens · {scope.timeline}</strong></div><ul>{scope.deliverables.slice(0, 3).map((item, index) => <li key={index}>{item}</li>)}</ul>{scope.deliverables.length > 3 && <small>e mais {scope.deliverables.length - 3} entregas na proposta do cliente</small>}</div>
        <div className="detail-client"><Avatar name={proposal.client} mark={proposal.initials} color={proposal.color} /><div><strong>{proposal.client}</strong><span>{proposal.email}</span></div><Button className="icon-btn" aria-label="Enviar e-mail ao cliente" onClick={() => onMail(proposal)}><Mail size={16} /></Button></div>
        <div className="detail-table"><div className="detail-table-head"><span>ITEM</span><span>QTD.</span><span>UNITÁRIO</span><span>TOTAL</span></div>{proposal.items.map((item, index) => <div className="detail-table-row" key={index}><strong>{item.name}</strong><span>{item.qty}</span><span>{money(item.price)}</span><b>{money(item.qty * item.price)}</b></div>)}<div className="detail-total"><span>Investimento total</span><strong>{money(proposal.amount)}</strong></div></div>
        <div className="detail-terms"><strong>Condições e próximo passo</strong><p>{proposal.terms || 'Condições a combinar entre as partes.'}</p><p><b>Após o aceite:</b> {scope.nextStep}</p>{scope.notIncluded && <p><b>Fora do escopo:</b> {scope.notIncluded}</p>}</div>
      </div>
      <aside className="detail-side"><div className="detail-side-card"><span className="detail-side-icon"><CalendarDays size={17} /></span><small>VALIDADE</small><strong>{longDate(proposal.due)}</strong><span>Proposta disponível até esta data</span></div><div className="detail-side-card"><span className="detail-side-icon mint-icon"><WalletCards size={17} /></span><small>VALOR TOTAL</small><strong>{money(proposal.amount)}</strong><span>Valores apresentados em reais</span></div><div className="activity-box"><strong>Atividade</strong><div className="activity-entry"><i /><div><b>Proposta criada</b><span>{longDate(proposal.date)}</span></div></div>{proposal.status === 'Aceita' && <div className="activity-entry"><i className="activity-green" /><div><b>Proposta aceita</b><span>{proposal.signedAt ? new Date(proposal.signedAt).toLocaleString('pt-BR') : 'Aceite registrado'}</span></div></div>}</div></aside>
    </div>
    <div className="modal-footer detail-footer"><span>Visualize exatamente como o cliente vai receber.</span><div><Button className="btn-secondary" onClick={() => onPreview(proposal)}>Ver como cliente <ArrowUpRight size={14} /></Button>{proposal.status === 'Pronta para envio' ? <><Button className="btn-secondary" onClick={() => onMail(proposal)}><Mail size={14} /> Abrir e-mail</Button><Button className="btn-primary" onClick={() => onMarkSent(proposal)}><Send size={14} /> Marcar enviada</Button></> : proposal.status !== 'Enviada' && proposal.status !== 'Aceita' ? <Button className="btn-primary" onClick={() => onMarkSent(proposal)}><Send size={14} /> Marcar como enviada</Button> : null}</div></div>
  </Modal>
}

function ClientProposal({ proposal, onSign, onBack, onPdf }) {
  const scope = proposalScope(proposal)
  const expired = proposal.status === 'Expirada'
  return <main className="client-page"><header className="client-top"><Button className="client-brand-button" onClick={onBack} aria-label="Voltar para FechaProposta"><Brand /></Button><span><ShieldCheck size={15} /> Proposta compartilhada com você</span></header>
    <div className="client-proposal-layout"><Card component="article" className="client-document">
      <div className="client-doc-head"><span className="eyebrow">PROPOSTA COMERCIAL <i>·</i> {proposal.id}</span><Status value={proposal.status} /></div>
      <p className="client-greeting">Olá, {proposal.client.split(' ')[0]}.</p><h1>{proposal.title}</h1>
      <section className="client-objective"><span className="client-section-kicker">OBJETIVO DO PROJETO</span><p>{proposal.summary}</p></section>
      <div className="client-meta"><div><span>PREPARADA PARA</span><strong>{proposal.client}</strong></div><div><span>PRAZO ESTIMADO</span><strong>{scope.timeline}</strong></div><div><span>VÁLIDA ATÉ</span><strong>{longDate(proposal.due)}</strong></div></div>
      <section className="client-scope"><div className="client-section-heading"><span className="client-section-icon"><CheckCircle2 size={17} /></span><div><span className="client-section-kicker">ESCOPO</span><h2>O que será feito</h2></div></div><p className="client-section-copy">Estas são as etapas e entregas previstas para o projeto.</p><ol>{scope.deliverables.map((deliverable, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span><strong>{deliverable}</strong></li>)}</ol></section>
      <section className="client-items"><div className="client-section-heading"><span className="client-section-icon money-icon"><WalletCards size={17} /></span><div><span className="client-section-kicker">INVESTIMENTO</span><h2>Valores por etapa</h2></div></div>{proposal.items.map((item, index) => <div className="client-item" key={index}><span><b>{item.name}</b><small>{item.qty} × {money(item.price)} por unidade</small></span><strong>{money(item.qty * item.price)}</strong></div>)}<div className="client-grand-total"><span>Investimento total</span><strong>{money(proposal.amount)}</strong></div><p className="client-tax-note">Valores em reais. {proposal.terms || ''}</p></section>
      <section className="client-conditions"><div className="client-section-heading"><span className="client-section-icon terms-icon"><FileCheck2 size={17} /></span><div><span className="client-section-kicker">COMBINADOS</span><h2>Condições do projeto</h2></div></div><p>{proposal.terms || 'As condições de pagamento e o cronograma serão combinados antes do início do projeto.'}</p>{scope.notIncluded && <div className="client-exclusions"><strong>Fora deste escopo</strong><span>{scope.notIncluded}</span></div>}</section>
      <section className="client-next-step"><span className="client-next-icon"><ArrowRight size={16} /></span><div><span className="client-section-kicker">DEPOIS DO ACEITE</span><h2>Próximo passo</h2><p>{scope.nextStep}</p></div></section>
      <p className="client-document-footnote"><ShieldCheck size={14} /> Leia todas as entregas, valores e condições antes de confirmar sua decisão.</p>
    </Card>
    <Card component="aside" className="client-decision-card"><span className="client-decision-kicker">RESUMO DA PROPOSTA</span><h2>{proposal.title}</h2><div className="decision-total"><span>Investimento total</span><strong>{money(proposal.amount)}</strong></div><div className="decision-meta"><span><CalendarDays size={15} /> Válida até {longDate(proposal.due)}</span><span><Clock3 size={15} /> {scope.timeline}</span></div>{proposal.status === 'Aceita' ? <div className="accepted-panel"><CheckCircle2 size={22} /><div><strong>Proposta aceita</strong><span>{proposal.signedBy ? 'Assinada por ' + proposal.signedBy : 'Aceite registrado'}{proposal.signedAt ? ' · ' + new Date(proposal.signedAt).toLocaleString('pt-BR') : ''}</span></div></div> : expired ? <div className="expired-panel"><Clock3 size={17} /><span>Esta proposta expirou. Entre em contato com quem enviou para solicitar uma nova versão.</span></div> : <><p className="decision-note">Ao aceitar, você confirma que leu o escopo e as condições descritas nesta proposta.</p><Button className="btn-primary client-sign-cta" onClick={() => onSign(proposal)}><FileSignature size={16} /> Assinar e aceitar proposta</Button></>}<Button className="client-pdf-action" onClick={() => onPdf(proposal)}><Download size={15} /> Salvar proposta em PDF</Button><p className="client-demo-note">Este registro de aceite não substitui uma assinatura eletrônica certificada.</p></Card></div>
    <Button className="client-back" onClick={onBack}><ChevronLeft size={15} /> Voltar</Button></main>
}

function ProposalRow({ proposal, onOpen }) {
  return <TableRow className="proposal-row" hover tabIndex={0} aria-label={'Abrir proposta ' + proposal.title + ' de ' + proposal.client} onClick={() => onOpen(proposal)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(proposal) } }}>
    <TableCell><span className="proposal-name"><Avatar name={proposal.client} mark={proposal.initials} color={proposal.color} small /><span><strong>{proposal.title}</strong><small>{proposal.id}</small></span></span></TableCell>
    <TableCell className="proposal-client">{proposal.client}</TableCell><TableCell className="proposal-date">{shortDate(proposal.date)}</TableCell><TableCell className="proposal-value">{money(proposal.amount)}</TableCell><TableCell className="proposal-status"><Status value={proposal.status} /></TableCell><TableCell className="proposal-chevron"><ChevronRight size={16} /></TableCell>
  </TableRow>
}

function ProposalTable({ proposals, onOpen, full = false }) {
  return <TableContainer className={'proposal-table' + (full ? ' full-table' : '')}>
    <Table size="small" aria-label="Propostas">
      <TableHead><TableRow><TableCell>PROPOSTA</TableCell><TableCell>CLIENTE</TableCell><TableCell>CRIADA EM</TableCell><TableCell align="right">VALOR</TableCell><TableCell>STATUS</TableCell><TableCell padding="checkbox" /></TableRow></TableHead>
      <TableBody>{proposals.map((proposal) => <ProposalRow key={proposal.id} proposal={proposal} onOpen={onOpen} />)}</TableBody>
    </Table>
  </TableContainer>
}

function EmptyState({ search, onCreate, onReset }) {
  return <div className="empty-state"><span><FileText size={21} /></span><strong>{search ? 'Nenhuma proposta encontrada' : 'Sua próxima proposta começa aqui'}</strong><p>{search ? 'Tente buscar pelo nome do cliente, título ou código.' : 'Crie uma proposta clara e acompanhe cada passo até o aceite.'}</p><div>{search && <Button className="btn-secondary" onClick={onReset}>Limpar busca</Button>}<Button className="btn-primary" onClick={onCreate}><Plus size={15} /> Nova proposta</Button></div></div>
}

function App() {
  const [proposals, setProposals] = useState([])
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState([])
  const [workspace, setWorkspace] = useState(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspaceTrial, setWorkspaceTrial] = useState(null)
  const [trialLoading, setTrialLoading] = useState(false)
  const [trialError, setTrialError] = useState('')
  const [trialFetchedAt, setTrialFetchedAt] = useState(0)
  const [trialClock, setTrialClock] = useState(Date.now())
  const [dataLoading, setDataLoading] = useState(false)
  const [view, setView] = useState('inicio')
  const [accessOpen, setAccessOpen] = useState(false)
  const [accessInitialMode, setAccessInitialMode] = useState('login')
  const [tourOpen, setTourOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Todas')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const [signing, setSigning] = useState(null)
  const [clientPreview, setClientPreview] = useState(null)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [notificationsAnchor, setNotificationsAnchor] = useState(null)
  const [filterAnchor, setFilterAnchor] = useState(null)
  const filterOpen = Boolean(filterAnchor)
  const publicId = new URLSearchParams(window.location.search).get('proposta')
  const [publicProposal, setPublicProposal] = useState(null)
  const [publicLoading, setPublicLoading] = useState(Boolean(publicId))

  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(''), 5200); return () => window.clearTimeout(timer) }, [toast])
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return undefined
    }
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setToast('Não foi possível recuperar a sessão da plataforma.')
      setSession(data?.session || null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
      if (!nextSession) {
        setWorkspace(null)
        setWorkspaces([])
        setWorkspaceTrial(null)
        setTrialError('')
        setProposals([])
      }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session?.user?.id || !supabase) {
      setWorkspaces([])
      setWorkspace(null)
      setWorkspaceTrial(null)
      setTrialError('')
      setWorkspaceLoading(false)
      return undefined
    }
    let active = true
    setWorkspaceLoading(true)
    supabase.from('workspaces').select('*').order('created_at', { ascending: true }).then(({ data, error }) => {
      if (!active) return
      if (error) {
        setToast('Não foi possível carregar seus espaços de trabalho.')
        setWorkspaceLoading(false)
        return
      }
      const available = data || []
      setWorkspaces(available)
      setWorkspace((current) => available.find((item) => item.id === current?.id) || available[0] || null)
      setWorkspaceLoading(false)
    })
    return () => { active = false }
  }, [session?.user?.id])

  useEffect(() => {
    if (!workspace?.id || !supabase) {
      setWorkspaceTrial(null)
      setTrialLoading(false)
      setTrialError('')
      return undefined
    }
    let active = true
    setWorkspaceTrial(null)
    setTrialLoading(true)
    setTrialError('')
    supabase.rpc('get_workspace_trial', { target_workspace_id: workspace.id }).then(({ data, error }) => {
      if (!active) return
      if (error || !data) {
        setTrialError(error?.message || 'Não foi possível consultar o período de teste.')
      } else {
        setWorkspaceTrial(data)
        setTrialFetchedAt(Date.now())
        setTrialClock(Date.now())
      }
      setTrialLoading(false)
    })
    return () => { active = false }
  }, [workspace?.id])

  useEffect(() => {
    if (workspaceTrial?.status !== 'trialing') return undefined
    const updateTrialClock = () => setTrialClock(Date.now())
    const timer = window.setInterval(updateTrialClock, 15000)
    window.addEventListener('focus', updateTrialClock)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', updateTrialClock)
    }
  }, [workspaceTrial?.status])

  useEffect(() => {
    if (!workspace?.id || !supabase || trialLoading || workspaceTrial?.workspace_id !== workspace.id || trialError || workspaceTrial?.status === 'expired') {
      setProposals([])
      setDataLoading(false)
      return undefined
    }
    let active = true
    setDataLoading(true)
    supabase.from('proposals')
      .select('*, client:clients!proposals_workspace_id_client_id_fkey(name,email), items:proposal_items(*)')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setToast('Não foi possível carregar as propostas deste espaço.')
          setProposals([])
        } else {
          setProposals((data || []).map(mapProposal))
        }
        setDataLoading(false)
      })
    return () => { active = false }
  }, [workspace?.id, trialLoading, workspaceTrial?.workspace_id, workspaceTrial?.status, trialError])

  useEffect(() => {
    if (!publicId || !supabase) { setPublicLoading(false); return undefined }
    let active = true
    supabase.rpc('get_shared_proposal', { target_share_token: publicId }).then(({ data, error }) => {
      if (!active) return
      if (error || !data) setPublicProposal(null)
      else setPublicProposal(mapProposal({ ...data, id: data.id, code: data.code, client: data.client, items: data.items }))
      setPublicLoading(false)
    })
    return () => { active = false }
  }, [publicId])
  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setView('propostas')
        setTimeout(() => document.getElementById('proposal-search')?.focus(), 50)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])
  useEffect(() => {
    if (!mobileNav) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileNav(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileNav])

  const currentPublicProposal = publicProposal
  const previewScope = clientPreview ? proposalScope(clientPreview) : null
  const matchingProposals = useMemo(() => proposals.filter((proposal) => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    const matchesTerm = !term || [proposal.title, proposal.client, proposal.id, proposal.email].some((value) => value.toLocaleLowerCase('pt-BR').includes(term))
    const matchesFilter = filter === 'Todas' || proposal.status === filter
    return matchesTerm && matchesFilter
  }), [proposals, query, filter])

  const accepted = proposals.filter((proposal) => proposal.status === 'Aceita')
  const openProposals = proposals.filter((proposal) => ['Enviada', 'Visualizada', 'Em negociação'].includes(proposal.status))
  const sentOrClosed = proposals.filter((proposal) => !['Rascunho', 'Pronta para envio'].includes(proposal.status)).length
  const acceptanceRate = sentOrClosed ? Math.round((accepted.length / sentOrClosed) * 100) : 0
  const acceptedValue = accepted.reduce((sum, proposal) => sum + proposal.amount, 0)
  const pendingValue = openProposals.reduce((sum, proposal) => sum + proposal.amount, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingCount = proposals.filter((proposal) => {
    if (!['Enviada', 'Visualizada', 'Em negociação', 'Pronta para envio'].includes(proposal.status)) return false
    const days = Math.floor((new Date(proposal.due + 'T00:00:00').getTime() - today.getTime()) / 86400000)
    return days >= 0 && days <= 7
  }).length
  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'
  const todayLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()).toLocaleUpperCase('pt-BR')
  const pipelineStages = [
    { label: 'Enviada', statuses: ['Enviada', 'Visualizada'], bar: 'bar-enviada' },
    { label: 'Negoc.', statuses: ['Em negociação'], bar: 'bar-negociacao' },
    { label: 'Aceita', statuses: ['Aceita'], bar: 'bar-aceita' },
    { label: 'Rascunho', statuses: ['Rascunho', 'Pronta para envio'], bar: 'bar-rascunho' },
  ].map((stage) => ({ ...stage, value: proposals.filter((proposal) => stage.statuses.includes(proposal.status)).reduce((sum, proposal) => sum + proposal.amount, 0) }))
  const maxPipeline = Math.max(1, ...pipelineStages.map((stage) => stage.value))
  const userName = session?.user?.user_metadata?.full_name?.trim() || session?.user?.email?.split('@')[0] || 'Minha conta'
  const trialSecondsRemaining = workspaceTrial?.status === 'trialing'
    ? Math.max(0, Number(workspaceTrial.seconds_remaining || 0) - Math.floor((trialClock - trialFetchedAt) / 1000))
    : null
  const trialExpired = workspaceTrial?.status === 'expired' || (workspaceTrial?.status === 'trialing' && trialSecondsRemaining <= 0)
  const trialDaysRemaining = trialSecondsRemaining === null ? null : Math.ceil(trialSecondsRemaining / 86400)

  function notify(message) { setToast(message) }

  function enterWorkspace(mode = 'login') {
    setAccessInitialMode(mode === 'signup' ? 'signup' : 'login')
    setAccessOpen(true)
  }

  async function exitWorkspace() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) notify('Não foi possível sair da plataforma. Tente novamente.')
    else setView('inicio')
  }

  async function createProposal(data, existingCode) {
    if (!workspace || !supabase) return
    const original = existingCode ? proposals.find((proposal) => proposal.id === existingCode) : null
    const code = original?.id || 'FP-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6)
    const { data: savedId, error } = await supabase.rpc('save_workspace_proposal', {
      target_workspace_id: workspace.id,
      target_proposal_id: original?.dbId || null,
      target_client_id: original?.clientId || null,
      target_client_name: data.client,
      target_client_email: data.email || '',
      target_code: code,
      target_title: data.title,
      target_status: databaseStatus(data.status),
      target_summary: data.summary,
      target_deliverables: data.deliverables,
      target_timeline: data.timeline,
      target_next_step: data.nextStep,
      target_exclusions: data.notIncluded,
      target_terms: data.terms,
      target_due_date: data.due,
      target_total_amount: data.amount,
      target_items: data.items.map((item, position) => ({ position, name: item.name, quantity: item.qty, unit_price: item.price })),
    })
    if (error) {
      notify('Não foi possível salvar a proposta no Supabase: ' + error.message)
      return
    }
    const { data: row, error: loadError } = await supabase.from('proposals')
      .select('*, client:clients!proposals_workspace_id_client_id_fkey(name,email), items:proposal_items(*)')
      .eq('workspace_id', workspace.id)
      .eq('id', savedId)
      .single()
    if (loadError) {
      notify('A proposta foi gravada, mas não foi possível atualizar a tela. Recarregue a página.')
      return
    }
    const savedProposal = { ...mapProposal(row), color: original?.color || avatarColors[proposals.length % avatarColors.length] }
    setProposals((current) => [savedProposal, ...current.filter((proposal) => proposal.dbId !== savedProposal.dbId)])
    setCreateOpen(false)
    setEditing(null)
    setView('propostas')
    if (savedProposal.status === 'Pronta para envio') setSelected(savedProposal)
    notify(original ? 'Alterações salvas no Supabase.' : 'Proposta salva no Supabase.')
  }

  async function persistProposalChanges(id, changes) {
    const original = proposals.find((proposal) => proposal.id === id || proposal.dbId === id)
    if (!original || !workspace || !supabase) return null
    const patch = {}
    if (changes.status) patch.status = databaseStatus(changes.status)
    if (changes.shareEnabled !== undefined) patch.share_enabled = changes.shareEnabled
    if (changes.signedBy) {
      patch.accepted_by = changes.signedBy
      patch.accepted_at = changes.signedAt || new Date().toISOString()
      patch.signature_mode = changes.signature?.startsWith('typed:') ? 'typed' : 'drawn'
      patch.signature_text = changes.signature || changes.signedBy
      patch.status = 'accepted'
    }
    const { error } = await supabase.from('proposals').update(patch).eq('workspace_id', workspace.id).eq('id', original.dbId)
    if (error) {
      notify('Não foi possível salvar esta alteração no Supabase: ' + error.message)
      return null
    }
    const updated = { ...original, ...changes }
    setProposals((current) => current.map((proposal) => proposal.dbId === original.dbId ? updated : proposal))
    setSelected((current) => current?.dbId === original.dbId ? updated : current)
    return updated
  }

  function makeLink(proposal) {
    return window.location.origin + window.location.pathname + '?proposta=' + encodeURIComponent(proposal.shareToken)
  }

  async function shareProposal(proposal) {
    const enabledProposal = await persistProposalChanges(proposal.id, { shareEnabled: true })
    if (!enabledProposal?.shareToken) return
    const link = makeLink(enabledProposal)
    try {
      await navigator.clipboard.writeText(link)
      notify('Link público copiado. Você pode compartilhar com seu cliente.')
    } catch {
      window.prompt('Copie o link da proposta:', link)
    }
  }

  async function emailProposal(proposal) {
    const enabledProposal = await persistProposalChanges(proposal.id, { shareEnabled: true })
    if (!enabledProposal) return
    const subject = encodeURIComponent('Proposta: ' + proposal.title)
    const body = encodeURIComponent('Olá, ' + proposal.client.split(' ')[0] + '!\n\nPreparei uma proposta para você: ' + proposal.title + '.\n\nAcesse por este link: ' + makeLink(enabledProposal) + '\n\nA proposta é válida até ' + longDate(proposal.due) + '.\n\nAté mais!')
    window.location.href = 'mailto:' + encodeURIComponent(proposal.email || '') + '?subject=' + subject + '&body=' + body
    notify('Rascunho de e-mail aberto. Revise e envie pelo seu aplicativo de e-mail.')
  }

  async function markSent(proposal) {
    const updated = await persistProposalChanges(proposal.id, { status: 'Enviada' })
    if (updated) {
      setSelected(null)
      notify('Status atualizado no Supabase. O envio real depende do seu aplicativo de e-mail.')
    }
  }

  function editProposal(proposal) {
    setSelected(null)
    setEditing(proposal)
    setCreateOpen(true)
  }
  function printProposal(proposal) {
    const popup = window.open('', '_blank', 'width=900,height=740')
    if (!popup) { notify('Permita a abertura da janela para gerar o PDF.'); return }
    const scope = proposalScope(proposal)
    const rows = proposal.items.map((item) => '<tr><td>' + escapeHtml(item.name) + '</td><td>' + item.qty + '</td><td>' + money(item.price) + '</td><td>' + money(item.qty * item.price) + '</td></tr>').join('')
    const deliverables = scope.deliverables.map((item) => '<li>' + escapeHtml(item) + '</li>').join('')
    const exclusions = scope.notIncluded ? '<h2>Fora deste escopo</h2><p>' + escapeHtml(scope.notIncluded) + '</p>' : ''
    const signatureMarkup = proposal.signature && proposal.signature.startsWith('data:image/png;base64,') ? '<img alt="Assinatura de ' + escapeHtml(proposal.signedBy) + '" src="' + proposal.signature + '" style="display:block;max-width:240px;max-height:76px;object-fit:contain">' : '<div style="font:italic 30px Georgia,serif">' + escapeHtml(proposal.signedBy) + '</div>'
    const signedBlock = proposal.signature && proposal.signedBy ? '<section style="margin-top:38px;padding-top:18px;border-top:1px solid #e1e5df"><h2 style="margin:0 0 12px">Aceite registrado</h2>' + signatureMarkup + '<p>Assinado por <strong>' + escapeHtml(proposal.signedBy) + '</strong> em ' + new Date(proposal.signedAt).toLocaleString('pt-BR') + '.</p></section>' : ''
    const html = [
      '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>', escapeHtml(proposal.title), '</title>',
      '<style>body{font:14px Arial,sans-serif;color:#253126;max-width:760px;margin:54px auto;padding:0 34px}header{display:flex;justify-content:space-between;border-bottom:1px solid #e1e5df;padding-bottom:22px}small,.muted{color:#707970}h1{font-size:31px;line-height:1.15;margin:38px 0 12px}h2{font-size:17px;margin:29px 0 10px}.label{font-size:10px;letter-spacing:1px;color:#778078}p,li{line-height:1.7}ul{padding-left:20px}li{padding:4px 0}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{text-align:left;padding:11px 8px;border-bottom:1px solid #e7eae6}th{font-size:9px;color:#778078}.total{text-align:right;font-weight:bold;font-size:19px;margin:16px 0}.meta{display:flex;gap:35px;margin:24px 0;padding:16px 0;border-top:1px solid #eee;border-bottom:1px solid #eee}.meta div{display:grid;gap:7px}.scope-note{padding:14px;border:1px solid #e7ece3;border-radius:8px;background:#f8faf6}.scope-note span{display:block;margin-top:7px;color:#5e6d60;font-size:12px}footer{margin-top:48px;color:#7b847b;font-size:10px}@media print{body{margin:22px auto}}</style></head><body>',
      '<header><strong>fecha<span style="color:#91ae42">.</span></strong><span class="muted">PROPOSTA COMERCIAL · ', escapeHtml(proposal.id), '</span></header>',
      '<p class="label" style="margin-top:35px">PREPARADA PARA ', escapeHtml(proposal.client.toUpperCase()), '</p><h1>', escapeHtml(proposal.title), '</h1>',
      '<div class="scope-note"><small>OBJETIVO DO PROJETO</small><span>', escapeHtml(proposal.summary), '</span></div>',
      '<div class="meta"><div><small class="label">PRAZO ESTIMADO</small><strong>', escapeHtml(scope.timeline), '</strong></div><div><small class="label">VÁLIDA ATÉ</small><strong>', longDate(proposal.due), '</strong></div><div><small class="label">INVESTIMENTO</small><strong>', money(proposal.amount), '</strong></div></div>',
      '<h2>O que será feito</h2><ul>', deliverables, '</ul>',
      '<h2>Investimento por etapa</h2><table><thead><tr><th>ITEM</th><th>QTD.</th><th>UNITÁRIO</th><th>TOTAL</th></tr></thead><tbody>', rows, '</tbody></table><div class="total">Total: ', money(proposal.amount), '</div>',
      '<h2>Condições de pagamento</h2><p>', escapeHtml(proposal.terms || 'Condições a combinar entre as partes.'), '</p>', exclusions,
      '<div class="scope-note"><small>PRÓXIMO PASSO APÓS O ACEITE</small><span>', escapeHtml(scope.nextStep), '</span></div>', signedBlock,
      '<footer>FechaProposta · Documento gerado em ', new Date().toLocaleDateString('pt-BR'), '</footer><script>window.onload=function(){setTimeout(function(){window.print()},350)}<\/script></body></html>',
    ].join('')
    popup.document.write(html)
    popup.document.close()
  }

  function printReport() {
    const popup = window.open('', '_blank', 'width=900,height=740')
    if (!popup) { notify('Permita a abertura da janela para exportar o resumo.'); return }
    const rows = proposals.map((proposal) => '<tr><td>' + escapeHtml(proposal.id) + '</td><td>' + escapeHtml(proposal.title) + '</td><td>' + escapeHtml(proposal.client) + '</td><td>' + escapeHtml(proposal.status) + '</td><td>' + money(proposal.amount) + '</td></tr>').join('')
    popup.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Resumo de propostas</title><style>body{font:13px Arial,sans-serif;color:#29362c;max-width:980px;margin:54px auto;padding:0 30px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e4e9e2;padding-bottom:16px}h1{margin:34px 0 6px;font-size:27px}.muted{color:#7c887e}section{display:flex;gap:30px;margin:23px 0;padding:14px 0;border-top:1px solid #e9ede7;border-bottom:1px solid #e9ede7}section div{display:grid;gap:6px}small{color:#899489;font-size:9px;letter-spacing:.6px}strong{font-size:15px}table{width:100%;border-collapse:collapse}th,td{padding:12px 8px;border-bottom:1px solid #edf0eb;text-align:left}th{color:#7c887e;font-size:9px;letter-spacing:.5px}td{font-size:10px}td:last-child{text-align:right;font-weight:bold}footer{margin-top:40px;color:#899489;font-size:10px}@media print{body{margin:20px auto}}</style></head><body><header><strong>fecha<span style="color:#91ae42">.</span> / Resumo da carteira</strong><span class="muted">Gerado em ' + new Date().toLocaleDateString('pt-BR') + '</span></header><h1>Propostas comerciais</h1><p class="muted">Panorama atual de ' + escapeHtml(workspace?.name) + '.</p><section><div><small>TOTAL DE PROPOSTAS</small><strong>' + proposals.length + '</strong></div><div><small>VALOR EM ABERTO</small><strong>' + money(pendingValue) + '</strong></div><div><small>VALOR ACEITO</small><strong>' + money(acceptedValue) + '</strong></div><div><small>TAXA DE ACEITE</small><strong>' + acceptanceRate + '%</strong></div></section><table><thead><tr><th>CÓDIGO</th><th>PROPOSTA</th><th>CLIENTE</th><th>STATUS</th><th>VALOR</th></tr></thead><tbody>' + rows + '</tbody></table><footer>FechaProposta · Os dados deste resumo vêm do Supabase.</footer><script>window.onload=function(){setTimeout(function(){window.print()},350)}<\/script></body></html>')
    popup.document.close()
  }

  async function signProposal(proposal, signed) {
    const mode = signed.signature.startsWith('typed:') ? 'typed' : 'drawn'
    if (publicId) {
      const { data: acceptedResult, error } = await supabase.rpc('accept_shared_proposal', {
        target_share_token: publicId,
        target_signatory_name: signed.name,
        target_sign_mode: mode,
        target_sign_text: signed.signature,
      })
      if (error || !acceptedResult) {
        notify('Não foi possível registrar o aceite. O link pode ter expirado ou a proposta já foi aceita.')
        return
      }
      const { data, error: refreshError } = await supabase.rpc('get_shared_proposal', { target_share_token: publicId })
      if (!refreshError && data) setPublicProposal(mapProposal({ ...data, code: data.code, client: data.client, items: data.items }))
    } else {
      const updated = await persistProposalChanges(proposal.id, {
        status: 'Aceita', signedBy: signed.name,
        signedAt: new Date().toISOString(), signature: signed.signature,
      })
      if (!updated) return
    }
    setSigning(null)
    setClientPreview(null)
    setSelected(null)
    notify('Aceite registrado no Supabase.')
  }

  function openNav(id) { setView(id); setMobileNav(false); setQuery(''); setFilter('Todas') }

  if (publicId) {
    if (publicLoading) return <main className="client-page"><div className="client-top"><Brand /></div><div className="not-found"><CircularProgress size={24} aria-label="Carregando proposta" /><h1>Carregando proposta</h1><p>Buscando os dados compartilhados com segurança.</p></div></main>
    if (currentPublicProposal) return <><ClientProposal proposal={currentPublicProposal} onSign={setSigning} onPdf={printProposal} onBack={() => { window.location.href = window.location.origin + window.location.pathname }} />{signing && <SignatureModal proposal={signing} onClose={() => setSigning(null)} onSign={(data) => signProposal(signing, data)} />}{toast && <Toast onClose={() => setToast('')}>{toast}</Toast>}</>
    return <main className="client-page"><div className="client-top"><Brand /></div><div className="not-found"><FileText size={24} /><h1>Não encontramos essa proposta.</h1><p>O link pode estar desativado ou a proposta não está mais disponível.</p><Button className="btn-primary" onClick={() => { window.location.href = window.location.origin + window.location.pathname }}>Sair da plataforma</Button></div></main>
  }

  if (authLoading) return <main className="workspace-setup-page"><Card component="section" className="workspace-setup-card"><CircularProgress size={22} aria-label="Conectando sua conta" /><span className="marketing-eyebrow">FECHAPROPOSTA</span><h1>Conectando sua conta...</h1></Card></main>
  if (!session) return <><LandingPage onEnter={() => enterWorkspace('login')} onOpenTour={() => setTourOpen(true)} />{accessOpen && <PlatformAccess initialMode={accessInitialMode} onClose={() => setAccessOpen(false)} onAuthenticated={setSession} />}{tourOpen && <ProductTour onClose={() => setTourOpen(false)} onStartTrial={() => { setTourOpen(false); enterWorkspace('signup') }} />}{toast && <Toast onClose={() => setToast('')}>{toast}</Toast>}</>
  if (workspaceLoading) return <main className="workspace-setup-page"><Card component="section" className="workspace-setup-card"><CircularProgress size={22} aria-label="Carregando espaço" /><span className="marketing-eyebrow">FECHAPROPOSTA</span><h1>Carregando seu espaço...</h1></Card></main>
  if (!workspace) return <><WorkspaceSetup session={session} onCreated={(created) => { setWorkspaces((current) => [...current, created]); setWorkspace(created) }} onSignOut={exitWorkspace} />{toast && <Toast onClose={() => setToast('')}>{toast}</Toast>}</>
  if (trialError) return <main className="workspace-setup-page"><Card component="section" className="workspace-setup-card"><span className="marketing-eyebrow">ACESSO AO ESPAÇO</span><h1>Não foi possível confirmar seu período de teste.</h1><p>Atualize a página para tentar novamente. Se continuar, fale com o suporte.</p><Button className="btn-primary" onClick={() => window.location.reload()}>Tentar novamente <ArrowRight size={14} /></Button><Button className="account-mode-toggle" onClick={exitWorkspace}>Sair da conta</Button></Card></main>
  if (trialLoading || workspaceTrial?.workspace_id !== workspace.id) return <main className="workspace-setup-page"><Card component="section" className="workspace-setup-card"><CircularProgress size={22} aria-label="Conferindo acesso" /><span className="marketing-eyebrow">FECHAPROPOSTA</span><h1>Conferindo seu acesso...</h1></Card></main>
  if (trialExpired) return <main className="workspace-setup-page"><Card component="section" className="workspace-setup-card"><span className="workspace-setup-icon"><Clock3 size={21} /></span><span className="marketing-eyebrow">TESTE GRÁTIS ENCERRADO</span><h1>Seu período de 3 dias terminou.</h1><p>O acesso à área de trabalho foi pausado, mas seus dados e links enviados continuam disponíveis para os clientes. A contratação pelo app ainda não está disponível; fale com a equipe FechaProposta para reativar seu acesso.</p><Button className="btn-primary" onClick={exitWorkspace}>Sair da plataforma <ArrowRight size={14} /></Button></Card></main>
  return <div className="app-shell">
    <aside className={'sidebar' + (mobileNav ? ' sidebar-open' : '')}>
      <div className="sidebar-top"><Brand /></div>
      <div className="workspace-switch"><span className="workspace-avatar">{initials(workspace?.name)}</span><span><strong>{workspace?.name}</strong><small>Espaço de trabalho</small></span></div>
      {navGroups.map((group) => <div className="nav-group" key={group.title}><span className="nav-caption">{group.title}</span><nav aria-label={group.title}>{group.items.map(({ id, label, icon: Icon, count }) => <Button key={id} onClick={() => openNav(id)} className={'nav-link' + (view === id ? ' nav-active' : '')} aria-current={view === id ? 'page' : undefined}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{count && <small>{proposals.length.toString().padStart(2, '0')}</small>}</Button>)}</nav></div>)}
      <div className="sidebar-bottom"><div className="sidebar-help"><span><CircleHelp size={16} /></span><div><strong>Precisa de uma mão?</strong><small>Veja como preparar uma proposta.</small><Button onClick={() => notify('Dica: comece com um título claro, descreva o resultado e deixe valores e validade visíveis.')}>Acessar guia <ArrowUpRight size={12} /></Button></div></div><Button className="nav-link settings-link" onClick={() => openNav('configuracoes')}><Settings2 size={17} /><span>Configurações</span></Button><Button className="nav-link site-link" onClick={exitWorkspace}><ArrowUpRight size={17} /><span>Sair da plataforma</span></Button><div className="profile-row"><Avatar name={userName} color="mint" /><span><strong>{userName}</strong><small>Conta ativa</small></span><Button className="icon-btn" aria-label="Abrir menu do perfil" onClick={() => openNav('configuracoes')}><Ellipsis size={18} /></Button></div></div>
    </aside>
    {mobileNav && <Button className="mobile-scrim" aria-label="Fechar navegação" onClick={() => setMobileNav(false)} />}
    <main className="main-area">
      <header className="topbar">{!mobileNav && <Button className="mobile-menu icon-btn" aria-label="Abrir navegação" onClick={() => setMobileNav(true)}><Menu size={20} /></Button>}<div className="breadcrumbs"><span>{workspace?.name}</span><ChevronRight size={14} /><strong>{navGroups.flatMap((group) => group.items).find((item) => item.id === view)?.label || (view === 'configuracoes' ? 'Configurações' : 'Resultados')}</strong></div><div className="top-actions"><span className="sync-status"><i /> Sincronizado com Supabase</span><span className="top-divider" /><Button className="top-icon icon-btn" aria-label="Notificações" onClick={(event) => setNotificationsAnchor(event.currentTarget)}><Bell size={17} /></Button><Popover open={Boolean(notificationsAnchor)} anchorEl={notificationsAnchor} onClose={() => setNotificationsAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { className: 'notification-pop' } }}><div className="notification-content"><strong>Propostas em acompanhamento</strong><span><Clock3 size={15} /> {openProposals.length} propostas aguardam retorno.</span><Button onClick={() => setNotificationsAnchor(null)}>Entendi</Button></div></Popover><Button className="top-profile" onClick={() => openNav('configuracoes')}><Avatar name={userName} color="mint" small /><span>{userName}</span><ChevronDown size={14} /></Button></div></header>
      {workspaceTrial.status === 'trialing' && !trialExpired && <div className="trial-status-banner" role="status"><Clock3 size={15} /><span>Teste grátis: restam <strong>{trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia' : 'dias'}</strong>. Seu acesso termina em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(workspaceTrial.trial_ends_at))}.</span></div>}
      <div className="page-content">
        {view === 'inicio' && <>
          <div className="welcome-row"><div><span className="eyebrow"><span className="eyebrow-dot" /> {todayLabel}</span><h1>{greeting}, {userName.split(' ')[0]} <span className="wave">✳</span></h1><p>Suas boas conversas podem virar bons projetos. Veja o que está acontecendo.</p></div><Button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> Nova proposta</Button></div>
          <div className="stats-grid"><Card component="article" className="stat-card"><div className="stat-top"><span>Em propostas abertas</span><span className="stat-icon icon-lilac"><FileText size={16} /></span></div><strong>{money(pendingValue)}</strong><div className="stat-foot"><span className="stat-trend"><ArrowUpRight size={13} /> {openProposals.length} propostas</span><span>aguardando retorno</span></div></Card>
            <Card component="article" className="stat-card"><div className="stat-top"><span>Valor aceito</span><span className="stat-icon icon-mint"><Handshake size={16} /></span></div><strong>{money(acceptedValue)}</strong><div className="stat-foot"><span className="stat-trend trend-green"><ArrowUpRight size={13} /> {accepted.length} aceitas</span><span>nesta carteira</span></div></Card>
            <Card component="article" className="stat-card"><div className="stat-top"><span>Taxa de aceite</span><span className="stat-icon icon-amber"><Activity size={16} /></span></div><strong>{acceptanceRate}<small>%</small></strong><div className="stat-foot"><span>propostas enviadas ou concluídas</span></div><div className="rate-track"><span style={{ width: acceptanceRate + '%' }} /></div></Card>
            <Card component="article" className="stat-card"><div className="stat-top"><span>Próximos vencimentos</span><span className="stat-icon icon-blue"><CalendarDays size={16} /></span></div><strong>{upcomingCount.toString().padStart(2, '0')}</strong><div className="stat-foot"><span>Nos próximos 7 dias</span><span className="stat-reminder"><i /> atenção</span></div></Card></div>
          <div className="dashboard-grid"><Card component="section" className="panel recent-panel"><div className="panel-heading"><div><h2>Propostas recentes</h2><p>Acompanhe as conversas que estão em andamento.</p></div><Button className="text-action" onClick={() => openNav('propostas')}>Ver todas <ArrowRight size={14} /></Button></div><div className="table-scroll">{dataLoading ? <div className="dashboard-empty"><CircularProgress size={17} /> Carregando propostas do Supabase...</div> : proposals.length ? <ProposalTable proposals={proposals.slice(0, 5)} onOpen={setSelected} /> : <div className="dashboard-empty"><span>Nenhuma proposta cadastrada neste espaço.</span><Button className="text-action" onClick={() => setCreateOpen(true)}>Criar proposta <ArrowRight size={14} /></Button></div>}</div><Button className="mobile-see-all" onClick={() => openNav('propostas')}>Ver todas as propostas <ArrowRight size={14} /></Button></Card>
            <aside className="right-rail"><Card component="section" className="panel pipeline-panel"><div className="panel-heading"><div><h2>Seu pipeline</h2><p>Valor por etapa das propostas</p></div><Button className="small-select" onClick={() => openNav('resultados')}>Carteira <ChevronDown size={12} /></Button></div><div className="pipeline-chart"><div className="chart-y"><span>100%</span><span>75%</span><span>50%</span><span>0%</span></div><div className="chart-columns">{pipelineStages.map((bar) => <div className="chart-column" key={bar.label}><div className="chart-track"><span className={'chart-bar ' + bar.bar} style={{ height: (bar.value ? Math.max(8, (bar.value / maxPipeline) * 90) : 0) + '%' }} title={bar.label + ': ' + money(bar.value)} aria-label={bar.label + ': ' + money(bar.value)} /></div><small>{bar.label}</small></div>)}</div></div><div className="pipeline-legend"><span><i className="legend-open" /> Em andamento</span><strong>{money(pendingValue)}</strong></div><div className="pipeline-legend"><span><i className="legend-accepted" /> Aceitas</span><strong>{money(acceptedValue)}</strong></div></Card>
              <section className="nudge-card"><span className="nudge-orb"><Sparkles size={16} /></span><div><small>UM BOM PRÓXIMO PASSO</small><strong>Retome uma conversa com o cliente</strong><p>Um acompanhamento gentil pode destravar a conversa.</p><Button onClick={() => openNav('propostas')}>Acompanhar propostas <ArrowRight size={13} /></Button></div><span className="nudge-decoration">✳</span></section>
              <div className="trust-note"><ShieldCheck size={15} /><span>Suas propostas são salvas no espaço de trabalho do Supabase.</span></div></aside></div>
        </>}

        {view === 'propostas' && <>
          <div className="page-title-row"><div><Button className="back-link" onClick={() => openNav('inicio')}><ChevronLeft size={14} /> Visão geral</Button><h1>Propostas</h1><p>Todas as oportunidades, do primeiro rascunho ao aceite.</p></div><Button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> Nova proposta</Button></div>
          <div className="list-panel panel"><div className="list-toolbar"><div className="list-count"><strong>{matchingProposals.length.toString().padStart(2, '0')}</strong> propostas <span>·</span> organize e encontre com facilidade</div><div className="list-tools"><div className="search-field"><TextField id="proposal-search" variant="standard" size="small" hiddenLabel value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou proposta" slotProps={{ input: { disableUnderline: true, startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment>, endAdornment: <InputAdornment position="end"><kbd>Ctrl K</kbd></InputAdornment> }, htmlInput: { 'aria-label': 'Buscar propostas' } }} /></div><div className="filter-wrap"><Button className={'btn-secondary btn-compact' + (filter !== 'Todas' ? ' filter-selected' : '')} onClick={(event) => setFilterAnchor(event.currentTarget)}><Filter size={14} /> {filter === 'Todas' ? 'Filtrar' : filter} <ChevronDown size={13} /></Button><MuiMenu anchorEl={filterAnchor} open={filterOpen} onClose={() => setFilterAnchor(null)}>{['Todas', 'Rascunho', 'Pronta para envio', 'Enviada', 'Visualizada', 'Em negociação', 'Aceita', 'Expirada'].map((value) => <MenuItem key={value} selected={filter === value} onClick={() => { setFilter(value); setFilterAnchor(null) }}>{value}{filter === value && <Check size={14} />}</MenuItem>)}</MuiMenu></div></div></div>{matchingProposals.length ? <><div className="table-scroll"><ProposalTable proposals={matchingProposals} onOpen={setSelected} full /></div><div className="list-footer"><span>Exibindo <strong>{matchingProposals.length}</strong> de <strong>{proposals.length}</strong> propostas</span><span><Button disabled aria-label="Página anterior"><ChevronLeft size={15} /></Button><b>1</b><Button disabled aria-label="Próxima página"><ChevronRight size={15} /></Button></span></div></> : <EmptyState search={query || filter !== 'Todas'} onCreate={() => setCreateOpen(true)} onReset={() => { setQuery(''); setFilter('Todas') }} />}</div>
          <div className="help-strip"><span><LifeBuoy size={16} /></span><div><strong>Quer uma proposta que seja fácil de decidir?</strong><small>Use um escopo claro, mostre o valor e deixe o próximo passo evidente.</small></div><Button className="text-action" onClick={() => notify('Uma estrutura simples: contexto, resultado esperado, entregáveis, investimento, validade e próximo passo.')}>Ver boas práticas <ArrowUpRight size={14} /></Button></div>
        </>}

        {view === 'clientes' && <section className="subpage"><div className="page-title-row"><div><Button className="back-link" onClick={() => openNav('inicio')}><ChevronLeft size={14} /> Visão geral</Button><h1>Clientes</h1><p>Um lugar para retomar o contexto de cada parceria.</p></div><Button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> Nova proposta</Button></div><div className="client-grid">{Array.from(new Map(proposals.map((proposal) => [proposal.client, proposal])).values()).map((proposal) => <Button className="client-card panel" key={proposal.client} onClick={() => { setView('propostas'); setQuery(proposal.client) }}><div className="client-card-top"><Avatar name={proposal.client} mark={proposal.initials} color={proposal.color} /><ArrowUpRight size={15} /></div><strong>{proposal.client}</strong><span>{proposal.email}</span><small>{proposals.filter((item) => item.client === proposal.client).length} proposta{proposals.filter((item) => item.client === proposal.client).length === 1 ? '' : 's'} · última atividade {shortDate(proposal.date)}</small></Button>)}</div></section>}

        {view === 'modelos' && <section className="subpage"><div className="page-title-row"><div><Button className="back-link" onClick={() => openNav('inicio')}><ChevronLeft size={14} /> Visão geral</Button><h1>Modelos</h1><p>Os modelos salvos para este espaço aparecerão aqui.</p></div></div><div className="empty-state"><span><FileCheck2 size={21} /></span><strong>Nenhum modelo salvo</strong><p>Os modelos de proposta ainda não estão conectados ao banco de dados.</p></div></section>}

        {view === 'resultados' && <section className="subpage"><div className="page-title-row"><div><Button className="back-link" onClick={() => openNav('inicio')}><ChevronLeft size={14} /> Visão geral</Button><h1>Resultados</h1><p>Uma leitura simples do que está avançando.</p></div><Button className="btn-secondary" onClick={printReport}><Download size={15} /> Exportar resumo</Button></div><div className="report-grid"><article className="panel report-card"><span>PROPOSTAS CRIADAS</span><strong>{proposals.length.toString().padStart(2, '0')}</strong><small>Em toda a carteira atual</small></article><article className="panel report-card"><span>CONVERSÃO EM ACEITE</span><strong>{acceptanceRate}%</strong><small>{accepted.length} aceitas entre as enviadas ou concluídas</small></article><article className="panel report-card"><span>VALOR EM ABERTO</span><strong>{money(pendingValue)}</strong><small>{openProposals.length} propostas aguardando decisão</small></article></div><section className="panel report-list"><div className="panel-heading"><div><h2>Oportunidades recentes</h2><p>Veja os próximos passos por proposta.</p></div><Button className="text-action" onClick={() => openNav('propostas')}>Abrir lista <ArrowRight size={14} /></Button></div>{proposals.filter((proposal) => ['Enviada', 'Visualizada', 'Em negociação'].includes(proposal.status)).map((proposal) => <Button className="report-row" key={proposal.id} onClick={() => setSelected(proposal)}><Avatar name={proposal.client} mark={proposal.initials} color={proposal.color} small /><span><strong>{proposal.client}</strong><small>{proposal.title}</small></span><Status value={proposal.status} /><b>{money(proposal.amount)}</b><ChevronRight size={15} /></Button>)}</section></section>}

        {view === 'configuracoes' && <section className="subpage"><div className="page-title-row"><div><Button className="back-link" onClick={() => openNav('inicio')}><ChevronLeft size={14} /> Visão geral</Button><h1>Configurações</h1><p>Preferências deste espaço de trabalho.</p></div></div><section className="settings-card panel"><div className="settings-icon"><BriefcaseBusiness size={18} /></div><div><strong>{workspace?.name}</strong><p>Espaço de trabalho conectado à sua conta do Supabase.</p><span className="local-mode"><i /> Sincronizado com Supabase</span></div><Button className="btn-secondary" onClick={exitWorkspace}>Sair da conta <ArrowRight size={14} /></Button></section><section className="settings-card panel"><div className="settings-icon settings-user"><Users size={18} /></div><div><strong>Equipe e permissões</strong><p>Convide pessoas e controle quem pode editar ou enviar propostas.</p><span className="coming-soon">Convites de equipe serão configurados em uma etapa futura</span></div><Button className="btn-secondary" disabled>Em breve</Button></section><section className="settings-card panel"><div className="settings-icon settings-pdf"><FileCheck2 size={18} /></div><div><strong>Assinatura e documentos</strong><p>Configure o provedor de assinatura e a identidade dos documentos.</p><span className="coming-soon">Integração necessária para validade e trilha de auditoria</span></div><Button className="btn-secondary" disabled>Em breve</Button></section></section>}
        <footer className="app-footer"><span>FechaProposta <i>·</i> propostas com próximo passo</span><span><ShieldCheck size={13} /> Dados da conta sincronizados com Supabase</span></footer>
      </div>
    </main>
    {createOpen && <ProposalForm existing={editing} onClose={() => { setCreateOpen(false); setEditing(null) }} onSave={createProposal} />}
    {selected && <ProposalDetail proposal={proposals.find((proposal) => proposal.id === selected.id) || selected} onClose={() => setSelected(null)} onPdf={printProposal} onShare={shareProposal} onMail={emailProposal} onMarkSent={markSent} onPreview={setClientPreview} onEdit={editProposal} />}
    {clientPreview && <Modal title="Visualização para o cliente" eyebrow="LINK DA PROPOSTA" onClose={() => setClientPreview(null)} wide className="preview-modal"><div className="preview-banner"><ShieldCheck size={15} /><span>Confira a proposta completa como o cliente vai receber.</span></div><div className="preview-document"><div className="client-doc-head"><span className="eyebrow">PROPOSTA COMERCIAL · {clientPreview.id}</span><Status value={clientPreview.status} /></div><p className="client-greeting">Olá, {clientPreview.client.split(' ')[0]}.</p><h1>{clientPreview.title}</h1><section className="client-objective"><span className="client-section-kicker">OBJETIVO DO PROJETO</span><p>{clientPreview.summary}</p></section><div className="client-meta"><div><span>PREPARADA PARA</span><strong>{clientPreview.client}</strong></div><div><span>PRAZO ESTIMADO</span><strong>{previewScope.timeline}</strong></div><div><span>VÁLIDA ATÉ</span><strong>{longDate(clientPreview.due)}</strong></div></div><section className="client-scope"><div className="client-section-heading"><span className="client-section-icon"><CheckCircle2 size={17} /></span><div><span className="client-section-kicker">ESCOPO</span><h2>O que será feito</h2></div></div><ol>{previewScope.deliverables.map((item, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></li>)}</ol></section><section className="client-items"><div className="client-section-heading"><span className="client-section-icon money-icon"><WalletCards size={17} /></span><div><span className="client-section-kicker">INVESTIMENTO</span><h2>Valores por etapa</h2></div></div>{clientPreview.items.map((item, index) => <div className="client-item" key={index}><span><b>{item.name}</b><small>{item.qty} × {money(item.price)} por unidade</small></span><strong>{money(item.qty * item.price)}</strong></div>)}<div className="client-grand-total"><span>Investimento total</span><strong>{money(clientPreview.amount)}</strong></div></section><section className="client-conditions"><div className="client-section-heading"><span className="client-section-icon terms-icon"><FileCheck2 size={17} /></span><div><span className="client-section-kicker">COMBINADOS</span><h2>Condições do projeto</h2></div></div><p>{clientPreview.terms || 'As condições serão combinadas antes do início do projeto.'}</p>{previewScope.notIncluded && <div className="client-exclusions"><strong>Fora deste escopo</strong><span>{previewScope.notIncluded}</span></div>}</section><section className="client-next-step"><span className="client-next-icon"><ArrowRight size={16} /></span><div><span className="client-section-kicker">DEPOIS DO ACEITE</span><h2>Próximo passo</h2><p>{previewScope.nextStep}</p></div></section><Button className="btn-primary preview-sign-button" onClick={() => { setClientPreview(null); setSigning(clientPreview) }}>Assinar e aceitar proposta <ArrowRight size={15} /></Button></div></Modal>}
    {signing && <SignatureModal proposal={signing} onClose={() => setSigning(null)} onSign={(data) => signProposal(signing, data)} />}
    {toast && <Toast onClose={() => setToast('')}>{toast}</Toast>}
  </div>
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>\"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[character])
}

export default App
