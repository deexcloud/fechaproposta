import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, Drawer, IconButton, Stack, Typography } from '@mui/material';
import {
  ArrowRight,
  BadgeCheck,
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
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import { BrandMark } from '@/components/common';
import { ProposalDocument } from '@/components/ProposalDocument';
import { useAuth } from '@/features/auth/AuthProvider';
import { money } from '@/lib/format';
import { PLAN_FEATURES, PRICE_MONTHLY, TRIAL_DAYS } from '@/lib/pricing';
import { demoProposal } from './demo';
import { displayFont, shadows, tokens } from '@/theme/tokens';

const NAV = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#cliente', label: 'Para o seu cliente' },
  { href: '#preco', label: 'Preço' },
  { href: '#duvidas', label: 'Dúvidas' },
];

const FAQ = [
  { q: 'Meu cliente precisa criar conta?', a: 'Não. Ele abre o link no celular ou no computador, lê, escolhe os opcionais e aceita com assinatura. Sem cadastro e sem baixar nada.' },
  { q: 'Como fico sabendo que o cliente abriu?', a: 'Cada abertura do link fica registrada. No painel você vê quantas vezes foi aberta e quando, e o FechaProposta lista o que pede atenção, como quem abriu e ainda não respondeu.' },
  { q: 'O aceite tem validade?', a: 'O aceite fica registrado com nome, assinatura, data, IP e uma cópia do conteúdo aceito que não pode ser alterada. É um registro eletrônico de concordância; não é assinatura com certificado ICP-Brasil.' },
  { q: 'Posso mudar a proposta depois de enviar?', a: 'Sim, enquanto o cliente não responder. Se ele pedir um ajuste, você edita e o link continua o mesmo. Depois do aceite, a proposta trava; para uma nova versão, é só duplicar.' },
  { q: 'Como funciona o pagamento?', a: `Você testa tudo por ${TRIAL_DAYS} dias, sem cartão. Depois, ${money(PRICE_MONTHLY)} por mês por Pix ou cartão, sem fidelidade. Se a assinatura vencer, os links enviados continuam funcionando para os seus clientes.` },
  { q: 'Dá para usar com a minha equipe?', a: 'Sim. Convide pessoas por link e escolha o perfil: vendedor cria e envia propostas; gerente também cuida do catálogo e das configurações.' },
];

function Section({ id, eyebrow, title, subtitle, children, dark }: { id?: string; eyebrow?: string; title: ReactNode; subtitle?: ReactNode; children: ReactNode; dark?: boolean }) {
  return (
    <Box component="section" id={id} sx={{ py: { xs: 8, md: 12 }, px: 2, bgcolor: dark ? tokens.ink : 'transparent', color: dark ? '#fff' : 'inherit', scrollMarginTop: 72 }}>
      <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
        <Box sx={{ maxWidth: 680, mb: { xs: 5, md: 7 } }}>
          {eyebrow && <Typography variant="overline" sx={{ color: dark ? tokens.lime : tokens.limeText }}>{eyebrow}</Typography>}
          <Typography component="h2" sx={{ fontFamily: displayFont, fontSize: { xs: 38, md: 52 }, lineHeight: 1.05, letterSpacing: '-0.01em', mt: 0.5 }}>{title}</Typography>
          {subtitle && <Typography sx={{ mt: 2, fontSize: 17, color: dark ? 'rgba(255,255,255,.7)' : tokens.textSecondary }}>{subtitle}</Typography>}
        </Box>
        {children}
      </Box>
    </Box>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Box>
      <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: tokens.limeSoft, color: tokens.limeText, display: 'grid', placeItems: 'center', mb: 1.5, '& svg': { width: 20, height: 20 } }}>{icon}</Box>
      <Typography sx={{ fontWeight: 650, fontSize: 16 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{text}</Typography>
    </Box>
  );
}

/** Celular com a proposta de exemplo e o aviso de abertura por cima. */
function HeroVisual() {
  const data = useMemo(demoProposal, []);
  return (
    <Box sx={{ position: 'relative', mx: 'auto', width: { xs: 300, sm: 340 } }} aria-hidden>
      <Box sx={{ borderRadius: '42px', p: 1.25, bgcolor: tokens.ink, boxShadow: '0 40px 80px -30px rgba(20,26,22,.45)' }}>
        <Box sx={{ borderRadius: '32px', overflow: 'hidden', height: { xs: 560, sm: 620 }, bgcolor: '#fff', position: 'relative' }}>
          <Box sx={{ transform: 'scale(.54)', transformOrigin: 'top left', width: '185%', pointerEvents: 'none' }}>
            <ProposalDocument data={data} />
          </Box>
          <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: 1.5, bgcolor: '#fff', borderTop: `1px solid ${tokens.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: 10, color: tokens.textTertiary }}>Total</Typography>
              <Typography sx={{ fontWeight: 750, fontSize: 16 }}>R$ 4.850,00</Typography>
            </Box>
            <Box sx={{ px: 2, py: 1, borderRadius: '10px', bgcolor: '#1F4E3D', color: '#fff', fontWeight: 650, fontSize: 13 }}>Aceitar</Box>
          </Box>
        </Box>
      </Box>
      <Card className="fp-fade-up" sx={{ position: 'absolute', left: { xs: -12, sm: -64 }, top: 90, p: 1.5, display: 'flex', gap: 1.25, alignItems: 'center', boxShadow: shadows.lg, animationDelay: '.4s' }}>
        <Box sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: tokens.warningSoft, color: tokens.warning, display: 'grid', placeItems: 'center' }}><Eye size={16} /></Box>
        <Box>
          <Typography sx={{ fontWeight: 650, fontSize: 13 }}>Marina abriu sua proposta</Typography>
          <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>agora · 2ª vez</Typography>
        </Box>
      </Card>
      <Card className="fp-fade-up" sx={{ position: 'absolute', right: { xs: -12, sm: -56 }, bottom: 120, p: 1.5, display: 'flex', gap: 1.25, alignItems: 'center', boxShadow: shadows.lg, animationDelay: '.9s' }}>
        <Box sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: tokens.successSoft, color: tokens.success, display: 'grid', placeItems: 'center' }}><BadgeCheck size={16} /></Box>
        <Box>
          <Typography sx={{ fontWeight: 650, fontSize: 13 }}>Proposta aceita</Typography>
          <Typography sx={{ fontSize: 11.5, color: tokens.textSecondary }}>+ opcional de cardápio</Typography>
        </Box>
      </Card>
    </Box>
  );
}

export function LandingPage() {
  // Logado continua vendo a página de vendas; os botões levam ao painel.
  const { user } = useAuth();
  const startTo = user ? '/painel' : '/criar-conta';
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = 'FechaProposta — propostas que viram sim';
  }, []);

  const cta = (size: 'medium' | 'large' = 'large') => (
    <Button component={RouterLink} to={startTo} variant="contained" size={size} endIcon={<ArrowRight />}>
      {user ? 'Abrir painel' : `Testar ${TRIAL_DAYS} dias grátis`}
    </Button>
  );

  return (
    <Box sx={{ overflowX: 'clip' }}>
      {/* Topo */}
      <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 20, bgcolor: 'rgba(246,246,242,.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${tokens.border}` }}>
        <Stack direction="row" sx={{ maxWidth: 1120, mx: 'auto', px: 2, height: 64, alignItems: 'center', justifyContent: 'space-between' }}>
          <RouterLink to="/" aria-label="FechaProposta, início"><BrandMark /></RouterLink>
          <Stack component="nav" direction="row" spacing={3} sx={{ display: { xs: 'none', md: 'flex' } }} aria-label="Seções">
            {NAV.map((n) => (
              <Typography key={n.href} component="a" href={n.href} variant="body2" sx={{ textDecoration: 'none', color: tokens.textSecondary, fontWeight: 550, '&:hover': { color: tokens.textPrimary } }}>{n.label}</Typography>
            ))}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {!user && <Button component={RouterLink} to="/entrar" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Entrar</Button>}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>{cta('medium')}</Box>
            <IconButton aria-label="Abrir menu" onClick={() => setMenuOpen(true)} sx={{ display: { md: 'none' } }}><MenuIcon size={20} /></IconButton>
          </Stack>
        </Stack>
      </Box>
      <Drawer anchor="top" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <Stack spacing={1} sx={{ p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <BrandMark />
            <IconButton aria-label="Fechar menu" onClick={() => setMenuOpen(false)}><X size={20} /></IconButton>
          </Stack>
          {NAV.map((n) => (
            <Button key={n.href} href={n.href} color="inherit" onClick={() => setMenuOpen(false)} sx={{ justifyContent: 'flex-start' }}>{n.label}</Button>
          ))}
          {!user && <Button component={RouterLink} to="/entrar" variant="outlined">Entrar</Button>}
          {cta()}
        </Stack>
      </Drawer>

      <main>
        {/* Abertura */}
        <Box component="section" sx={{ px: 2, pt: { xs: 6, md: 10 }, pb: { xs: 8, md: 12 } }}>
          <Box sx={{ maxWidth: 1120, mx: 'auto', display: 'grid', gap: { xs: 8, md: 6 }, gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, alignItems: 'center' }}>
            <Box className="fp-fade-up">
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, borderRadius: '999px', bgcolor: tokens.limeSoft, color: tokens.limeText, fontSize: 13, fontWeight: 650 }}>
                <BellRing size={14} /> Saiba na hora quando o cliente abrir
              </Box>
              <Typography component="h1" sx={{ fontFamily: displayFont, fontSize: { xs: 52, sm: 68, md: 80 }, lineHeight: 0.98, letterSpacing: '-0.02em', mt: 2.5 }}>
                Seu trabalho merece um <Box component="em" sx={{ color: tokens.limeText }}>sim.</Box>
              </Typography>
              <Typography sx={{ mt: 3, fontSize: { xs: 17, md: 19 }, color: tokens.textSecondary, maxWidth: 540, lineHeight: 1.55 }}>
                Monte propostas bonitas com a sua marca em minutos, envie pelo WhatsApp e acompanhe cada passo. Seu cliente escolhe os opcionais e aceita com assinatura, direto do celular.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
                {cta()}
                <Button component={RouterLink} to="/exemplo" variant="outlined" size="large" startIcon={<Smartphone />}>Ver proposta de exemplo</Button>
              </Stack>
              <Stack direction="row" spacing={2.5} sx={{ mt: 3, flexWrap: 'wrap', rowGap: 1 }}>
                {['Sem cartão para testar', 'Cliente não precisa de conta', 'Cancele quando quiser'].map((t) => (
                  <Stack key={t} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Check size={15} color={tokens.success} strokeWidth={3} />
                    <Typography variant="body2" color="text.secondary">{t}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
            <HeroVisual />
          </Box>
        </Box>

        {/* Faixa de benefícios */}
        <Box sx={{ borderTop: `1px solid ${tokens.border}`, borderBottom: `1px solid ${tokens.border}`, bgcolor: '#fff', px: 2, py: 4 }}>
          <Box sx={{ maxWidth: 1120, mx: 'auto', display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
            {[
              [<Eye key="e" />, 'Aviso de abertura', 'Quantas vezes e quando'],
              [<ListChecks key="l" />, 'Opcionais', 'O cliente aumenta o próprio pedido'],
              [<PenLine key="p" />, 'Assinatura online', 'Aceite com comprovante'],
              [<MessageCircle key="m" />, 'Lembrete no WhatsApp', 'Mensagem pronta, sem constrangimento'],
            ].map(([icon, title, text]) => (
              <Stack key={title as string} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ color: tokens.limeText, display: 'flex', '& svg': { width: 22, height: 22 } }}>{icon}</Box>
                <Box>
                  <Typography sx={{ fontWeight: 650, fontSize: 14.5 }}>{title}</Typography>
                  <Typography variant="caption" color="text.secondary">{text}</Typography>
                </Box>
              </Stack>
            ))}
          </Box>
        </Box>

        <Section id="como-funciona" eyebrow="Como funciona" title="Do rascunho ao aceite, sem idas e vindas." subtitle="Você conduz a conversa. O FechaProposta deixa cada etapa visível e diz o que fazer em seguida.">
          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            {[
              { n: '01', icon: <FileText />, title: 'Monte em minutos', text: 'Comece de um modelo, puxe os itens do seu catálogo e veja ao lado exatamente o que o cliente vai receber.' },
              { n: '02', icon: <Send />, title: 'Envie pelo WhatsApp', text: 'Um link com a sua marca e uma mensagem pronta. Funciona no celular, sem PDF pesado e sem cadastro.' },
              { n: '03', icon: <BadgeCheck />, title: 'Acompanhe até o sim', text: 'Veja quem abriu, receba pedidos de ajuste e lembre no momento certo. O aceite chega com assinatura.' },
            ].map((s) => (
              <Card key={s.n} sx={{ p: 3 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: tokens.ink, color: tokens.lime, display: 'grid', placeItems: 'center', '& svg': { width: 20, height: 20 } }}>{s.icon}</Box>
                  <Typography sx={{ fontFamily: displayFont, fontSize: 36, color: tokens.border }}>{s.n}</Typography>
                </Stack>
                <Typography sx={{ fontWeight: 650, fontSize: 18, mt: 2.5 }}>{s.title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>{s.text}</Typography>
              </Card>
            ))}
          </Box>
        </Section>

        <Section id="cliente" dark eyebrow="Do lado do seu cliente" title={<>Fácil de entender. <Box component="em" sx={{ color: tokens.lime }}>Fácil de aceitar.</Box></>} subtitle="A proposta abre no celular com a sua logo e as suas cores. O total fica sempre à vista, e a decisão está a um toque.">
          <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
            {[
              ['Opcionais que ele mesmo escolhe', 'Marque extras como opcionais. O cliente inclui o que quiser e o total muda na hora: você vende mais sem insistir.'],
              ['Pedir ajuste em vez de sumir', 'Em vez de silêncio, o cliente manda uma mensagem pela própria proposta. Você ajusta e o link continua o mesmo.'],
              ['Aceite com assinatura', 'Ele assina com o dedo ou digita o nome. Guardamos data, IP e uma cópia do que foi aceito.'],
              ['Sem conta, sem aplicativo', 'Abre em qualquer celular. E, se preferir, ele baixa em PDF.'],
            ].map(([title, text]) => (
              <Stack key={title} direction="row" spacing={2}>
                <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: tokens.lime, color: tokens.ink, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Check size={16} strokeWidth={3} /></Box>
                <Box>
                  <Typography sx={{ fontWeight: 650, fontSize: 17 }}>{title}</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,.7)', mt: 0.5 }}>{text}</Typography>
                </Box>
              </Stack>
            ))}
          </Box>
          <Button component={RouterLink} to="/exemplo" variant="contained" size="large" endIcon={<ArrowRight />} sx={{ mt: 6, bgcolor: tokens.lime, color: tokens.ink, '&:hover': { bgcolor: '#B4DA3E' } }}>
            Abrir a proposta de exemplo
          </Button>
        </Section>

        <Section eyebrow="Tudo num lugar" title="Feito para quem vende serviço.">
          <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
            <Feature icon={<BellRing />} title="O que pede atenção" text="Quem abriu e não respondeu, quem pediu ajuste e o que vence logo, com o lembrete pronto para mandar." />
            <Feature icon={<BookOpen />} title="Catálogo de serviços" text="Seus serviços com preço padrão. Na proposta, é só escolher." />
            <Feature icon={<LayoutTemplate />} title="Modelos" text="Transforme uma proposta que deu certo em ponto de partida para as próximas." />
            <Feature icon={<Palette />} title="Sua marca" text="Logo e cor da sua empresa em cada proposta. O cliente vê você, não a gente." />
            <Feature icon={<Users />} title="Equipe" text="Convide vendedores por link. Cada um com o acesso certo." />
            <Feature icon={<FileText />} title="PDF e histórico" text="Baixe em PDF, veja a linha do tempo e o comprovante de cada aceite." />
          </Box>
        </Section>

        <Section id="preco" eyebrow="Preço" title="Um plano. Tudo incluído." subtitle="Sem limite de propostas e sem taxa por proposta aceita.">
          <Card sx={{ maxWidth: 520, p: { xs: 3, sm: 4 }, boxShadow: shadows.lg, borderColor: tokens.ink }}>
            <Typography sx={{ fontWeight: 650 }}>FechaProposta</Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mt: 1 }}>
              <Typography sx={{ fontSize: 48, fontWeight: 750, letterSpacing: '-0.04em' }}>{money(PRICE_MONTHLY).replace(',00', '')}</Typography>
              <Typography color="text.secondary">/ mês</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">Pix ou cartão. Sem fidelidade.</Typography>
            <Stack spacing={1.25} sx={{ my: 3 }}>
              {PLAN_FEATURES.map((f) => (
                <Stack key={f} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                  <Check size={16} color={tokens.success} strokeWidth={3} />
                  <Typography variant="body2">{f}</Typography>
                </Stack>
              ))}
            </Stack>
            <Button component={RouterLink} to={startTo} variant="contained" size="large" fullWidth endIcon={<ArrowRight />}>
              {user ? 'Abrir painel' : `Começar teste de ${TRIAL_DAYS} dias`}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>Sem cartão de crédito para testar.</Typography>
          </Card>
        </Section>

        <Section id="duvidas" eyebrow="Dúvidas" title="Bom saber antes de começar.">
          <Box sx={{ maxWidth: 760 }}>
            {FAQ.map((f) => (
              <Accordion key={f.q} disableGutters elevation={0} sx={{ borderBottom: `1px solid ${tokens.border}` }}>
                <AccordionSummary expandIcon={<ChevronDown size={18} />} sx={{ px: 0, '& .MuiAccordionSummary-content': { my: 2 } }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 16 }}>{f.q}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
                  <Typography color="text.secondary">{f.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Section>

        <Box component="section" sx={{ px: 2, pb: { xs: 8, md: 12 } }}>
          <Box sx={{ maxWidth: 1120, mx: 'auto', borderRadius: '28px', bgcolor: tokens.ink, color: '#fff', p: { xs: 4, md: 8 }, position: 'relative', overflow: 'hidden' }}>
            <Box aria-hidden sx={{ position: 'absolute', right: -120, top: -160, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(197,235,79,.25), transparent)' }} />
            <Typography component="h2" sx={{ fontFamily: displayFont, fontSize: { xs: 40, md: 60 }, lineHeight: 1.02, maxWidth: 640, position: 'relative' }}>
              A próxima proposta pode ser a que <Box component="em" sx={{ color: tokens.lime }}>fecha.</Box>
            </Typography>
            <Button component={RouterLink} to={startTo} size="large" variant="contained" endIcon={<ArrowRight />} sx={{ mt: 4, bgcolor: tokens.lime, color: tokens.ink, position: 'relative', '&:hover': { bgcolor: '#B4DA3E' } }}>
              {user ? 'Abrir painel' : `Testar ${TRIAL_DAYS} dias grátis`}
            </Button>
          </Box>
        </Box>
      </main>

      <Box component="footer" sx={{ borderTop: `1px solid ${tokens.border}`, px: 2, py: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ maxWidth: 1120, mx: 'auto', justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <BrandMark size="small" />
          <Stack direction="row" spacing={2.5}>
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
