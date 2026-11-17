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
 * - No rooms/namespaces/acks: per-user scoping is done by this handler.
 */
// MSW strips the "/socket.io/" path prefix before matching, so the link targets the
// Socket.IO server origin (same one the app's client uses), not the engine.io path.
const realtime = ws.link(env.socketUrl.replace(/^http/, 'ws'))

const PING_INTERVAL_MS = 20_000

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)

    const heartbeat = setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)

    const unsubscribe = db.subscribe((event) => {
      io.client.emit(event.type, event)
    })

    connection.client.addEventListener('close', () => {
      clearInterval(heartbeat)
      unsubscribe()
    })
  }),
]
