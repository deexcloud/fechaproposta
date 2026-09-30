import { useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, X } from 'lucide-react'
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

export function PlatformAccess({ onClose, onAuthenticated, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
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
    <p className="account-dialog-copy">{mode === 'signup' ? 'Crie sua conta. Seu teste grátis de 3 dias começa quando você criar o primeiro espaço de trabalho.' : 'Entre para ver seus espaços de trabalho ou crie uma conta para começar.'}</p>
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
    <span className="marketing-eyebrow">SEU TESTE GRATUITO</span>
    <h1>Prepare seu espaço para começar.</h1>
    <p>Seu teste de 3 dias começa quando você criar este espaço. Seus clientes e propostas ficam protegidos e só aparecem para pessoas autorizadas.</p>
    <form className="account-form" onSubmit={submit}>
      <label className="account-field"><span>Nome do espaço de trabalho</span><input name="workspace" required maxLength="120" autoFocus placeholder="Nome da sua empresa" /></label>
      {error && <p className="account-feedback account-error" role="alert">{error}</p>}
      <button className="marketing-button marketing-button-dark account-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="account-spinner" /> : null} Criar espaço <ArrowRight size={15} /></button>
    </form>
    <button className="account-mode-toggle" onClick={onSignOut}>Sair da conta</button>
  </section></main>
}
