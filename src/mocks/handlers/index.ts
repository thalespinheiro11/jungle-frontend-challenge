import { catalogHandlers } from './catalog'
import { realtimeHandlers } from './realtime'
import { sessionHandlers } from './session'

export const handlers = [...sessionHandlers, ...catalogHandlers, ...realtimeHandlers]
