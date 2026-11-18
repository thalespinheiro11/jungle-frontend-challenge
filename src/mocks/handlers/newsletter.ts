import { http, HttpResponse } from 'msw'

import { emailSchema } from '@/features/session/schemas'
import type { NewsletterRequest } from '@/lib/api/contracts'

import { db } from '../db'
import { apiError, applyNetwork } from '../http-utils'

export const newsletterHandlers = [
  http.post<never, NewsletterRequest>('*/api/newsletter', async ({ request }) => {
    const failure = await applyNetwork(request, 'newsletter')
    if (failure) return failure

    const body = (await request.json().catch(() => null)) as NewsletterRequest | null
    const email = emailSchema.safeParse(body?.email)
    if (!email.success) {
      const message = email.error.issues[0]?.message ?? 'Informe um e-mail válido.'
      return apiError(422, 'VALIDATION_ERROR', message, { email: message })
    }
    if (db.newsletter.has(email.data)) {
      const message = 'Este e-mail já está inscrito.'
      return apiError(409, 'CONFLICT', message, { email: message })
    }
    db.newsletter.add(email.data)
    return new HttpResponse(null, { status: 201 })
  }),
]
