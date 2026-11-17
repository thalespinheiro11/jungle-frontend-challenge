import { catalogHandlers } from './catalog'
import { favoritesHandlers } from './favorites'
import { realtimeHandlers } from './realtime'
import { sessionHandlers } from './session'

export const handlers = [
  ...sessionHandlers,
  ...catalogHandlers,
  ...favoritesHandlers,
  ...realtimeHandlers,
]
