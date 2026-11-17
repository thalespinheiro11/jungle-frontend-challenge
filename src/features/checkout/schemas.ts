import { z } from 'zod'

import { emailSchema, usernameSchema } from '@/features/session/schemas'

/** Collector data on the payment screen (shared with the mock API). */
export const buyerSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.').max(40, 'Máximo de 40 caracteres.'),
  username: usernameSchema,
  email: emailSchema,
  referralCode: z
    .string()
    .trim()
    .refine((v) => !v || /^[A-Za-z0-9]{4,12}$/.test(v), 'O código de indicação tem de 4 a 12 letras ou números.')
    .transform((v) => v || null)
    .nullable(),
  note: z
    .string()
    .trim()
    .max(280, 'A observação pode ter no máximo 280 caracteres.')
    .transform((v) => v || null)
    .nullable(),
})

export type BuyerFormValues = z.input<typeof buyerSchema>
