import { z } from 'zod'

import { emailSchema, passwordSchema, usernameSchema } from '@/features/session/schemas'

/** Shared by the profile form and the mock API (server-side validation). */
export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.').max(40, 'Máximo de 40 caracteres.'),
  username: usernameSchema,
  email: emailSchema,
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,32}$/, 'Use de 3 a 32 letras minúsculas, números ou hífen.'),
  walletNickname: z
    .string()
    .trim()
    .min(2, 'Informe o apelido da carteira.')
    .max(30, 'Máximo de 30 caracteres.'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe sua senha atual.'),
  newPassword: passwordSchema,
})

/**
 * Profile form: profile fields plus the optional "Alterar senha" block. The password fields
 * are only validated when the user starts filling any of them.
 */
export const profileFormSchema = profileSchema
  .extend({
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    const { currentPassword, newPassword, confirmPassword } = values
    if (!currentPassword && !newPassword && !confirmPassword) return
    if (!currentPassword) {
      ctx.addIssue({ code: 'custom', path: ['currentPassword'], message: 'Informe sua senha atual.' })
    }
    const strength = passwordSchema.safeParse(newPassword)
    if (!strength.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: strength.error.issues[0]?.message ?? 'Senha inválida.',
      })
    } else if (newPassword === currentPassword) {
      ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'A nova senha deve ser diferente da atual.' })
    }
    if (confirmPassword !== newPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'As senhas não conferem.' })
    }
  })

export type ProfileFormValues = z.input<typeof profileFormSchema>

export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
/** Limit of the data URL accepted by the API (~1 MB). */
export const AVATAR_MAX_BYTES = 1024 * 1024
