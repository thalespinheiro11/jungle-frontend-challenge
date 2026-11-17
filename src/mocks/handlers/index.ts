import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { checkoutHandlers } from './checkout'
import { favoritesHandlers } from './favorites'
import { realtimeHandlers } from './realtime'
import { sessionHandlers } from './session'
import { walletHandlers } from './wallets'

export const handlers = [
  ...sessionHandlers,
  ...catalogHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...walletHandlers,
  ...checkoutHandlers,
  ...realtimeHandlers,
]
