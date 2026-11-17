import { io, type Socket } from 'socket.io-client'

import { env } from '@/lib/env'

/**
 * Creates the app's Socket.IO client. Websocket-only transport: it is what the MSW
 * socket.io binding can intercept (no HTTP long-polling).
 * One socket per session: the token travels in the handshake `auth` payload, and a new
 * socket (with fresh listeners and dedupe memory) is created whenever the user changes,
 * so events from a previous session can never reach the next user's cache.
 */
export function createSocket(token: string | null): Socket {
  return io(env.socketUrl, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4_000,
    auth: token ? { token } : {},
  })
}

export function disposeSocket(socket: Socket) {
  socket.removeAllListeners()
  socket.disconnect()
}
