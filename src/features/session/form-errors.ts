import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { ApiError } from '@/lib/api/http'

/**
 * Applies an API error to a form: field errors go to their inputs (first one focused),
 * the rest becomes a form-level message. Returns that message (or null).
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!(error instanceof ApiError)) return 'Não foi possível concluir. Tente novamente.'

  let focused = false
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message }, { shouldFocus: !focused })
      focused = true
    }
  }
  if (focused && (error.code === 'VALIDATION_ERROR' || error.code === 'CONFLICT')) return null

  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
  }
  if (error.isTransient) return 'O serviço está instável no momento. Tente novamente.'
  return error.message
}
