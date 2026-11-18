import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { checkoutHandlers } from './checkout'
import { favoritesHandlers } from './favorites'
import { profileHandlers } from './profile'
import { realtimeHandlers } from './realtime'
import { sessionHandlers } from './session'
import { walletHandlers } from './wallets'

export const handlers = [
  ...sessionHandlers,
  ...catalogHandlers,
  ...favoritesHandlers,
  ...profileHandlers,
  ...cartHandlers,
  ...walletHandlers,
  ...checkoutHandlers,
  ...realtimeHandlers,
]
