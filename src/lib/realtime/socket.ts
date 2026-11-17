import { io, type Socket } from 'socket.io-client'

import { env } from '@/lib/env'

/**
 * Single Socket.IO client for the app. Websocket-only transport: it is what the MSW
 * socket.io binding can intercept (no HTTP long-polling).
 * The socket is created lazily and owned by the session lifecycle (connect on login,
 * disconnect and release listeners on logout or user switch).
 */
let socket: Socket | null = null

export function getSocket(): Socket {
  socket ??= io(env.socketUrl, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4_000,
  })
  return socket
}

export function disposeSocket() {
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
}
