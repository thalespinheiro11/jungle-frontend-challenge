import type { Socket } from 'socket.io-client'

import { env } from '@/lib/env'
import { networkReady } from '@/lib/network-ready'

/**
 * Creates the app's Socket.IO client. Websocket-only transport: it is what the MSW
 * socket.io binding can intercept (no HTTP long-polling).
 *
 * `socket.io-client` is imported on demand, after the network gate: engine.io-client captures
 * `globalThis.WebSocket` when its module is evaluated, so it must load after the mock layer
 * has patched it (and it stays off the critical rendering path).
 *
 * One socket per session: the token travels in the handshake `auth` payload, and a new
 * socket (with fresh listeners and dedupe memory) is created whenever the user changes,
 * so events from a previous session can never reach the next user's cache.
 */
export async function createSocket(token: string | null): Promise<Socket> {
  await networkReady.wait()
  const { io } = await import('socket.io-client')
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
