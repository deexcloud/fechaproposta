import { useEffect, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Link, Stack, Typography } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from '@/components/common';
import { PRICE_MONTHLY, TRIAL_DAYS } from '@/lib/pricing';
import { LEGAL_INFO } from './legalInfo';

interface Section {
  title: string;
  body: ReactNode;
}

const P = ({ children }: { children: ReactNode }) => (
  <Typography color="text.secondary" sx={{ lineHeight: 1.75, '& + &': { mt: 1.5 } }}>{children}</Typography>
);
const List = ({ items }: { items: ReactNode[] }) => (
  <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5, color: 'text.secondary', '& li': { lineHeight: 1.75, mb: 0.75 } }}>
    {items.map((it, i) => <li key={i}>{it}</li>)}
  </Box>
);

const company = LEGAL_INFO.companyName || 'FechaProposta';
const contact = LEGAL_INFO.email ? (
  <>pelo e-mail <Link href={`mailto:${LEGAL_INFO.email}`}>{LEGAL_INFO.email}</Link></>
) : (
  'pelos canais de atendimento informados no site'
);
const updated = new Date(`${LEGAL_INFO.updatedAt}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const identification = [LEGAL_INFO.companyName, LEGAL_INFO.document && `CNPJ/CPF ${LEGAL_INFO.document}`].filter(Boolean).join(', ');

const TERMS: Section[] = [
  {
    title: '1. O que é o FechaProposta',
    body: (
      <>
        {identification && <P>Este serviço é oferecido por {identification}.</P>}
        <P>
          O FechaProposta é uma ferramenta on-line para empresas e profissionais ("Usuários") criarem propostas comerciais,
          enviarem a seus clientes por link e registrarem a resposta (aceite, pedido de ajuste ou recusa).
        </P>
        <P>
          O conteúdo, os preços e as condições de cada proposta são definidos pelo Usuário, que responde por eles perante
          o seu cliente. O FechaProposta não participa da negociação nem do serviço vendido.
        </P>
      </>
    ),
  },
  {
    title: '2. Conta e equipe',
    body: (
      <List
        items={[
          'É preciso ter 18 anos ou mais e informar dados verdadeiros.',
          'Você responde pela sua senha e por tudo o que for feito na conta, inclusive pelas pessoas que convidar para a equipe.',
          'Avise-nos se suspeitar de uso indevido.',
        ]}
      />
    ),
  },
  {
    title: '3. Teste grátis e assinatura',
    body: (
      <List
        items={[
          `Toda empresa nova usa todos os recursos por ${TRIAL_DAYS} dias, sem cartão.`,
          `Depois, o uso continua com a assinatura de R$ ${PRICE_MONTHLY} por mês, paga por Pix ou cartão. Não há fidelidade.`,
          'Se o teste ou a assinatura vencer, a criação e o envio de novas propostas ficam pausados. Os dados continuam guardados e os links já enviados seguem abrindo para os clientes.',
          'Mudanças de preço são avisadas com pelo menos 30 dias de antecedência.',
          'O período já pago não é reembolsado proporcionalmente, salvo quando a lei exigir.',
        ]}
      />
    ),
  },
  {
    title: '4. Aceite pelo link',
    body: (
      <>
        <P>
          Quando o cliente aceita uma proposta, o FechaProposta registra o nome informado, a assinatura (desenhada ou digitada),
          a data e hora, o endereço IP, o navegador e uma cópia do conteúdo aceito com um código de verificação. Esse registro não
          pode ser alterado depois.
        </P>
        <P>
          Trata-se de um registro eletrônico de concordância. Ele não é uma assinatura digital com certificado ICP-Brasil. Para
          contratos que exijam esse tipo de assinatura, use um serviço especializado.
        </P>
      </>
    ),
  },
  {
    title: '5. Uso permitido',
    body: (
      <List
        items={[
          'Não use o serviço para conteúdo ilegal, enganoso ou que viole direitos de terceiros.',
          'Não tente acessar dados de outras empresas nem burlar limites técnicos.',
          'Podemos suspender contas que descumpram estes termos, avisando sempre que possível.',
        ]}
      />
    ),
  },
  {
    title: '6. Disponibilidade e responsabilidade',
    body: (
      <P>
        Trabalhamos para manter o serviço no ar, mas podem ocorrer interrupções para manutenção ou por falhas de terceiros.
        Não respondemos por negócios fechados ou perdidos entre o Usuário e seus clientes.
      </P>
    ),
  },
  {
    title: '7. Contato e foro',
    body: (
      <P>
        Dúvidas sobre estes termos podem ser enviadas {contact}.
        {LEGAL_INFO.city && ` Fica eleito o foro de ${LEGAL_INFO.city}, ressalvados os direitos do consumidor.`}
      </P>
    ),
  },
];

const PRIVACY: Section[] = [
  {
    title: '1. Quem somos',
    body: (
      <P>
        {company} trata dados pessoais para oferecer o FechaProposta, conforme a Lei Geral de Proteção de Dados (LGPD).
        {identification && ` Responsável: ${identification}.`}
      </P>
    ),
  },
  {
    title: '2. Dados de quem usa o painel',
    body: (
      <List
        items={[
          'Nome, e-mail e senha (guardada de forma cifrada pelo provedor de autenticação).',
          'Dados da empresa que você cadastrar (nome, contato, logo, CNPJ/CPF opcional).',
          'Pagamentos da assinatura: guardamos apenas o valor, a data e a forma de pagamento. CPF e dados de cartão são informados direto na página do Asaas e não ficam conosco.',
        ]}
      />
    ),
  },
  {
    title: '3. Dados dos clientes das empresas',
    body: (
      <>
        <P>
          Os dados dos clientes cadastrados nas propostas (nome, e-mail, telefone) pertencem à empresa que os cadastrou, que é a
          controladora. O FechaProposta atua como operador: guarda e processa esses dados apenas para prestar o serviço.
        </P>
        <P>
          Quando o cliente abre ou responde uma proposta, registramos as aberturas e, no aceite, nome, e-mail informado, assinatura,
          IP e navegador. Esses dados servem como prova da resposta e ficam disponíveis para a empresa que enviou a proposta.
        </P>
      </>
    ),
  },
  {
    title: '4. Compartilhamento',
    body: (
      <P>
        Usamos provedores de infraestrutura (banco de dados e hospedagem) e de pagamento (Asaas). Não vendemos dados pessoais.
      </P>
    ),
  },
  {
    title: '5. Seus direitos',
    body: (
      <P>
        Você pode pedir acesso, correção ou exclusão dos seus dados {contact}. Clientes de uma empresa devem fazer o pedido
        primeiro à empresa que enviou a proposta.
      </P>
    ),
  },
  {
    title: '6. Segurança e retenção',
    body: (
      <P>
        Os dados de cada empresa ficam isolados no banco por regras de acesso. Mantemos os dados enquanto a conta existir; registros
        de aceite podem ser mantidos pelo prazo necessário para comprovar a resposta.
      </P>
    ),
  },
];

function LegalLayout({ title, sections }: { title: string; sections: Section[] }) {
  useEffect(() => {
    document.title = `${title} — FechaProposta`;
  }, [title]);
  return (
    <Box component="main" sx={{ maxWidth: 760, mx: 'auto', px: 2, py: { xs: 4, md: 7 } }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
        <RouterLink to="/" aria-label="Página inicial"><BrandMark /></RouterLink>
        <Button component={RouterLink} to="/" startIcon={<ArrowLeft />} color="inherit">Voltar</Button>
      </Stack>
      <Typography variant="h1">{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Atualizado em {updated}.</Typography>
      <Stack spacing={4} sx={{ mt: 5 }}>
        {sections.map((s) => (
          <Box component="section" key={s.title}>
            <Typography variant="h3" component="h2" sx={{ mb: 1 }}>{s.title}</Typography>
            {s.body}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export function TermsPage() {
  return <LegalLayout title="Termos de uso" sections={TERMS} />;
}

export function PrivacyPage() {
  return <LegalLayout title="Política de privacidade" sections={PRIVACY} />;
}
