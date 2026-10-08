import { useRef, useState } from 'react'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import InputAdornment from '@mui/material/InputAdornment'
import MuiDialog from '@mui/material/Dialog'
import TextField from '@mui/material/TextField'
import { ArrowRight, Check, ChevronRight, Clock3, Copy, Download, FileCheck2, Mail, Plus, ShieldCheck, X } from 'lucide-react'
import { longDate, money, proposalScope, shortDate } from '../lib/proposal-domain'
import { Avatar, Modal, Status } from './common-ui'

export function ProposalForm({ onSave, onClose, existing = null }) {
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

export function SignatureModal({ proposal, onClose, onSign }) {
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

export function ProposalDetail({ proposal, onClose, onPdf, onShare, onMail, onMarkSent, onPreview, onEdit }) {
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

