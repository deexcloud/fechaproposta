import { useRef, useState } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, LoaderCircle, LockKeyhole, Mail, X } from 'lucide-react'
import useDialogAccessibility from '../lib/use-dialog-accessibility'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'

function Dialog({ title, eyebrow, children, onClose, className = '' }) {
  const dialogRef = useRef(null)
  useDialogAccessibility(dialogRef, onClose)

  return <div className="account-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={dialogRef} tabIndex={-1} className={'account-dialog ' + className} role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
      <div className="account-dialog-heading"><div><span className="marketing-eyebrow">{eyebrow}</span><h2 id="account-dialog-title">{title}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
      {children}
    </section>
  </div>
}

export function PlatformAccess({ onClose, onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!isSupabaseConfigured) {
      setError('A conexão com o Supabase ainda não está configurada. Adicione as variáveis do projeto e publique novamente.')
      return
    }

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim().toLowerCase()
    const password = String(form.get('password'))
    setBusy(true)
    try {
      const client = requireSupabase()
      const result = mode === 'login'
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({ email, password, options: { data: { full_name: String(form.get('name')).trim() } } })
      if (result.error) throw result.error
      if (result.data.session) {
        onAuthenticated(result.data.session)
        onClose()
      } else {
        setNotice('Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre na plataforma.')
        setMode('login')
      }
    } catch (cause) {
      setError(cause.message || 'Não foi possível acessar sua conta agora.')
    } finally {
      setBusy(false)
    }
  }

  return <Dialog title={mode === 'login' ? 'Acesse sua plataforma.' : 'Crie sua conta.'} eyebrow="ACESSAR PLATAFORMA" onClose={onClose}>
    <p className="account-dialog-copy">Entre para ver os dados do seu espaço de trabalho ou crie uma conta para começar.</p>
    <form className="account-form" onSubmit={submit}>
      {mode === 'signup' && <label className="account-field"><span>Seu nome</span><input name="name" required autoComplete="name" maxLength="120" placeholder="Como podemos chamar você?" /></label>}
      <label className="account-field"><span>E-mail</span><input name="email" type="email" required autoComplete="email" maxLength="254" placeholder="voce@empresa.com.br" /></label>
      <label className="account-field"><span>Senha</span><input name="password" type="password" required minLength="8" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Pelo menos 8 caracteres" /></label>
      {error && <p className="account-feedback account-error" role="alert">{error}</p>}
      {notice && <p className="account-feedback account-success" role="status">{notice}</p>}
      <button className="marketing-button marketing-button-dark account-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="account-spinner" /> : <LockKeyhole size={15} />}{mode === 'login' ? 'Entrar' : 'Criar conta'} <ArrowRight size={15} /></button>
    </form>
    <button className="account-mode-toggle" onClick={() => { setMode((value) => value === 'login' ? 'signup' : 'login'); setError(''); setNotice('') }}>{mode === 'login' ? 'Ainda não tem uma conta? Criar conta' : 'Já tem uma conta? Entrar'}</button>
  </Dialog>
}

export function DemoRequest({ onClose }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const email = String(new FormData(event.currentTarget).get('email')).trim().toLowerCase()
    try {
      const { error: requestError } = await requireSupabase().from('demo_requests').insert({ email })
      if (requestError) throw requestError
      setSubmitted(true)
    } catch (cause) {
      setError(isSupabaseConfigured ? 'Não foi possível enviar seu pedido agora. Tente novamente em instantes.' : 'A conexão com o Supabase ainda não está configurada para receber pedidos.')
    } finally {
      setBusy(false)
    }
  }

  return <Dialog title={submitted ? 'Pedido recebido.' : 'Vamos apresentar a plataforma.'} eyebrow="AGENDAR DEMONSTRAÇÃO" onClose={onClose} className="demo-request-dialog">
    {submitted ? <div className="demo-request-success"><span><CheckCircle2 size={22} /></span><p>Recebemos seu e-mail. Nossa equipe entrará em contato para combinar a demonstração.</p><button className="marketing-button marketing-button-dark account-submit" onClick={onClose}>Concluir <ArrowRight size={15} /></button></div> : <>
      <p className="account-dialog-copy">Deixe seu e-mail e entraremos em contato para combinar um horário. Este pedido não reserva um horário automaticamente.</p>
      <form className="account-form" onSubmit={submit}>
        <label className="account-field"><span>E-mail profissional</span><input name="email" type="email" required autoComplete="email" maxLength="254" placeholder="voce@empresa.com.br" /></label>
        {error && <p className="account-feedback account-error" role="alert">{error}</p>}
        <button className="marketing-button marketing-button-dark account-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="account-spinner" /> : <CalendarDays size={15} />} Solicitar horário <ArrowRight size={15} /></button>
      </form>
    </>}
    <div className="account-dialog-privacy"><Mail size={14} /> Usaremos seu e-mail apenas para responder a este pedido.</div>
  </Dialog>
}

export function WorkspaceSetup({ session, onCreated, onSignOut }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const name = String(new FormData(event.currentTarget).get('workspace')).trim()
    try {
      if (!session?.user?.id) throw new Error('Sua sessão expirou. Entre novamente para criar o espaço.')

      const client = requireSupabase()
      const { data: authData, error: authError } = await client.auth.getUser()
      if (authError || !authData.user || authData.user.id !== session.user.id) {
        throw new Error('Não consegui validar sua sessão com o Supabase. Saia da conta e entre novamente.')
      }

      const { data, error: createError } = await client.rpc('create_workspace', { target_name: name })
      if (createError) throw createError
      if (!data?.id) throw new Error('O Supabase não retornou os dados do espaço criado.')
      onCreated(data)
    } catch (cause) {
      setError(cause.message || 'Não foi possível criar o espaço de trabalho.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="workspace-setup-page"><section className="workspace-setup-card">
    <span className="workspace-setup-icon"><CheckCircle2 size={21} /></span>
    <span className="marketing-eyebrow">SUA PLATAFORMA</span>
    <h1>Vamos preparar seu espaço.</h1>
    <p>Os clientes e as propostas ficam neste espaço e só aparecem para as pessoas autorizadas.</p>
    <form className="account-form" onSubmit={submit}>
      <label className="account-field"><span>Nome do espaço de trabalho</span><input name="workspace" required maxLength="120" autoFocus placeholder="Nome da sua empresa" /></label>
      {error && <p className="account-feedback account-error" role="alert">{error}</p>}
      <button className="marketing-button marketing-button-dark account-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="account-spinner" /> : null} Criar espaço <ArrowRight size={15} /></button>
    </form>
    <button className="account-mode-toggle" onClick={onSignOut}>Sair da conta</button>
  </section></main>
}
