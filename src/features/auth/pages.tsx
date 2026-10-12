import { useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { AuthLayout } from '@/layouts/AuthLayout';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import { BrandLoader } from '@/components/common';
import { useNotify } from '@/components/NotifyProvider';
import { useAuth } from './AuthProvider';
import { PasswordField } from './PasswordField';
import { PRICE_MONTHLY, TRIAL_DAYS } from '@/lib/pricing';
import { TERMS_VERSION } from '@/features/legal/legalInfo';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
  type SignInValues,
  type SignUpValues,
} from './schemas';

const appUrl = (path: string) => `${window.location.origin}${path}`;

export function SignInPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/painel';
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  if (loading) return <BrandLoader />;
  if (user) return <Navigate to={from} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) return setFormError(friendlyError(error));
    navigate(from, { replace: true });
  });

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Acesse suas propostas."
      footer={
        <Typography color="text.secondary">
          Ainda não tem conta?{' '}
          <Link component={RouterLink} to="/criar-conta">{`Testar ${TRIAL_DAYS} dias grátis`}</Link>
        </Typography>
      }
    >
      <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
        {formError && <Alert severity="error">{formError}</Alert>}
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          autoFocus
          {...register('email')}
          error={Boolean(formState.errors.email)}
          helperText={formState.errors.email?.message}
        />
        <PasswordField
          label="Senha"
          autoComplete="current-password"
          {...register('password')}
          error={Boolean(formState.errors.password)}
          helperText={formState.errors.password?.message}
        />
        <Link component={RouterLink} to="/esqueci-senha" sx={{ alignSelf: 'flex-end' }}>
          Esqueci minha senha
        </Link>
        <Button type="submit" variant="contained" size="large" loading={formState.isSubmitting}>
          Entrar
        </Button>
      </Stack>
    </AuthLayout>
  );
}

export function SignUpPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const origin = location.state as { from?: string; email?: string } | null;
  const next = origin?.from ?? '/painel/configurar';
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: origin?.email ?? '', password: '' },
  });

  if (loading) return <BrandLoader />;
  if (user && !sentTo) return <Navigate to={next} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        // Registro do aceite dos termos (versão = data dos textos).
        data: { full_name: values.fullName, terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() },
        emailRedirectTo: appUrl(next),
      },
    });
    if (error) return setFormError(friendlyError(error));
    // Se a confirmação de e-mail estiver ativa no Supabase, não há sessão ainda.
    if (!data.session) return setSentTo(values.email);
    navigate(next, { replace: true });
  });

  if (sentTo) {
    return (
      <AuthLayout title="Confirme seu e-mail">
        <Stack spacing={2}>
          <Typography>
            Enviamos um link de confirmação para <strong>{sentTo}</strong>. Abra o e-mail e toque no link
            para continuar a configuração da sua empresa.
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Não chegou? Confira a caixa de spam ou aguarde alguns minutos.
          </Typography>
          <Button component={RouterLink} to="/entrar" variant="outlined">Voltar para o login</Button>
        </Stack>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle={`Teste tudo por ${TRIAL_DAYS} dias grátis, sem cartão. Depois, R$ ${PRICE_MONTHLY} por mês, sem fidelidade.`}
      footer={
        <Typography color="text.secondary">
          Já tem conta? <Link component={RouterLink} to="/entrar" state={origin}>Entrar</Link>
        </Typography>
      }
    >
      <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
        {formError && <Alert severity="error">{formError}</Alert>}
        <TextField
          label="Seu nome"
          autoComplete="name"
          autoFocus
          {...register('fullName')}
          error={Boolean(formState.errors.fullName)}
          helperText={formState.errors.fullName?.message}
        />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={Boolean(formState.errors.email)}
          helperText={formState.errors.email?.message}
        />
        <PasswordField
          label="Crie uma senha"
          autoComplete="new-password"
          {...register('password')}
          error={Boolean(formState.errors.password)}
          helperText={formState.errors.password?.message ?? 'Pelo menos 8 caracteres.'}
        />
        <Button type="submit" variant="contained" size="large" loading={formState.isSubmitting}>
          Criar conta
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          Ao criar sua conta, você concorda com os{' '}
          <Link component={RouterLink} to="/termos" target="_blank">Termos de uso</Link> e com a{' '}
          <Link component={RouterLink} to="/privacidade" target="_blank">Política de privacidade</Link>.
        </Typography>
      </Stack>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl('/redefinir-senha'),
    });
    if (error) return setFormError(friendlyError(error));
    setSent(true);
  });

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle={sent ? undefined : 'Informe seu e-mail e enviaremos um link para criar uma nova senha.'}
      footer={<Link component={RouterLink} to="/entrar">Voltar para o login</Link>}
    >
      {sent ? (
        <Alert severity="success">
          Se existir uma conta com esse e-mail, você receberá o link em instantes. Confira também o spam.
        </Alert>
      ) : (
        <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            autoFocus
            {...register('email')}
            error={Boolean(formState.errors.email)}
            helperText={formState.errors.email?.message}
          />
          <Button type="submit" variant="contained" size="large" loading={formState.isSubmitting}>
            Enviar link
          </Button>
        </Stack>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  if (loading) return <BrandLoader />;
  if (!user) {
    return (
      <AuthLayout title="Link expirado">
        <Stack spacing={2}>
          <Typography>Esse link de recuperação não é mais válido. Peça um novo.</Typography>
          <Button component={RouterLink} to="/esqueci-senha" variant="contained">Pedir novo link</Button>
        </Stack>
      </AuthLayout>
    );
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setFormError(friendlyError(error));
    notify.success('Senha alterada com sucesso.');
    navigate('/painel', { replace: true });
  });

  return (
    <AuthLayout title="Nova senha" subtitle="Escolha uma nova senha para sua conta.">
      <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
        {formError && <Alert severity="error">{formError}</Alert>}
        <PasswordField
          label="Nova senha"
          autoComplete="new-password"
          autoFocus
          {...register('password')}
          error={Boolean(formState.errors.password)}
          helperText={formState.errors.password?.message ?? 'Pelo menos 8 caracteres.'}
        />
        <PasswordField
          label="Repita a nova senha"
          autoComplete="new-password"
          {...register('confirm')}
          error={Boolean(formState.errors.confirm)}
          helperText={formState.errors.confirm?.message}
        />
        <Button type="submit" variant="contained" size="large" loading={formState.isSubmitting}>
          Salvar nova senha
        </Button>
      </Stack>
    </AuthLayout>
  );
}
