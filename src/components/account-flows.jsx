import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import MuiDialog from '@mui/material/Dialog'
import TextField from '@mui/material/TextField'
import { ArrowRight, CheckCircle2, LockKeyhole, X } from 'lucide-react'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'

function Dialog({ title, eyebrow, children, onClose, className = '' }) {
  return <MuiDialog open onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="account-dialog-title" slotProps={{ paper: { component: 'section', className: 'account-dialog ' + className } }}>
      <div className="account-dialog-heading"><div><span className="marketing-eyebrow">{eyebrow}</span><h2 id="account-dialog-title">{title}</h2></div><Button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></Button></div>
      {children}
  </MuiDialog>
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
      {mode === 'signup' && <TextField className="account-field" label="Seu nome" name="name" required autoComplete="name" slotProps={{ htmlInput: { maxLength: 120 } }} placeholder="Como podemos chamar você?" size="small" fullWidth />}
      <TextField className="account-field" label="E-mail" name="email" type="email" required autoComplete="email" slotProps={{ htmlInput: { maxLength: 254 } }} placeholder="voce@empresa.com.br" size="small" fullWidth />
      <TextField className="account-field" label="Senha" name="password" type="password" required slotProps={{ htmlInput: { minLength: 8 } }} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Pelo menos 8 caracteres" size="small" fullWidth />
      {error && <Alert className="account-feedback account-error" severity="error" variant="outlined">{error}</Alert>}
      {notice && <Alert className="account-feedback account-success" severity="success" variant="outlined">{notice}</Alert>}
      <Button className="marketing-button marketing-button-dark account-submit" type="submit" disabled={busy}>{busy ? <CircularProgress size={16} color="inherit" /> : <LockKeyhole size={15} />}{mode === 'login' ? 'Entrar' : 'Criar conta'} <ArrowRight size={15} /></Button>
    </form>
    <Button className="account-mode-toggle" onClick={() => { setMode((value) => value === 'login' ? 'signup' : 'login'); setError(''); setNotice('') }}>{mode === 'login' ? 'Ainda não tem uma conta? Criar conta' : 'Já tem uma conta? Entrar'}</Button>
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

  return <main className="workspace-setup-page"><Card component="section" className="workspace-setup-card">
    <span className="workspace-setup-icon"><CheckCircle2 size={21} /></span>
    <span className="marketing-eyebrow">SEU TESTE GRATUITO</span>
    <h1>Prepare seu espaço para começar.</h1>
    <p>Seu teste de 3 dias começa quando você criar este espaço. Seus clientes e propostas ficam protegidos e só aparecem para pessoas autorizadas.</p>
    <form className="account-form" onSubmit={submit}>
      <TextField className="account-field" label="Nome do espaço de trabalho" name="workspace" required slotProps={{ htmlInput: { maxLength: 120 } }} autoFocus placeholder="Nome da sua empresa" size="small" fullWidth />
      {error && <Alert className="account-feedback account-error" severity="error" variant="outlined">{error}</Alert>}
      <Button className="marketing-button marketing-button-dark account-submit" type="submit" disabled={busy}>{busy ? <CircularProgress size={16} color="inherit" /> : null} Criar espaço <ArrowRight size={15} /></Button>
    </form>
    <Button className="account-mode-toggle" onClick={onSignOut}>Sair da conta</Button>
  </Card></main>
}
