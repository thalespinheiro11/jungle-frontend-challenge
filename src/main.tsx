import '@fontsource/roboto-mono/latin-400.css'
import '@fontsource/roboto-mono/latin-500.css'
import '@fontsource/roboto-mono/latin-700.css'
import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { env } from './lib/env'

async function bootstrap() {
  // Mocks are enabled by configuration (VITE_ENABLE_MOCKS), including the demo build.
  if (env.enableMocks) {
    const { startMocking } = await import('./mocks/browser')
    await startMocking()
  }

  // The app is imported only after MSW starts: engine.io-client (inside socket.io-client)
  // captures `globalThis.WebSocket` at module evaluation, so it must see MSW's patched
  // WebSocket. A static import would bypass the mocked Socket.IO server.
  const { App } = await import('./app')

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
