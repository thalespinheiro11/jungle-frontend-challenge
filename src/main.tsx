import '@fontsource/roboto-mono/latin-400.css'
import '@fontsource/roboto-mono/latin-500.css'
import '@fontsource/roboto-mono/latin-700.css'
import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app'
import { env } from './lib/env'
import { networkReady } from './lib/network-ready'

function bootstrap() {
  // Mocks are enabled by configuration (VITE_ENABLE_MOCKS), including the demo build.
  // They start in parallel with the first render: the UI shows right away, and network calls
  // (Axios and Socket.IO) wait on `networkReady` until the worker intercepts requests.
  // The app is a static import (its chunks get modulepreload hints in the HTML);
  // socket.io-client is loaded lazily after the gate, so it still sees the patched WebSocket.
  if (env.enableMocks) {
    networkReady.set(import('./mocks/browser').then(({ startMocking }) => startMocking()))
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
