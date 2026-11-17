import { http } from 'msw'

import { apiError, applyNetwork } from '../http-utils'

/**
 * Placeholder until accounts are implemented: every visitor is anonymous,
 * so private routes redirect to /login.
 */
export const sessionHandlers = [
  http.get('*/api/session', async ({ request }) => {
    const failure = await applyNetwork(request, 'session')
    if (failure) return failure
    return apiError(401, 'UNAUTHENTICATED', 'Sessão não encontrada.')
  }),
]
