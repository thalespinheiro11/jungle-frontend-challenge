import { z } from 'zod'

/**
 * Validation rules for account forms. The UI uses them for instant feedback and the mock
 * API applies the same rules server-side (the UI never trusts that it validated alone).
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Informe seu e-mail.')
  .pipe(z.email('Informe um e-mail válido.'))

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'O nome de usuário precisa ter ao menos 3 caracteres.')
  .max(20, 'O nome de usuário pode ter no máximo 20 caracteres.')
  .regex(/^[a-zA-Z0-9._]+$/, 'Use apenas letras, números, ponto e sublinhado.')

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa ter ao menos 8 caracteres.')
  .max(64, 'A senha pode ter no máximo 64 caracteres.')
  .regex(/[A-Za-z]/, 'A senha precisa ter ao menos uma letra.')
  .regex(/\d/, 'A senha precisa ter ao menos um número.')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
export type SignupValues = z.infer<typeof signupSchema>

/** Server-side shape (no confirmation field). */
export const signupRequestSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
})

/** Maps zod issues to `{ field: firstMessage }`, the API's fieldErrors format. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    out[key] ??= issue.message
  }
  return out
}
