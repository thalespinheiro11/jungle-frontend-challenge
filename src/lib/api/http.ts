import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

import { env } from '@/lib/env'

import type { ApiErrorBody, ApiErrorCode } from './contracts'

/** Normalized error every query/mutation receives, regardless of the failure kind. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELED' | 'UNKNOWN'
  readonly fieldErrors: Record<string, string>
  /** Raw error body, for endpoints that attach extra data (e.g. a fresh quote on 409). */
  readonly details: unknown

  constructor(init: {
    status: number
    code: ApiError['code']
    message: string
    fieldErrors?: Record<string, string>
    details?: unknown
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fieldErrors = init.fieldErrors ?? {}
    this.details = init.details
  }

  /** Failures worth retrying automatically. */
  get isTransient() {
    return (
      this.code === 'NETWORK_ERROR' ||
      this.code === 'TIMEOUT' ||
      this.code === 'TRANSIENT' ||
      this.status >= 500
    )
  }

  get isAuthError() {
    return this.code === 'UNAUTHENTICATED' || this.code === 'SESSION_EXPIRED'
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error)) {
    return new ApiError({ status: 0, code: 'CANCELED', message: 'Requisição cancelada.' })
  }
  if (error instanceof AxiosError) {
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return new ApiError({ status: 0, code: 'TIMEOUT', message: 'A requisição demorou demais.' })
    }
    const body = error.response?.data as Partial<ApiErrorBody> | undefined
    if (error.response && body?.error) {
      return new ApiError({ status: error.response.status, ...body.error, details: body })
    }
    if (!error.response) {
      return new ApiError({
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Sem conexão com o servidor.',
      })
    }
    return new ApiError({
      status: error.response.status,
      code: error.response.status >= 500 ? 'TRANSIENT' : 'UNKNOWN',
      message: 'Erro inesperado no servidor.',
    })
  }
  return new ApiError({ status: 0, code: 'UNKNOWN', message: 'Erro inesperado.' })
}

/** Reads the current access token; wired by the session module to avoid a circular import. */
let getAccessToken: () => string | null = () => null
export function setAccessTokenGetter(getter: () => string | null) {
  getAccessToken = getter
}

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: 10_000,
  headers: { Accept: 'application/json' },
  // Arrays as repeated keys (category=a&category=b), matching the URL search state.
  paramsSerializer: { indexes: null },
})

http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

/** Called when an authenticated request is rejected because the session is gone/expired. */
let onAuthFailure: (error: ApiError) => void = () => {}
export function setAuthFailureHandler(handler: (error: ApiError) => void) {
  onAuthFailure = handler
}

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    const sentToken =
      error instanceof AxiosError && Boolean(error.config?.headers?.get?.('Authorization'))
    if (sentToken && apiError.isAuthError) onAuthFailure(apiError)
    return Promise.reject(apiError)
  },
)

/** Typed helpers so callers get `T` instead of AxiosResponse<T>. */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    http.get<T>(url, config).then((r) => r.data),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    http.post<T>(url, body, config).then((r) => r.data),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    http.put<T>(url, body, config).then((r) => r.data),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    http.patch<T>(url, body, config).then((r) => r.data),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    http.delete<T>(url, config).then((r) => r.data),
}
