import { useEffect, useRef, useState } from 'react'
import useDialogAccessibility from '../lib/use-dialog-accessibility'
import {
  Activity, ArrowRight, ArrowUpRight, BadgeCheck, CalendarDays, Check, CheckCircle2, ChevronDown, CircleHelp,
  FileCheck2, FileSignature, FileText, Handshake, Lightbulb, Menu, ShieldCheck, Sparkles,
  Send, Users, WalletCards, X,
} from 'lucide-react'

const plans = [
  {
    id: 'starter', name: 'Starter', price: 'R$ 29', caption: 'Para começar com clareza',
    description: 'Organize suas primeiras propostas e passe uma imagem mais profissional desde o início.',
    features: ['5 propostas por mês', 'Modelos essenciais', 'Link público da proposta'],
  },
  {
    id: 'pro', name: 'Pro', price: 'R$ 59', caption: 'Mais escolhido',
    description: 'Crie propostas sem limite e acompanhe a decisão do cliente em um só lugar.',
    features: ['Propostas ilimitadas', 'Modelos premium', 'Aceite online', 'Acompanhamento de status'],
  },
  {
    id: 'business', name: 'Business', price: 'R$ 99', caption: 'Para trabalhar em equipe',
    description: 'Reúna equipe, identidade visual e um processo comercial feito para crescer.',
    features: ['Tudo do Pro', 'Equipe e permissões', 'Identidade da sua marca', 'Fluxos comerciais avançados'],
  },
]

function safeDestination(value) {
  if (!value?.trim()) return ''
  try {
    const destination = new URL(value, window.location.origin)
    return ['http:', 'https:'].includes(destination.protocol) ? destination.href : ''
  } catch {
    return ''
  }
}

function Logo() {
  return <span className="marketing-brand"><span className="marketing-brand-mark"><i /><i /><i /><i /></span><span>fecha<span>.</span></span></span>
}

function ProductPreview() {
  return <div className="marketing-product" role="img" aria-label="Prévia do painel FechaProposta">
    <div className="product-topbar"><span className="product-lights"><i /><i /><i /></span><span>app.fechaproposta.com.br <i>/</i> propostas</span><span className="product-live"><i /> ATIVO</span></div>
    <div className="product-body">
      <aside className="product-sidebar"><span className="product-symbol"><i /><i /><i /><i /></span><span className="product-nav current"><FileText size={14} /></span><span className="product-nav"><Users size={14} /></span><span className="product-nav"><WalletCards size={14} /></span><span className="product-avatar">MA</span></aside>
      <div className="product-content"><div className="product-heading"><div><small>VISÃO GERAL</small><strong>Propostas que avançam.</strong><span>Bom dia, Marina. Aqui está o movimento da semana.</span></div><button><i>+</i> Nova proposta</button></div>
        <div className="product-metrics"><div><small>Em negociação</small><b>R$ 38.400</b><span>03 propostas abertas</span></div><div><small>Valor aceito</small><b>R$ 24.500</b><span className="product-success"><Check size={11} /> 01 novo aceite</span></div></div>
        <div className="product-list"><div className="product-list-head"><b>Recentes</b><span>Ver todas <ArrowUpRight size={11} /></span></div><div className="product-row"><span className="product-client client-lilac">CH</span><span><b>Redesign do site</b><small>Clínica Horizonte · há 2h</small></span><strong>R$ 18.400</strong><i className="product-status status-sent">Enviada</i></div><div className="product-row"><span className="product-client client-green">GN</span><span><b>Identidade visual</b><small>Grupo Nexo · há 1 dia</small></span><strong>R$ 24.500</strong><i className="product-status status-accepted">Aceita</i></div></div>
        <div className="product-insight"><span><Sparkles size={13} /></span><div><b>Tem uma proposta perto do vencimento</b><small>Envie um lembrete gentil para retomar a conversa.</small></div><ArrowRight size={13} /></div>
      </div>
    </div>
    <div className="product-floating"><span><FileSignature size={15} /></span><div><b>Aceite registrado</b><small>Identidade visual · agora</small></div><CheckCircle2 size={16} /></div>
  </div>
}

function PlanDialog({ plan, onClose, onEnter }) {
  const dialogRef = useRef(null)
  useDialogAccessibility(dialogRef, onClose)

  if (!plan) return null
  return <div className="plan-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={dialogRef} tabIndex={-1} className="plan-dialog" role="dialog" aria-modal="true" aria-labelledby="plan-dialog-title">
      <button className="plan-dialog-close" aria-label="Fechar" onClick={onClose}><X size={18} /></button>
      <span className="plan-dialog-icon"><CheckCircle2 size={21} /></span>
      <span className="marketing-eyebrow">PLANO {plan.name.toUpperCase()}</span>
      <h2 id="plan-dialog-title">Um próximo passo mais profissional.</h2>
      <p>O plano <strong>{plan.name}</strong> custa <strong>{plan.price}/mês</strong> e inclui:</p>
      <ul>{plan.features.map((feature) => <li key={feature}><Check size={14} /> {feature}</li>)}</ul>
      <div className="plan-demo-notice"><ShieldCheck size={16} /><span>Você está vendo uma prévia. A cobrança ainda não está ativa, e nenhuma compra será feita ao explorar o painel.</span></div>
      <button className="marketing-button marketing-button-dark plan-continue" onClick={() => onEnter(plan.id)}>Explorar a demonstração <ArrowRight size={16} /></button>
      <button className="plan-dialog-back" onClick={onClose}>Voltar aos planos</button>
    </section>
  </div>
}

export default function LandingPage({ onEnter }) {
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const platformUrl = safeDestination(import.meta.env.VITE_PLATFORM_URL)
  const demoBookingUrl = safeDestination(import.meta.env.VITE_DEMO_BOOKING_URL)

  function closeMenu() { setMenuOpen(false) }

  useEffect(() => {
    if (!menuOpen) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return <div className="marketing-page" id="inicio">
    <header className="marketing-header"><div className="marketing-header-inner"><a href="#inicio" aria-label="FechaProposta, início"><Logo /></a>
      <nav id="marketing-nav" className={menuOpen ? 'marketing-nav marketing-nav-open' : 'marketing-nav'} aria-label="Navegação principal"><a href="#recursos" onClick={closeMenu}>Recursos</a><a href="#como-funciona" onClick={closeMenu}>Como funciona</a><a href="#planos" onClick={closeMenu}>Planos</a><a href="#duvidas" onClick={closeMenu}>Dúvidas</a><div className="mobile-nav-actions">{platformUrl ? <a className="marketing-button marketing-button-quiet" href={platformUrl} onClick={closeMenu}>Acessar plataforma <ArrowUpRight size={14} /></a> : <button className="marketing-button marketing-button-quiet" onClick={() => { closeMenu(); onEnter() }}>Explorar demonstração</button>}{demoBookingUrl ? <a className="marketing-button marketing-button-dark" href={demoBookingUrl} target="_blank" rel="noreferrer" onClick={closeMenu}>Agendar demonstração <ArrowRight size={14} /></a> : <a className="marketing-button marketing-button-dark" href="#planos" onClick={closeMenu}>Ver planos <ArrowRight size={14} /></a>}</div></nav>
      <div className="marketing-header-actions">{platformUrl ? <a className="marketing-login" href={platformUrl}>Acessar plataforma <ArrowUpRight size={14} /></a> : <button className="marketing-login" onClick={() => onEnter()}>Explorar demonstração <ArrowUpRight size={14} /></button>}<a className="marketing-button marketing-button-dark header-plan-cta" href="#planos">Ver planos <ArrowRight size={14} /></a><button ref={menuButtonRef} className="marketing-menu-toggle" aria-controls="marketing-nav" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
    </div></header>

    <main>
      <section className="marketing-hero" aria-labelledby="marketing-title"><div className="marketing-hero-grid" /><div className="marketing-hero-glow" /><div className="marketing-hero-inner">
        <div className="marketing-hero-copy"><span className="marketing-pill"><i /> PROPOSTAS COMERCIAIS, COM MAIS CLAREZA</span><h1 id="marketing-title">Seu trabalho<br />merece um <em>sim.</em></h1><p>Crie propostas que explicam o valor do seu trabalho, deixam o próximo passo claro e ajudam o cliente a decidir com confiança.</p><div className="marketing-hero-actions"><a href="#planos" className="marketing-button marketing-button-lime">Ver planos <ArrowRight size={17} /></a>{demoBookingUrl ? <a className="marketing-button marketing-button-outline" href={demoBookingUrl} target="_blank" rel="noreferrer"><span><CalendarDays size={14} /></span> Agendar demonstração</a> : <button className="marketing-button marketing-button-outline" onClick={() => onEnter()}><span><FileText size={14} /></span> Explorar demonstração</button>}</div><div className="marketing-hero-note"><span className="hero-check"><Check size={13} /></span><span>Planos desde R$ 29/mês</span><i /> <span>Proposta clara, do envio ao aceite</span></div></div>
        <div className="marketing-hero-visual"><ProductPreview /><div className="hero-proof-card"><span><BadgeCheck size={17} /></span><div><strong>Escopo aprovado</strong><small>Cliente assinou online</small></div><span className="proof-check"><Check size={12} /></span></div><div className="hero-detail-card"><span>VALOR DA PROPOSTA</span><strong>R$ 24.500</strong><small><CheckCircle2 size={12} /> Aprovada hoje</small></div></div>
      </div><div className="marketing-hero-bottom"><span>ESCRITA COM CLAREZA</span><i /><span>VALORES TRANSPARENTES</span><i /><span>ACEITE SEM ATRITO</span></div></section>

      <section className="marketing-proof-strip" aria-label="O que você pode fazer"><div><span><FileCheck2 size={16} /></span> Criar e organizar propostas</div><i /><div><span><Send size={16} /></span> Compartilhar com o cliente</div><i /><div><span><FileSignature size={16} /></span> Acompanhar o aceite</div><i /><div><span><ShieldCheck size={16} /></span> Guardar o histórico</div></section>

      <section className="marketing-section marketing-features" id="recursos"><div className="marketing-section-heading"><span className="marketing-eyebrow">MENOS IDAS E VINDAS</span><h2>Do “quanto custa?”<br />ao “vamos começar”.</h2><p>Uma proposta organiza a conversa: explica o que será feito, quanto custa e o que acontece depois do aceite.</p></div><div className="marketing-feature-grid">
        <article className="marketing-feature-card"><span className="feature-icon feature-icon-sage"><Lightbulb size={19} /></span><small>01 / CLAREZA</small><h3>O valor fica fácil de entender.</h3><p>Apresente objetivo, entregáveis, prazo e investimento numa sequência que faz sentido para o cliente.</p><a href="#proposta-cliente">Ver a proposta do cliente <ArrowRight size={13} /></a></article>
        <article className="marketing-feature-card"><span className="feature-icon feature-icon-lilac"><FileSignature size={19} /></span><small>02 / FLUIDEZ</small><h3>A aprovação acontece no link.</h3><p>Seu cliente confere a proposta e responde sem baixar arquivos ou criar uma conta.</p><a href="#como-funciona">Conhecer o fluxo <ArrowRight size={13} /></a></article>
        <article className="marketing-feature-card"><span className="feature-icon feature-icon-peach"><Activity size={19} /></span><small>03 / VISIBILIDADE</small><h3>Você sabe o que pede atenção.</h3><p>Acompanhe o status, retome a conversa no momento certo e mantenha o histórico por perto.</p><a href="#planos">Ver recursos por plano <ArrowRight size={13} /></a></article>
      </div></section>

      <section className="marketing-workflow" id="como-funciona"><div className="workflow-inner"><div className="marketing-section-heading"><span className="marketing-eyebrow">UM FLUXO MAIS SIMPLES</span><h2>Do primeiro rascunho<br />ao próximo projeto.</h2><p>Você conduz a conversa. A plataforma deixa cada etapa visível para todo mundo.</p><button className="marketing-text-link" onClick={() => onEnter()}>Ver por dentro <ArrowRight size={14} /></button></div><div className="workflow-steps"><article><span className="workflow-number">01</span><div className="workflow-icon"><FileText size={18} /></div><div><h3>Monte o escopo</h3><p>Descreva o desafio, os resultados esperados, os itens e o prazo.</p></div></article><article><span className="workflow-number">02</span><div className="workflow-icon"><ArrowUpRight size={18} /></div><div><h3>Envie para decidir</h3><p>Compartilhe o link ou gere um PDF com a identidade do seu negócio.</p></div></article><article><span className="workflow-number">03</span><div className="workflow-icon"><Handshake size={18} /></div><div><h3>Registre o aceite</h3><p>O cliente confirma o que foi combinado e vocês sabem qual é o próximo passo.</p></div></article></div></div></section>

      <section className="marketing-client-preview" id="proposta-cliente"><div className="client-preview-copy"><span className="marketing-eyebrow">DO LADO DO CLIENTE</span><h2>Sem adivinhar.<br />Sem procurar informação.</h2><p>Quem recebe a proposta encontra o resumo do projeto, as entregas, o prazo, o investimento e as condições no mesmo lugar.</p><div className="preview-check-list"><span><CheckCircle2 size={16} /> Objetivo explicado em linguagem simples</span><span><CheckCircle2 size={16} /> Escopo e investimento discriminados</span><span><CheckCircle2 size={16} /> Próximo passo visível antes do aceite</span></div><a className="marketing-text-link" href="#planos">Quero enviar propostas assim <ArrowRight size={14} /></a></div><article className="client-sample-card"><div className="client-sample-top"><span className="sample-brand"><Logo /></span><span className="sample-tag"><i /> PROPOSTA COMERCIAL</span></div><small className="sample-overline">PARA ESTÚDIO HORIZONTE · FP-2026-048</small><h3>Uma nova identidade para<br />uma marca em movimento.</h3><p className="sample-lead">Vamos transformar a evolução da Horizonte em uma identidade clara, reconhecível e pronta para os próximos pontos de contato.</p><div className="sample-scope"><span>O QUE VAMOS FAZER</span><div><Check size={13} /> Imersão e estratégia da marca</div><div><Check size={13} /> Sistema visual e aplicações principais</div><div><Check size={13} /> Guia de uso para a equipe</div></div><div className="sample-footer"><div><small>PRAZO ESTIMADO</small><strong>4 a 6 semanas</strong></div><div><small>INVESTIMENTO</small><strong>R$ 18.400</strong></div><span><ArrowRight size={15} /></span></div></article></section>

      <section className="marketing-pricing" id="planos"><div className="marketing-section-heading"><span className="marketing-eyebrow">ASSINATURA DA PLATAFORMA</span><h2>Um plano para cada<br />fase do seu trabalho.</h2><p>Escolha como quer organizar suas propostas. O valor do seu serviço continua sendo definido por você.</p></div><div className="pricing-disclosure"><ShieldCheck size={16} /><span>Estes valores são da assinatura mensal do FechaProposta. O investimento cobrado do seu cliente é definido dentro de cada proposta.</span></div><div className="marketing-plan-grid">{plans.map((plan) => <article className={'marketing-plan-card' + (plan.id === 'pro' ? ' marketing-plan-highlight' : '')} key={plan.id}>{plan.id === 'pro' && <span className="recommended-badge"><Sparkles size={12} /> MAIS ESCOLHIDO</span>}<span className="plan-card-icon">{plan.id === 'starter' ? <FileText size={18} /> : plan.id === 'pro' ? <Sparkles size={18} /> : <Users size={18} />}</span><span className="plan-card-name">{plan.name}</span><p>{plan.description}</p><div className="plan-price"><strong>{plan.price}</strong><span>/ mês</span></div><div className="plan-rule" /><ul>{plan.features.map((feature) => <li key={feature}><Check size={14} /> {feature}</li>)}</ul><button className={plan.id === 'pro' ? 'marketing-button marketing-button-lime' : 'marketing-button marketing-button-card'} onClick={() => setSelectedPlan(plan)}>Escolher {plan.name} <ArrowRight size={15} /></button><small className="plan-monthly">Assinatura mensal</small></article>)}</div><p className="pricing-footnote">Valores mensais em reais.</p></section>

      <section className="marketing-faq" id="duvidas"><div className="faq-heading"><span className="marketing-eyebrow">PERGUNTAS FREQUENTES</span><h2>Bom saber<br />antes de começar.</h2><p>Transparência também faz parte de uma boa proposta.</p></div><div className="faq-list"><details><summary>O que a assinatura cobre?<ChevronDown size={16} /></summary><p>O plano libera os recursos do FechaProposta. Você define separadamente o escopo e o valor do serviço que está vendendo ao seu cliente.</p></details><details><summary>Meu cliente precisa assinar o plano?<ChevronDown size={16} /></summary><p>Não. O plano é para quem cria propostas. O cliente acessa a proposta compartilhada para ler o escopo e responder.</p></details><details><summary>Posso gerar um PDF da proposta?<ChevronDown size={16} /></summary><p>Sim. Você pode compartilhar a proposta por link e gerar uma versão para impressão ou PDF.</p></details><details><summary>Como funciona o aceite online?<ChevronDown size={16} /></summary><p>O cliente revisa objetivo, entregas, valores e condições antes de confirmar. Para assinatura eletrônica certificada e trilha de auditoria, é necessário conectar um provedor especializado.</p></details></div></section>

      <section className="marketing-final-cta"><div><span className="marketing-pill"><i /> PRONTO PARA O PRÓXIMO SIM?</span><h2>Uma proposta melhor<br />começa com <em>clareza.</em></h2><p>Escolha um plano para conhecer o fluxo completo da plataforma.</p></div><a className="marketing-button marketing-button-lime" href="#planos">Ver planos e recursos <ArrowRight size={16} /></a><span className="final-orbit">✳</span></section>
    </main>

    <footer className="marketing-footer"><a href="#inicio"><Logo /></a><span>Propostas claras. Próximos passos combinados.</span><div><a href="#recursos">Recursos</a><a href="#planos">Planos</a><a href="#duvidas">Dúvidas</a><button onClick={() => onEnter()}>Explorar demonstração <ArrowUpRight size={12} /></button></div><small>© 2026 FechaProposta · Demonstração interativa; os dados ficam neste navegador. Não use informações reais.</small></footer>
    {selectedPlan && <PlanDialog plan={selectedPlan} onClose={() => setSelectedPlan(null)} onEnter={(planId) => { setSelectedPlan(null); onEnter(planId) }} />}
  </div>
}

