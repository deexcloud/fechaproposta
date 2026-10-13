import { Suspense, lazy } from 'react';
import { BrowserRouter, Link as RouterLink, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button, CssBaseline, Stack, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '@/theme/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { isStaleBuildError, reloadForNewVersion } from '@/lib/staleBuild';
import { BrandLoader, ConfigMissingScreen } from '@/components/common';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LightScope } from '@/components/LightScope';
import { NotifyProvider } from '@/components/NotifyProvider';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { OrganizationProvider } from '@/features/organizations/OrganizationProvider';
import { RequireAuth, RequireOrganization } from '@/routes/guards';

// Cada área carrega só o código que usa: o cliente que abre a proposta não baixa o painel.
// Se o arquivo for de uma versão antiga (deploy novo no meio do uso), recarrega uma vez.
const lazyNamed = <T, K extends keyof T>(loader: () => Promise<T>, name: K) =>
  lazy(() =>
    loader().then(
      (m) => ({ default: m[name] as React.ComponentType }),
      (error: unknown) => {
        if (isStaleBuildError(error) && reloadForNewVersion()) return new Promise<never>(() => {});
        throw error;
      },
    ),
  );

window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault();
});

const loadLanding = () => import('@/features/landing/LandingPage');
// A landing é a porta de entrada: começa a baixar junto com o app, sem esperar o React montar a rota.
if (window.location.pathname === '/') loadLanding().catch(() => undefined);
const LandingPage = lazyNamed(loadLanding, 'LandingPage');
const DemoProposalPage = lazyNamed(() => import('@/features/landing/DemoProposalPage'), 'DemoProposalPage');
const SignInPage = lazyNamed(() => import('@/features/auth/pages'), 'SignInPage');
const SignUpPage = lazyNamed(() => import('@/features/auth/pages'), 'SignUpPage');
const ForgotPasswordPage = lazyNamed(() => import('@/features/auth/pages'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyNamed(() => import('@/features/auth/pages'), 'ResetPasswordPage');
const AcceptInvitePage = lazyNamed(() => import('@/features/team/AcceptInvitePage'), 'AcceptInvitePage');
const OnboardingPage = lazyNamed(() => import('@/features/onboarding/OnboardingPage'), 'OnboardingPage');
const AppLayout = lazyNamed(() => import('@/layouts/AppLayout'), 'AppLayout');
const DashboardPage = lazyNamed(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage');
const ProposalsPage = lazyNamed(() => import('@/features/proposals/ProposalsPage'), 'ProposalsPage');
const ProposalEditorPage = lazyNamed(() => import('@/features/proposals/editor/ProposalEditorPage'), 'ProposalEditorPage');
const TemplateEditorPage = lazyNamed(() => import('@/features/proposals/editor/ProposalEditorPage'), 'TemplateEditorPage');
const ProposalDetailPage = lazyNamed(() => import('@/features/proposals/ProposalDetailPage'), 'ProposalDetailPage');
const ProposalPreviewPage = lazyNamed(() => import('@/features/proposals/ProposalPreviewPage'), 'ProposalPreviewPage');
const ClientsPage = lazyNamed(() => import('@/features/clients/ClientsPage'), 'ClientsPage');
const CatalogPage = lazyNamed(() => import('@/features/catalog/CatalogPage'), 'CatalogPage');
const TemplatesPage = lazyNamed(() => import('@/features/catalog/TemplatesPage'), 'TemplatesPage');
const SettingsPage = lazyNamed(() => import('@/features/settings/SettingsPage'), 'SettingsPage');
const PublicProposalPage = lazyNamed(() => import('@/features/public/PublicProposalPage'), 'PublicProposalPage');
const PlatformAdminPage = lazyNamed(() => import('@/features/platform-admin/PlatformAdminPage'), 'PlatformAdminPage');
const CheckoutReturnPage = lazyNamed(() => import('@/features/subscription/CheckoutReturnPage'), 'CheckoutReturnPage');
const TermsPage = lazyNamed(() => import('@/features/legal/LegalPage'), 'TermsPage');
const PrivacyPage = lazyNamed(() => import('@/features/legal/LegalPage'), 'PrivacyPage');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
  },
});

function NotFoundPage() {
  const { user } = useAuth();
  return (
    <Stack spacing={2} sx={{ minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', p: 3, textAlign: 'center' }}>
      <Typography variant="h1">Página não encontrada</Typography>
      <Typography color="text.secondary">O endereço pode estar errado ou a página foi removida.</Typography>
      <Button component={RouterLink} to={user ? '/painel' : '/'} variant="contained">{user ? 'Ir para o painel' : 'Ir para o início'}</Button>
    </Stack>
  );
}

function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={<BrandLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/exemplo" element={<LightScope page><DemoProposalPage /></LightScope>} />
          <Route path="/entrar" element={<SignInPage />} />
          <Route path="/criar-conta" element={<SignUpPage />} />
          <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/convite/:token" element={<AcceptInvitePage />} />
          {/* O que o cliente final vê fica claro: é o documento com a marca de quem vende. */}
          <Route path="/p/:token" element={<LightScope page><PublicProposalPage /></LightScope>} />
          <Route path="/assinatura/retorno" element={<CheckoutReturnPage />} />
          <Route path="/termos" element={<TermsPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/painel/configurar" element={<OnboardingPage />} />
            <Route path="/admin" element={<PlatformAdminPage />} />
            <Route element={<RequireOrganization />}>
              <Route path="/painel/propostas/:id/visualizar" element={<LightScope page><ProposalPreviewPage /></LightScope>} />
              <Route path="/painel" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="propostas" element={<ProposalsPage />} />
                <Route path="propostas/nova" element={<ProposalEditorPage />} />
                <Route path="propostas/:id" element={<ProposalDetailPage />} />
                <Route path="propostas/:id/editar" element={<ProposalEditorPage />} />
                <Route path="clientes" element={<ClientsPage />} />
                <Route path="catalogo" element={<CatalogPage />} />
                <Route path="modelos" element={<TemplatesPage />} />
                <Route path="modelos/novo" element={<TemplateEditorPage />} />
                <Route path="modelos/:templateId" element={<TemplateEditorPage />} />
                <Route path="configuracoes" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!isSupabaseConfigured ? (
        <ConfigMissingScreen />
      ) : (
        <QueryClientProvider client={queryClient}>
          <NotifyProvider>
            <AuthProvider>
              <OrganizationProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </OrganizationProvider>
            </AuthProvider>
          </NotifyProvider>
        </QueryClientProvider>
      )}
    </ThemeProvider>
  );
}
