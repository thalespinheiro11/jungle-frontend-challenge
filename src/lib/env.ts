/** Typed access to build-time configuration (see .env.example). */
export const env = {
  enableMocks: import.meta.env.VITE_ENABLE_MOCKS === 'true',
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL || window.location.origin,
} as const
