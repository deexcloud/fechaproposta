import { z } from 'zod';

const email = z.string().trim().min(1, 'Informe seu e-mail.').email('E-mail inválido. Ex.: nome@email.com');
const password = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .max(72, 'A senha pode ter no máximo 72 caracteres.');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.'),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Informe seu nome.').max(120, 'Nome muito longo.'),
  email,
  password,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não são iguais.' });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
