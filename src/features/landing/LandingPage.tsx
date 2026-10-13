import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, Drawer, IconButton, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import {
  ArrowRight,
  BellRing,
  BookOpen,
  Check,
  ChevronDown,
  Eye,
  FileText,
  LayoutTemplate,
  ListChecks,
  Menu as MenuIcon,
  MessageCircle,
  Palette,
  PenLine,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { BrandMark } from '@/components/common';
import { useAuth } from '@/features/auth/AuthProvider';
import { money } from '@/lib/format';
import { ANNUAL_PLAN, MONTHLY_PLAN, PLAN_FEATURES, PLANS, PRICE_FROM, PRICE_MONTHLY, planDiscountPct, planSavings, TRIAL_DAYS } from '@/lib/pricing';
import { supportUrl } from '@/lib/support';
import { BeforeAfter, MobileStickyCta, RoiCalculator } from './sections';
import { gradients, shadows, tokens } from '@/theme/tokens';

/** Margem lateral da página: cresce com a tela para o texto respirar. */
const PAGE_PX = { xs: 2.5, sm: 4, md: 5 };

const NAV = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '/exemplo', label: 'Exemplo' },
  { href: '#preco', label: 'Preço' },
  { href: '#duvidas', label: 'Dúvidas' },
];

const FAQ = [
  { q: 'Funciona no computador ou só no celular?', a: 'Nos dois. Você monta e acompanha as propostas pelo navegador do computador, do tablet ou do celular, sem instalar nada. O cliente abre o link em qualquer tela e a proposta se ajusta sozinha ao tamanho dela.' },
  { q: 'Meu cliente precisa criar conta?', a: 'Não. Ele abre o link no celular ou no computador, lê, escolhe os extras e aceita com assinatura. Sem cadastro e sem baixar nada.' },
  { q: 'Como fico sabendo que o cliente abriu?', a: 'Cada abertura do link fica registrada. No painel você vê quantas vezes foi aberta e quando, e o FechaProposta lista o que pede atenção, como quem abriu e ainda não respondeu.' },
  { q: 'O aceite tem validade?', a: 'O aceite fica registrado com nome, assinatura, data, IP e uma cópia do conteúdo aceito que não pode ser alterada. É um registro eletrônico de concordância; não é assinatura com certificado ICP-Brasil.' },
  { q: 'Posso mudar a proposta depois de enviar?', a: 'Sim, enquanto o cliente não responder. Se ele pedir um ajuste, você edita e o link continua o mesmo. Depois do aceite, a proposta trava; para uma nova versão, é só duplicar.' },
  { q: 'Como funciona o pagamento?', a: `Você testa tudo por ${TRIAL_DAYS} dias, sem cartão. Depois, ${money(PRICE_MONTHLY)} por mês, ou ${money(PRICE_FROM)} por mês no plano anual (${money(ANNUAL_PLAN.total)} à vista), por Pix ou cartão, sem fidelidade e sem renovação automática. Se a assinatura vencer, os links enviados continuam funcionando para os seus clientes.` },
  { q: 'Dá para usar com a minha equipe?', a: 'Sim. Convide pessoas por link e escolha o perfil: vendedor cria e envia propostas; gerente também cuida do catálogo e das configurações.' },
];

/**
 * Depoimentos reais de quem usa. A seção só aparece quando houver pelo menos um.
 * Use só falas verdadeiras, com autorização da pessoa. Exemplo:
 *   { quote: 'Mandei a proposta às 10h e às 11h já estava aceita.', name: 'Ana Souza', role: 'Designer, Estúdio Lume' },
 */
const TESTIMONIALS: { quote: string; name: string; role: string }[] = [];

function Section({ id, eyebrow, title, subtitle, children, muted }: { id?: string; eyebrow?: string; title: ReactNode; subtitle?: ReactNode; children: ReactNode; muted?: boolean }) {
  return (
    <Box component="section" id={id} sx={{ py: { xs: 8, md: 11 }, px: PAGE_PX, bgcolor: muted ? 'rgba(255,255,255,.015)' : 'transparent', borderTop: muted ? `1px solid ${tokens.border}` : 'none', borderBottom: muted ? `1px solid ${tokens.border}` : 'none', scrollMarginTop: 72 }}>
      <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
        <Box sx={{ maxWidth: 640, mb: { xs: 4, md: 6 } }}>
          {eyebrow && <Typography sx={{ fontSize: 14, fontWeight: 600, color: tokens.accentText }}>{eyebrow}</Typography>}
          <Typography component="h2" sx={{ fontSize: { xs: 30, md: 40 }, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em', mt: 0.75 }}>{title}</Typography>
          {subtitle && <Typography sx={{ mt: 1.5, fontSize: 17, color: tokens.textSecondary, lineHeight: 1.6 }}>{subtitle}</Typography>}
        </Box>
        {children}
      </Box>
    </Box>
  );
}

function IconTile({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ width: 36, height: 36, borderRadius: '8px', border: `1px solid ${tokens.border}`, bgcolor: tokens.surfaceElevated, backgroundImage: 'linear-gradient(180deg, rgba(139,114,255,.16), rgba(139,114,255,0))', color: tokens.accentText, display: 'grid', placeItems: 'center', '& svg': { width: 18, height: 18 } }}>
      {children}
    </Box>
  );
}

/** O produto à mostra: o painel avisando quem abriu e o celular do cliente com o botão de aceite. */
function HeroVisual() {
  const rows = [
    { initials: 'MC', title: 'Novo site · Café Aurora', status: 'Abriu 3× hoje, sem resposta', color: tokens.warning, action: 'Lembrar' },
    { initials: 'RM', title: 'Identidade visual', status: 'Pediu um ajuste no prazo', color: tokens.primary, action: 'Ver' },
    { initials: 'JP', title: 'Landing page', status: 'Vence amanhã', color: tokens.error, action: 'Lembrar' },
  ];
  // Do tablet para cima: quadro fixo de 560×540 reduzido por inteiro, com as peças sobrepostas.
  // No celular, reduzir esse quadro deixava tudo minúsculo e encavalado; lá as peças
  // ficam uma embaixo da outra, em tamanho real.
  const framed = { xs: 'static', sm: 'absolute' } as const;
  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        width: { xs: '100%', sm: 560 },
        height: { xs: 'auto', sm: 540 },
        mx: 'auto',
        flexShrink: 0,
        display: { xs: 'flex', sm: 'block' },
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        '@media (min-width: 600px)': { zoom: 0.92 },
        '@media (min-width: 1200px)': { zoom: 0.94 },
      }}
    >
      {/* Painel de quem vende */}
      <Card sx={{ position: framed, left: 0, top: 120, width: { xs: '100%', sm: 318 }, maxWidth: 360, boxSizing: 'border-box', p: 2.25, zIndex: 3, boxShadow: shadows.lg }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Precisa da sua atenção</Typography>
        <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>O que fazer agora para fechar mais</Typography>
        {rows.map((r) => (
          <Stack key={r.title} direction="row" spacing={1.25} sx={{ alignItems: 'center', pt: 1.25, mt: 1.25, borderTop: `1px solid ${tokens.border}` }}>
            <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: tokens.muted, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{r.initials}</Box>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 13, fontWeight: 650 }}>{r.title}</Typography>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: r.color }} />
                <Typography noWrap sx={{ fontSize: 11.5, color: tokens.textSecondary }}>{r.status}</Typography>
              </Stack>
            </Box>
            <Box sx={{ fontSize: 11.5, fontWeight: 650, px: 1, py: 0.5, borderRadius: '6px', border: `1px solid ${tokens.border}` }}>{r.action}</Box>
          </Stack>
        ))}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1.75 }}>
          {[['Em aberto', 'R$ 10.550'], ['Fechado no mês', 'R$ 6.100']].map(([l, v]) => (
            <Box key={l} sx={{ p: 1.25, borderRadius: '8px', border: `1px solid ${tokens.border}`, bgcolor: tokens.subtle }}>
              <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>{l}</Typography>
              <Typography sx={{ fontWeight: 750, fontSize: 18, letterSpacing: '-0.03em' }}>{v}</Typography>
            </Box>
          ))}
        </Box>
      </Card>

      {/* Celular do cliente */}
      <Box sx={{ position: framed, right: 0, top: 0, width: 262, height: 530, flexShrink: 0, borderRadius: '40px', bgcolor: '#000', border: '1px solid rgba(255,255,255,.12)', p: 1.25, zIndex: 2, boxShadow: '0 40px 90px -30px rgba(0,0,0,.9), 0 0 80px -20px rgba(109,76,245,.45)' }}>
        <Box className="fp-light" sx={{ bgcolor: '#fff', color: tokens.textPrimary, borderRadius: '31px', height: '100%', overflow: 'hidden', position: 'relative' }}>
          <Box sx={{ px: 2.25, pt: 3.5, pb: 2, borderTop: `4px solid ${tokens.primary}`, background: `linear-gradient(180deg, ${tokens.accentSoft}, #fff 80%)` }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 24, height: 24, borderRadius: '7px', bgcolor: tokens.primary, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>E</Box>
              <Typography sx={{ fontSize: 12, fontWeight: 650 }}>Estúdio Lume</Typography>
            </Stack>
            <Typography sx={{ fontSize: 11, color: tokens.textSecondary, mt: 2.5 }}>Olá, Marina. Preparamos esta proposta para você.</Typography>
            <Typography sx={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em', mt: 0.5 }}>Novo site para o Café Aurora</Typography>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1.75, p: 1, borderRadius: '8px', border: `1px solid ${tokens.border}`, bgcolor: '#fff' }}>
              <Box><Typography sx={{ fontSize: 9.5, color: tokens.textSecondary }}>Investimento</Typography><Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>R$ 4.850</Typography></Box>
              <Box><Typography sx={{ fontSize: 9.5, color: tokens.textSecondary }}>Prazo</Typography><Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>5 semanas</Typography></Box>
            </Stack>
          </Box>
          <Stack spacing={0.75} sx={{ px: 2.25 }}>
            {['Layout e aprovação', 'Site rápido no celular', 'Botão de WhatsApp'].map((t) => (
              <Stack key={t} direction="row" spacing={0.75} sx={{ alignItems: 'center', p: 0.85, borderRadius: '7px', border: `1px solid ${tokens.border}` }}>
                <Check size={12} color={tokens.primary} strokeWidth={3} />
                <Typography sx={{ fontSize: 11 }}>{t}</Typography>
              </Stack>
            ))}
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', p: 1, borderRadius: '9px', border: `1.5px solid ${tokens.primary}`, bgcolor: tokens.accentSoft, mt: 0.5 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: tokens.primary, color: '#fff', display: 'grid', placeItems: 'center' }}><Check size={9} strokeWidth={4} /></Box>
                <Typography sx={{ fontSize: 11, fontWeight: 650 }}>Cardápio editável</Typography>
              </Stack>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: tokens.primary }}>+ R$ 900</Typography>
            </Stack>
          </Stack>
          <Stack direction="row" sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, px: 2, py: 1.5, borderTop: `1px solid ${tokens.border}`, bgcolor: '#fff', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ fontSize: 9.5, color: tokens.textSecondary }}>Total com 1 extra</Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 750 }}>R$ 5.750,00</Typography>
            </Box>
            <Box sx={{ px: 2, py: 1, borderRadius: '8px', bgcolor: tokens.primary, color: '#fff', fontWeight: 650, fontSize: 12.5 }}>Aceitar</Box>
          </Stack>
        </Box>
      </Box>

      {/* Aviso de aceite */}
      <Card sx={{ position: 'absolute', left: 60, top: 476, px: 1.75, py: 1.25, zIndex: 4, display: { xs: 'none', sm: 'flex' }, gap: 1.25, alignItems: 'center', boxShadow: shadows.lg }} className="fp-fade-up">
        <Box sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: tokens.successSoft, color: tokens.success, display: 'grid', placeItems: 'center' }}><Check size={16} strokeWidth={3} /></Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Marina aceitou</Typography>
          <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>agora · R$ 5.750</Typography>
        </Box>
      </Card>
    </Box>
  );
}

export function LandingPage() {
  // Logado continua vendo a página de vendas; os botões levam ao painel.
  const { user } = useAuth();
  const startTo = user ? '/painel' : '/criar-conta';
  const ctaLabel = user ? 'Abrir painel' : 'Criar minha primeira proposta';
  const [menuOpen, setMenuOpen] = useState(false);
  // O anual aparece primeiro: ancora no preço cheio riscado e mostra a economia.
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const shownPlan = billing === 'annual' ? ANNUAL_PLAN : MONTHLY_PLAN;
  const help = supportUrl();

  useEffect(() => {
    document.title = 'FechaProposta — propostas que o cliente aprova no computador ou no celular';
  }, []);

  const navLink = (n: (typeof NAV)[number], onClick?: () => void) =>
    n.href.startsWith('/') ? (
      <Typography key={n.href} component={RouterLink} to={n.href} onClick={onClick} variant="body2" sx={{ textDecoration: 'none', color: tokens.textSecondary, fontWeight: 500, '&:hover': { color: tokens.textPrimary } }}>{n.label}</Typography>
    ) : (
      <Typography key={n.href} component="a" href={n.href} onClick={onClick} variant="body2" sx={{ textDecoration: 'none', color: tokens.textSecondary, fontWeight: 500, '&:hover': { color: tokens.textPrimary } }}>{n.label}</Typography>
    );

  return (
    <Box sx={{ overflowX: 'clip' }}>
      {/* Topo */}
      <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 20, bgcolor: tokens.glass, backdropFilter: 'blur(14px)', borderBottom: `1px solid ${tokens.border}` }}>
        <Stack direction="row" sx={{ maxWidth: 1120, mx: 'auto', px: PAGE_PX, height: 64, alignItems: 'center', justifyContent: 'space-between' }}>
          <RouterLink to="/" aria-label="FechaProposta, início"><BrandMark /></RouterLink>
          <Stack component="nav" direction="row" spacing={3.5} sx={{ display: { xs: 'none', md: 'flex' } }} aria-label="Seções">
            {NAV.map((n) => navLink(n))}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {!user && <Button component={RouterLink} to="/entrar" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Entrar</Button>}
            <Button component={RouterLink} to={startTo} variant="contained" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>{user ? 'Abrir painel' : 'Testar grátis'}</Button>
            <IconButton aria-label="Abrir menu" onClick={() => setMenuOpen(true)} sx={{ display: { md: 'none' } }}><MenuIcon size={20} /></IconButton>
          </Stack>
        </Stack>
      </Box>
      <Drawer anchor="top" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <Stack spacing={2} sx={{ p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <BrandMark />
            <IconButton aria-label="Fechar menu" onClick={() => setMenuOpen(false)}><X size={20} /></IconButton>
          </Stack>
          {NAV.map((n) => navLink(n, () => setMenuOpen(false)))}
          {!user && <Button component={RouterLink} to="/entrar" variant="outlined">Entrar</Button>}
          <Button component={RouterLink} to={startTo} variant="contained" endIcon={<ArrowRight />}>{ctaLabel}</Button>
        </Stack>
      </Drawer>

      <main>
        {/* Abertura */}
        <Box component="section" sx={{ px: PAGE_PX, pt: { xs: 6, md: 9 }, pb: { xs: 6, md: 10 }, background: 'radial-gradient(700px 420px at 75% 30%, rgba(109,76,245,.22), transparent 70%), radial-gradient(600px 360px at 10% 0%, rgba(79,70,229,.14), transparent 70%)' }}>
          {/* Lado a lado só em tela grande; abaixo disso, texto primeiro e a ilustração centralizada. */}
          <Box sx={{ maxWidth: 1120, mx: 'auto', display: 'grid', gap: { xs: 5, lg: 6 }, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 530px' }, alignItems: 'center' }}>
            <Box className="fp-fade-up" sx={{ maxWidth: { xs: 640, lg: 'none' }, mx: { xs: 'auto', lg: 0 }, width: '100%' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderRadius: '999px', border: `1px solid ${tokens.border}`, bgcolor: tokens.accentSoft, fontSize: 13, fontWeight: 600, color: tokens.textSecondary }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: tokens.success }} />
                Saiba na hora quando o cliente abrir
              </Box>
              <Typography component="h1" sx={{ fontSize: { xs: 40, sm: 54, lg: 62 }, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.05em', mt: 2.5, textWrap: 'balance' }}>
                Propostas que o cliente <Box component="span" sx={{ background: gradients.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>aprova até pelo celular.</Box>
              </Typography>
              <Typography sx={{ mt: 2.5, fontSize: { xs: 17, md: 19 }, color: tokens.textSecondary, maxWidth: 540, lineHeight: 1.6, textWrap: 'pretty' }}>
                Monte em minutos com a sua marca, envie pelo WhatsApp e saiba quando o cliente abrir. Ele escolhe os extras e aceita com assinatura, sem criar conta, no computador ou no celular.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
                <Button component={RouterLink} to={startTo} variant="contained" size="large" endIcon={<ArrowRight />} sx={{ minHeight: 52, px: 3, fontSize: 16 }}>{ctaLabel}</Button>
                <Button component={RouterLink} to="/exemplo" variant="outlined" size="large" sx={{ minHeight: 52, px: 3, fontSize: 16 }}>Ver exemplo</Button>
              </Stack>
              {!user && (
                // Celular: uma garantia por linha, alinhadas. Tablet para cima: em linha, sem quebrar no meio.
                <Box
                  component="ul"
                  sx={{ listStyle: 'none', p: 0, m: 0, mt: 2.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 3 } }}
                >
                  {[`${TRIAL_DAYS} dias grátis`, 'Sem cartão de crédito', 'Pronto em 3 minutos'].map((t) => (
                    <Stack component="li" key={t} direction="row" spacing={1} sx={{ alignItems: 'center', whiteSpace: 'nowrap' }}>
                      <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: tokens.successSoft, color: tokens.success, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Check size={11} strokeWidth={3.5} />
                      </Box>
                      <Typography sx={{ fontSize: 14.5, color: tokens.textSecondary }}>{t}</Typography>
                    </Stack>
                  ))}
                </Box>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 4, pt: 2.5, borderTop: `1px solid ${tokens.border}` }}>
                Feito para <b style={{ color: tokens.textPrimary }}>agências</b>, <b style={{ color: tokens.textPrimary }}>freelancers</b>, <b style={{ color: tokens.textPrimary }}>consultorias</b> e <b style={{ color: tokens.textPrimary }}>prestadores de serviço</b>.
              </Typography>
            </Box>
            <HeroVisual />
          </Box>
        </Box>

        {/* Benefícios rápidos */}
        <Box sx={{ borderTop: `1px solid ${tokens.border}`, borderBottom: `1px solid ${tokens.border}`, bgcolor: 'rgba(255,255,255,.015)', px: PAGE_PX, py: 3.5 }}>
          <Box sx={{ maxWidth: 1120, mx: 'auto', display: 'grid', gap: { xs: 2.5, md: 3 }, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
            {[
              [<Eye key="e" />, 'Aviso de abertura', 'Quantas vezes e quando'],
              [<ListChecks key="l" />, 'Extras opcionais', 'O cliente aumenta o pedido'],
              [<PenLine key="p" />, 'Assinatura online', 'Aceite com comprovante'],
              [<MessageCircle key="m" />, 'Lembrete no WhatsApp', 'Mensagem pronta'],
            ].map(([icon, title, text]) => (
              <Stack key={title as string} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <IconTile>{icon}</IconTile>
                <Box>
                  <Typography sx={{ fontWeight: 650, fontSize: 14 }}>{title}</Typography>
                  <Typography variant="caption" color="text.secondary">{text}</Typography>
                </Box>
              </Stack>
            ))}
          </Box>
        </Box>

        <Section eyebrow="Por que trocar" title="Pare de mandar PDF e torcer." subtitle="A proposta é o momento em que o cliente decide. Ela precisa explicar o valor, tirar as dúvidas e deixar o sim a um toque.">
          <BeforeAfter />
        </Section>

        <Section id="como-funciona" muted eyebrow="Como funciona" title="Do rascunho ao aceite em 3 passos.">
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            {[
              { n: '1', icon: <FileText />, title: 'Monte em minutos', text: 'Comece de um modelo, puxe os itens do catálogo e veja ao lado exatamente o que o cliente vai receber.' },
              { n: '2', icon: <Send />, title: 'Envie pelo WhatsApp', text: 'Um link com a sua marca e uma mensagem pronta. Abre no computador ou no celular, sem PDF pesado e sem cadastro.' },
              { n: '3', icon: <PenLine />, title: 'Receba o sim', text: 'Veja quem abriu, responda pedidos de ajuste e lembre no momento certo. O aceite chega com assinatura.' },
            ].map((s) => (
              <Card key={s.n} sx={{ p: 3 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <IconTile>{s.icon}</IconTile>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: tokens.textTertiary }}>Passo {s.n}</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 700, fontSize: 18, mt: 2.5, letterSpacing: '-0.02em' }}>{s.title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>{s.text}</Typography>
              </Card>
            ))}
          </Box>
          <Button component={RouterLink} to="/exemplo" variant="outlined" endIcon={<ArrowRight />} sx={{ mt: 4 }}>Abrir a proposta de exemplo</Button>
        </Section>

        <Section eyebrow="Tudo num lugar" title="Feito para quem vende serviço.">
          <Box sx={{ display: 'grid', gap: { xs: 3, md: 4 }, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
            {[
              [<BellRing key="b" />, 'O que pede atenção', 'Quem abriu e não respondeu, quem pediu ajuste e o que vence logo, com o lembrete pronto.'],
              [<BookOpen key="c" />, 'Catálogo de serviços', 'Seus serviços com preço padrão. Na proposta, é só escolher.'],
              [<LayoutTemplate key="t" />, 'Modelos', 'Transforme uma proposta que deu certo em ponto de partida para as próximas.'],
              [<Palette key="p" />, 'Sua marca', 'Logo e cor da sua empresa em cada proposta. O cliente vê você, não a gente.'],
              [<Users key="u" />, 'Equipe', 'Convide vendedores por link, cada um com o acesso certo.'],
              [<FileText key="f" />, 'PDF e histórico', 'Baixe em PDF e veja a linha do tempo e o comprovante de cada aceite.'],
            ].map(([icon, title, text]) => (
              <Box key={title as string}>
                <IconTile>{icon}</IconTile>
                <Typography sx={{ fontWeight: 650, fontSize: 16, mt: 1.5 }}>{title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{text}</Typography>
              </Box>
            ))}
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 5, alignItems: { sm: 'center' } }}>
            <Button component={RouterLink} to={startTo} variant="contained" size="large" endIcon={<ArrowRight />}>{ctaLabel}</Button>
            {!user && <Typography variant="body2" color="text.secondary">{TRIAL_DAYS} dias grátis, sem cartão e sem renovação automática.</Typography>}
          </Stack>
        </Section>

        {TESTIMONIALS.length === 0 && (
          <Box sx={{ px: PAGE_PX, pb: { xs: 8, md: 11 } }}>
            <Box sx={{ maxWidth: 1120, mx: 'auto', p: { xs: 2.5, sm: 3 }, borderRadius: '14px', border: `1px solid ${tokens.border}`, bgcolor: tokens.surface, display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
              {[
                ['Comprovante de aceite', 'Nome, assinatura, data, IP e cópia do que foi aceito.'],
                ['Dados isolados', 'Cada empresa vê só o que é dela.'],
                ['Sem fidelidade', 'Sem renovação automática nem multa.'],
                ['Suporte humano', 'Dúvida? Fale com a gente pelo WhatsApp.'],
              ].map(([title, text]) => (
                <Stack key={title} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                  <Box sx={{ color: tokens.accentText, mt: 0.25, display: 'flex' }}><ShieldCheck size={18} /></Box>
                  <Box>
                    <Typography sx={{ fontWeight: 650, fontSize: 14 }}>{title}</Typography>
                    <Typography variant="caption" color="text.secondary">{text}</Typography>
                  </Box>
                </Stack>
              ))}
            </Box>
          </Box>
        )}

        {TESTIMONIALS.length > 0 && (
          <Section eyebrow="Quem já usa" title="Menos proposta parada, mais sim.">
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(TESTIMONIALS.length, 3)}, 1fr)` } }}>
              {TESTIMONIALS.map((t) => (
                <Card key={t.name} component="figure" sx={{ m: 0, p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Typography component="blockquote" sx={{ m: 0, fontSize: 16, lineHeight: 1.6, flexGrow: 1 }}>“{t.quote}”</Typography>
                  <Stack component="figcaption" direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: tokens.accentSoft, color: tokens.accentText, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>
                      {t.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 650, fontSize: 14 }}>{t.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.role}</Typography>
                    </Box>
                  </Stack>
                </Card>
              ))}
            </Box>
          </Section>
        )}

        <Section muted eyebrow="Vale a pena?" title="Uma proposta a mais por mês já paga tudo." subtitle="Mexa nos valores e veja com os seus números.">
          <RoiCalculator startTo={startTo} ctaLabel={user ? 'Abrir painel' : `Testar ${TRIAL_DAYS} dias grátis`} />
        </Section>

        <Section id="preco" eyebrow="Preço" title="Tudo incluído. Você escolhe o período." subtitle="Sem limite de propostas e sem taxa por proposta aceita.">
          <Box sx={{ display: 'grid', gap: { xs: 3, md: 6 }, gridTemplateColumns: { xs: '1fr', md: '460px 1fr' }, alignItems: 'center' }}>
            <Card sx={{ p: { xs: 3, sm: 4 }, boxShadow: `${shadows.lg}, ${shadows.glow}`, border: '1px solid transparent', background: `linear-gradient(${tokens.surfaceElevated}, ${tokens.surfaceElevated}) padding-box, ${gradients.border} border-box` }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 650 }}>FechaProposta</Typography>
                <Box sx={{ fontSize: 12, fontWeight: 600, px: 1, py: 0.25, borderRadius: '6px', bgcolor: tokens.accentSoft, color: tokens.accentText }}>{TRIAL_DAYS} dias grátis</Box>
              </Stack>
              <ToggleButtonGroup exclusive fullWidth size="small" value={billing} onChange={(_, v) => v && setBilling(v)} aria-label="Período" sx={{ mt: 2.5 }}>
                <ToggleButton value="monthly" sx={{ textTransform: 'none', fontWeight: 600 }}>Mensal</ToggleButton>
                <ToggleButton value="annual" sx={{ textTransform: 'none', fontWeight: 600, gap: 0.75 }}>
                  Anual
                  <Box component="span" sx={{ fontSize: 11.5, fontWeight: 700, color: tokens.successText }}>-{planDiscountPct(ANNUAL_PLAN)}%</Box>
                </ToggleButton>
              </ToggleButtonGroup>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mt: 2 }}>
                {billing === 'annual' && (
                  <Typography sx={{ fontSize: 22, fontWeight: 600, color: tokens.textSecondary, textDecoration: 'line-through' }}>{money(PRICE_MONTHLY).replace(',00', '')}</Typography>
                )}
                <Typography sx={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.05em' }}>{money(shownPlan.perMonth).replace(',00', '')}</Typography>
                <Typography color="text.secondary">/ mês</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {billing === 'annual'
                  ? `${money(ANNUAL_PLAN.total).replace(',00', '')} por ano. Você economiza ${money(planSavings(ANNUAL_PLAN)).replace(',00', '')}.`
                  : `Menos de ${money(Math.ceil(PRICE_MONTHLY / 30)).replace(',00', '')} por dia. Também tem semestral a ${money(PLANS[1].perMonth).replace(',00', '')}/mês.`}{' '}
                Pix ou cartão.
              </Typography>
              <Stack spacing={1.25} sx={{ my: 3 }}>
                {PLAN_FEATURES.map((f) => (
                  <Stack key={f} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                    <Check size={16} color={tokens.accentText} strokeWidth={3} />
                    <Typography variant="body2">{f}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Button component={RouterLink} to={startTo} variant="contained" size="large" fullWidth endIcon={<ArrowRight />}>
                {user ? 'Abrir painel' : `Começar teste de ${TRIAL_DAYS} dias`}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>Sem cartão de crédito para testar.</Typography>
            </Card>
            <Stack spacing={2.5}>
              {[
                ['Sem fidelidade e sem renovação automática', 'Você paga o período que escolher. Nada é cobrado de novo sem você pedir.'],
                ['Pagar no teste não perde dias', 'Se assinar antes do fim do teste, os dias restantes continuam valendo.'],
                ['Seus links não quebram', 'Mesmo se a assinatura vencer, os clientes continuam abrindo e aceitando o que você já enviou.'],
                ['Seus dados são seus', 'Cada empresa fica isolada no banco. Propostas aceitas guardam o comprovante.'],
              ].map(([title, text]) => (
                <Stack key={title} direction="row" spacing={1.5}>
                  <IconTile><Check /></IconTile>
                  <Box>
                    <Typography sx={{ fontWeight: 650 }}>{title}</Typography>
                    <Typography variant="body2" color="text.secondary">{text}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Section>

        <Section id="duvidas" muted eyebrow="Dúvidas" title="Bom saber antes de começar.">
          <Card sx={{ maxWidth: 760, px: { xs: 2, sm: 3 } }}>
            {FAQ.map((f, i) => (
              <Accordion key={f.q} disableGutters elevation={0} sx={{ borderTop: i ? `1px solid ${tokens.border}` : 'none' }}>
                <AccordionSummary expandIcon={<ChevronDown size={18} />} sx={{ px: 0, '& .MuiAccordionSummary-content': { my: 2 } }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 15.5 }}>{f.q}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
                  <Typography color="text.secondary">{f.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Card>
          {help && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3, maxWidth: 760, alignItems: { sm: 'center' } }}>
              <Typography color="text.secondary">Ficou com alguma dúvida?</Typography>
              <Button component="a" href={help} target="_blank" rel="noopener" variant="outlined" startIcon={<MessageCircle size={18} />} sx={{ alignSelf: 'flex-start' }}>
                Fale com a gente no WhatsApp
              </Button>
            </Stack>
          )}
        </Section>

        <Box component="section" sx={{ px: PAGE_PX, py: { xs: 8, md: 11 } }}>
          <Box sx={{ maxWidth: 1120, mx: 'auto', borderRadius: '20px', background: gradients.panel, border: '1px solid rgba(164,140,255,.25)', boxShadow: shadows.glow, color: '#fff', p: { xs: 4, md: 7 }, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, alignItems: 'center' }}>
            <Box>
              <Typography component="h2" sx={{ fontSize: { xs: 30, md: 40 }, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.045em' }}>
                A próxima proposta pode ser a que fecha.
              </Typography>
              <Typography sx={{ mt: 1.5, color: tokens.textSecondary, fontSize: 17 }}>Crie a primeira em 3 minutos. {TRIAL_DAYS} dias grátis, sem cartão.</Typography>
            </Box>
            <Button component={RouterLink} to={startTo} size="large" variant="contained" endIcon={<ArrowRight />} sx={{ backgroundImage: 'none', bgcolor: '#fff', color: '#09090B', minHeight: 52, px: 3, '&:hover': { backgroundImage: 'none', bgcolor: '#ECEAF4' } }}>
              {ctaLabel}
            </Button>
          </Box>
        </Box>
      </main>
      <MobileStickyCta startTo={startTo} ctaLabel={user ? 'Abrir painel' : `Testar ${TRIAL_DAYS} dias grátis`} hint={user ? undefined : 'Sem cartão · sem renovação automática'} />

      <Box component="footer" sx={{ borderTop: `1px solid ${tokens.border}`, px: PAGE_PX, py: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ maxWidth: 1120, mx: 'auto', justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <BrandMark size="small" />
          <Stack direction="row" spacing={2.5}>
            {help && (
              <Typography component="a" href={help} target="_blank" rel="noopener" variant="body2" color="text.secondary" sx={{ textDecoration: 'none' }}>Suporte</Typography>
            )}
            <Typography component={RouterLink} to="/termos" variant="body2" color="text.secondary" sx={{ textDecoration: 'none' }}>Termos de uso</Typography>
            <Typography component={RouterLink} to="/privacidade" variant="body2" color="text.secondary" sx={{ textDecoration: 'none' }}>Privacidade</Typography>
            <Typography component={RouterLink} to={user ? '/painel' : '/entrar'} variant="body2" color="text.secondary" sx={{ textDecoration: 'none' }}>{user ? 'Abrir painel' : 'Entrar'}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">© {new Date().getFullYear()} FechaProposta</Typography>
        </Stack>
      </Box>
    </Box>
  );
}
