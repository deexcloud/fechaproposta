import { useState } from 'react'
import Button from '@mui/material/Button'
import MuiDialog from '@mui/material/Dialog'
import {
  Activity, ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, Clock3,
  FileCheck2, FileText, LayoutDashboard, Link2, ListChecks, Send, Users, WalletCards, X,
} from 'lucide-react'

const steps = [
  {
    id: 'overview',
    eyebrow: '01 · VISÃO GERAL',
    title: 'Comece sabendo o que precisa de atenção.',
    description: 'O painel reúne propostas abertas, valores aceitos e prazos próximos para você decidir seu próximo passo.',
  },
  {
    id: 'proposal',
    eyebrow: '02 · CRIAÇÃO',
    title: 'Monte a proposta com todas as informações no lugar.',
    description: 'Organize cliente, objetivo, entregas, prazo, investimento e condições em um único documento.',
  },
  {
    id: 'share',
    eyebrow: '03 · COMPARTILHAMENTO',
    title: 'Envie um link fácil de abrir e entender.',
    description: 'A pessoa cliente vê o escopo e os valores sem precisar criar uma conta ou baixar um arquivo.',
  },
  {
    id: 'tracking',
    eyebrow: '04 · ACOMPANHAMENTO',
    title: 'Veja em que etapa cada conversa está.',
    description: 'Atualize o status da proposta e mantenha o histórico do que foi enviado e combinado.',
  },
  {
    id: 'acceptance',
    eyebrow: '05 · ACEITE',
    title: 'Registre a decisão e combine o próximo passo.',
    description: 'O aceite fica associado à proposta, com nome e data para você consultar depois.',
  },
]

function TourPreview({ step }) {
  if (step === 'overview') return <div className="tour-preview-screen">
    <div className="tour-preview-top"><span><LayoutDashboard size={15} /> Visão geral</span><small>ESPAÇO DE TRABALHO</small></div>
    <div className="tour-metric-grid"><div><small>EM ABERTO</small><strong>R$ 8.400</strong><span>3 propostas</span></div><div><small>ACEITAS</small><strong>R$ 5.200</strong><span className="tour-green"><Check size={12} /> 2 projetos</span></div><div><small>PRÓXIMAS</small><strong>2</strong><span>prazos nesta semana</span></div></div>
    <div className="tour-preview-list"><strong>Atividade recente</strong><div><span className="tour-dot tour-dot-blue" /> Identidade visual <small>Enviada · hoje</small></div><div><span className="tour-dot tour-dot-green" /> Site institucional <small>Aceita · ontem</small></div></div>
  </div>

  if (step === 'proposal') return <div className="tour-preview-screen">
    <div className="tour-preview-top"><span><FileText size={15} /> Nova proposta</span><small>RASCUNHO</small></div>
    <div className="tour-form-preview"><div><small>CLIENTE</small><strong>Ateliê Aurora</strong></div><div><small>OBJETIVO</small><strong>Nova identidade visual</strong></div><div className="tour-form-wide"><small>ENTREGAS</small><span><Check size={12} /> Direção visual e referências</span><span><Check size={12} /> Logotipo e aplicações</span></div><div><small>PRAZO</small><strong>15 dias úteis</strong></div><div><small>INVESTIMENTO</small><strong>R$ 2.400,00</strong></div></div>
    <div className="tour-preview-hint"><ListChecks size={14} /> Campos claros ajudam a evitar dúvidas antes do envio.</div>
  </div>

  if (step === 'share') return <div className="tour-preview-screen tour-share-layout">
    <div className="tour-client-paper"><div className="tour-paper-brand">fecha<span>.</span></div><small>PROPOSTA COMERCIAL · FP-2026-014</small><h3>Nova identidade visual</h3><p>Uma identidade para comunicar o jeito único do Ateliê Aurora.</p><div className="tour-paper-row"><span>Entregas</span><strong>4 etapas</strong></div><div className="tour-paper-row"><span>Prazo estimado</span><strong>15 dias úteis</strong></div><div className="tour-paper-total"><span>Investimento</span><strong>R$ 2.400</strong></div></div>
    <div className="tour-share-card"><span><Link2 size={16} /></span><strong>Link pronto para compartilhar</strong><small>O cliente abre a proposta direto no navegador.</small><div>Link público · token protegido</div><Button type="button" tabIndex={-1}>Copiar link <Check size={12} /></Button></div>
  </div>

  if (step === 'tracking') return <div className="tour-preview-screen">
    <div className="tour-preview-top"><span><Activity size={15} /> Propostas</span><small>ACOMPANHAMENTO</small></div>
    <div className="tour-status-list"><div><span className="tour-status-icon"><FileText size={14} /></span><span><strong>Identidade visual</strong><small>Ateliê Aurora · R$ 2.400</small></span><b className="tour-status-sent">Enviada</b></div><div><span className="tour-status-icon"><Clock3 size={14} /></span><span><strong>Site institucional</strong><small>Casa Nativa · R$ 5.200</small></span><b className="tour-status-viewed">Visualizada</b></div><div><span className="tour-status-icon"><CheckCircle2 size={14} /></span><span><strong>Consultoria de marca</strong><small>Estúdio Ipê · R$ 1.800</small></span><b className="tour-status-accepted">Aceita</b></div></div>
    <div className="tour-preview-hint"><Activity size={14} /> Um histórico simples mantém cada conversa no contexto.</div>
  </div>

  return <div className="tour-preview-screen tour-accepted-screen">
    <span className="tour-accepted-icon"><BadgeCheck size={25} /></span><small>DECISÃO REGISTRADA</small><h3>Proposta aceita</h3><p>Nova identidade visual · Ateliê Aurora</p>
    <div className="tour-accept-details"><span><Users size={13} /> Aceita por <strong>Marina Costa</strong></span><span><Clock3 size={13} /> Registrada <strong>hoje</strong></span></div>
    <div className="tour-next-step"><CheckCircle2 size={15} /><span><strong>Próximo passo</strong><small>Combinar o início e os materiais necessários.</small></span><WalletCards size={16} /></div>
  </div>
}

export default function ProductTour({ onClose, onStartTrial }) {
  const [stepIndex, setStepIndex] = useState(0)

  const step = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1
  const progress = ((stepIndex + 1) / steps.length) * 100

  function goToStep(index) {
    setStepIndex(Math.max(0, Math.min(steps.length - 1, index)))
  }

  return <MuiDialog open onClose={onClose} fullWidth maxWidth={false} aria-labelledby="tour-title" aria-describedby="tour-description" classes={{ root: 'tour-backdrop' }} slotProps={{ paper: { component: 'section', className: 'guided-tour' } }}>
      <header className="tour-heading">
        <div><span className="marketing-eyebrow">PASSEIO GUIADO · TESTE GRÁTIS POR 3 DIAS</span><h2 id="tour-title">Veja a plataforma em 2 minutos.</h2></div>
        <Button className="icon-btn" onClick={onClose} aria-label="Fechar passeio"><X size={18} /></Button>
      </header>
      <div className="tour-progress-row"><span>Etapa {stepIndex + 1} de {steps.length}</span><div className="tour-progress-track" role="progressbar" aria-label="Progresso do passeio" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={stepIndex + 1}><span style={{ width: progress + '%' }} /></div><Button className="tour-skip" onClick={onStartTrial}>Pular passeio</Button></div>
      <div className="tour-copy" aria-live="polite"><span>{step.eyebrow}</span><h3>{step.title}</h3><p id="tour-description">{step.description}</p></div>
      <div className="tour-visual" key={step.id}><TourPreview step={step.id} /></div>
      <footer className="tour-footer"><Button className="tour-back" onClick={() => goToStep(stepIndex - 1)} disabled={stepIndex === 0}><ArrowLeft size={15} /> Voltar</Button><div className="tour-step-dots" aria-label="Etapas do passeio">{steps.map((item, index) => <Button key={item.id} className={index === stepIndex ? 'tour-step-dot tour-step-dot-active' : 'tour-step-dot'} onClick={() => goToStep(index)} aria-label={'Ir para etapa ' + (index + 1) + ': ' + item.eyebrow.split(' · ')[1]} aria-current={index === stepIndex ? 'step' : undefined} />)}</div><Button className="marketing-button marketing-button-dark tour-next" onClick={() => isLastStep ? onStartTrial() : goToStep(stepIndex + 1)}>{isLastStep ? 'Criar conta e começar' : 'Próxima etapa'} <ArrowRight size={15} /></Button></footer>
      <p className="tour-disclosure">Prévia ilustrativa, sem salvar dados. O período começa após criar seu primeiro espaço de trabalho e dura 3 dias.</p>
  </MuiDialog>
}
