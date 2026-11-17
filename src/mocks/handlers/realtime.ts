import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'

import { env } from '@/lib/env'

import { db } from '../db'

/**
 * Socket.IO over MSW. The app's real `socket.io-client` connects via websocket; MSW intercepts
 * the WebSocket and the binding encodes/decodes the Engine.IO + Socket.IO protocol.
 *
 * Binding limitations handled here (documented in ARCHITECTURE.md):
 * - It sends the open/connect handshake but no heartbeat. Engine.IO v4 clients drop the
 *   connection after pingInterval + pingTimeout (30s) without a server ping, so we send
 *   ping packets ("2") ourselves; the client answers with pong ("3").
 * - No rooms/namespaces/acks, and the handshake `auth` payload is not exposed: we read the
 *   client's CONNECT packet ("40{...}") ourselves to learn the session token, and scope
 *   private events (order.updated) to that user's connections.
 */
// MSW strips the "/socket.io/" path prefix before matching, so the link targets the
// Socket.IO server origin (same one the app's client uses), not the engine.io path.
const realtime = ws.link(env.socketUrl.replace(/^http/, 'ws'))

const PING_INTERVAL_MS = 20_000

interface LiveConnection {
  userId: string | null
  close: () => void
}
const live = new Set<LiveConnection>()

/** Test/demo controls for the realtime channel. */
export const realtimeStats = {
  get connections() {
    return live.size
  },
  get authenticated() {
    return [...live].filter((c) => c.userId).length
  },
  /** Drops every socket (simulates a network interruption; clients auto-reconnect). */
  disconnectAll() {
    for (const connection of [...live]) connection.close()
  },
}

function userFromConnectPacket(data: unknown): string | null {
  if (typeof data !== 'string' || !data.startsWith('40')) return null
  try {
    const auth = JSON.parse(data.slice(2) || '{}') as { token?: string }
    const session = auth.token ? db.sessions.find(auth.token) : undefined
    return session && Date.parse(session.expiresAt) > Date.now() ? session.userId : null
  } catch {
    return null
  }
}

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)
    const entry: LiveConnection = { userId: null, close: () => connection.client.close() }
    live.add(entry)

    connection.client.addEventListener('message', (event) => {
      const userId = userFromConnectPacket(event.data)
      if (userId) entry.userId = userId
    })

    const heartbeat = setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)

    const unsubscribe = db.subscribe((event, audience) => {
      // Private events only reach sockets authenticated as their owner.
      if (audience.userId && audience.userId !== entry.userId) return
      io.client.emit(event.type, event)
    })

    connection.client.addEventListener('close', () => {
      live.delete(entry)
      clearInterval(heartbeat)
      unsubscribe()
    })
  }),
]
