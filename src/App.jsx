import { useEffect, useMemo, useState } from 'react'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import Popover from '@mui/material/Popover'
import {
  Activity, ArrowRight, ArrowUpRight, Bell, CheckCircle2, ChevronDown, ChevronRight,
  CircleHelp, Clock3, Ellipsis, FileCheck2, FileText, LayoutDashboard, LifeBuoy,
  Menu, Plus, Settings2, ShieldCheck, Users, WalletCards,
} from 'lucide-react'
import LandingPage from './components/landing-page'
import ProductTour from './components/product-tour'
import { PlatformAccess, WorkspaceSetup } from './components/account-flows'
import { DashboardView } from './features/dashboard/DashboardView'
import { ProposalListView } from './features/proposals/ProposalListView'
import { ClientsView } from './features/clients/ClientsView'
import { ModelsView } from './features/models/ModelsView'
import { ResultsView } from './features/results/ResultsView'
import { SettingsView } from './features/settings/SettingsView'
import { supabase } from './lib/supabase'
import { avatarColors, databaseStatus, escapeHtml, longDate, mapProposal, money, proposalScope, shortDate } from './lib/proposal-domain'
import { Avatar, Brand, EmptyState, Modal, ProposalTable, Status, Toast } from './components/common-ui'
import { ProposalDetail, ProposalForm, SignatureModal } from './components/proposal-dialogs'
import { ClientProposal } from './components/client-proposal'
import { ProposalPreview } from './components/proposal-preview'

const navGroups = [
  { title: 'ESPAÇO DE TRABALHO', items: [{ id: 'inicio', label: 'Visão geral', icon: LayoutDashboard }, { id: 'propostas', label: 'Propostas', icon: FileText }, { id: 'clientes', label: 'Clientes', icon: Users }, { id: 'modelos', label: 'Modelos', icon: FileCheck2 }] },
  { title: 'ACOMPANHAMENTO', items: [{ id: 'resultados', label: 'Resultados', icon: Activity }] },
]

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
  const [sort, setSort] = useState('recentes')
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
  const matchingProposals = useMemo(() => {
    const filtered = proposals.filter((proposal) => {
      const term = query.trim().toLocaleLowerCase('pt-BR')
      const matchesTerm = !term || [proposal.title, proposal.client, proposal.id, proposal.email].some((value) => value.toLocaleLowerCase('pt-BR').includes(term))
      const matchesFilter = filter === 'Todas' || proposal.status === filter
      return matchesTerm && matchesFilter
    })
    return filtered.sort((a, b) => {
      if (sort === 'valor') return b.amount - a.amount
      if (sort === 'validade') return new Date(a.due || '9999-12-31') - new Date(b.due || '9999-12-31')
      return new Date(b.date || 0) - new Date(a.date || 0)
    })
  }, [proposals, query, filter, sort])

  const clientSummaries = useMemo(() => {
    const summary = new Map()
    proposals.forEach((proposal) => {
      if (!proposal.client) return
      const current = summary.get(proposal.client) || { ...proposal, count: 0, total: 0, open: 0, lastActivity: proposal.date }
      current.count += 1
      current.total += proposal.amount
      if (['Enviada', 'Visualizada', 'Em negociação', 'Pronta para envio'].includes(proposal.status)) current.open += 1
      if (String(proposal.date) > String(current.lastActivity)) {
        current.lastActivity = proposal.date
        current.email = proposal.email
        current.initials = proposal.initials
        current.color = proposal.color
      }
      summary.set(proposal.client, current)
    })
    return [...summary.values()].sort((a, b) => String(b.lastActivity).localeCompare(String(a.lastActivity)))
  }, [proposals])

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

  function openNav(id) { setView(id); setMobileNav(false); setQuery(''); setFilter('Todas'); setSort('recentes') }

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
        {view === 'inicio' && <DashboardView todayLabel={todayLabel} greeting={greeting} userName={userName} pendingValue={pendingValue} openProposals={openProposals} acceptedValue={acceptedValue} accepted={accepted} acceptanceRate={acceptanceRate} upcomingCount={upcomingCount} dataLoading={dataLoading} proposals={proposals} ProposalTable={ProposalTable} setSelected={setSelected} setCreateOpen={setCreateOpen} openNav={openNav} pipelineStages={pipelineStages} maxPipeline={maxPipeline} notify={notify} />}
        {view === 'propostas' && <ProposalListView matchingProposals={matchingProposals} proposals={proposals} query={query} setQuery={setQuery} sort={sort} setSort={setSort} filter={filter} setFilter={setFilter} filterAnchor={filterAnchor} setFilterAnchor={setFilterAnchor} filterOpen={filterOpen} dataLoading={dataLoading} ProposalTable={ProposalTable} setSelected={setSelected} setCreateOpen={setCreateOpen} setView={setView} setMobileNav={setMobileNav} notify={notify} EmptyState={EmptyState} />}
        {view === 'clientes' && <ClientsView clients={clientSummaries} money={money} shortDate={shortDate} Avatar={Avatar} EmptyState={EmptyState} setCreateOpen={setCreateOpen} openClient={(client) => { openNav('propostas'); setQuery(client) }} />}
        {view === 'modelos' && <ModelsView setCreateOpen={setCreateOpen} />}
        {view === 'resultados' && <ResultsView proposals={proposals} accepted={accepted} acceptanceRate={acceptanceRate} pendingValue={pendingValue} openProposals={openProposals} money={money} printReport={printReport} openNav={openNav} setSelected={setSelected} Avatar={Avatar} Status={Status} />}
        {view === 'configuracoes' && <SettingsView workspace={workspace} email={session?.user?.email} exitWorkspace={exitWorkspace} />}
        <footer className="app-footer"><span>FechaProposta <i>·</i> propostas com próximo passo</span><span><ShieldCheck size={13} /> Dados da conta sincronizados com Supabase</span></footer>
      </div>
    </main>
    {createOpen && <ProposalForm existing={editing} onClose={() => { setCreateOpen(false); setEditing(null) }} onSave={createProposal} />}
    {selected && <ProposalDetail proposal={proposals.find((proposal) => proposal.id === selected.id) || selected} onClose={() => setSelected(null)} onPdf={printProposal} onShare={shareProposal} onMail={emailProposal} onMarkSent={markSent} onPreview={setClientPreview} onEdit={editProposal} />}
    {clientPreview && <ProposalPreview clientPreview={clientPreview} previewScope={previewScope} money={money} onClose={() => setClientPreview(null)} onSign={() => { setClientPreview(null); setSigning(clientPreview) }} />}
    {signing && <SignatureModal proposal={signing} onClose={() => setSigning(null)} onSign={(data) => signProposal(signing, data)} />}
    {toast && <Toast onClose={() => setToast('')}>{toast}</Toast>}
  </div>
}

export default App
