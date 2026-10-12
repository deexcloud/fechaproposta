/**
 * Dados da empresa que aparecem nos Termos de uso e na Política de privacidade.
 * PREENCHA antes de vender: a LGPD exige identificar o responsável e um canal
 * de contato. Campos vazios são omitidos no site.
 *
 * Os textos são um MODELO: revise com um advogado antes de publicar.
 */
export const LEGAL_INFO = {
  /** Razão social, ex.: "FechaProposta Tecnologia Ltda." */
  companyName: '',
  /** CNPJ (ou CPF, se for pessoa física), ex.: "00.000.000/0001-00" */
  document: '',
  /** E-mail para assuntos de privacidade e suporte */
  email: '',
  /** Cidade/UF do foro, ex.: "São Paulo/SP" */
  city: '',
  /** Data da última atualização dos textos (AAAA-MM-DD) */
  updatedAt: '2026-10-12',
};

/** Versão aceita no cadastro (muda quando os textos mudarem). */
export const TERMS_VERSION = LEGAL_INFO.updatedAt;
