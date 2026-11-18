import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * When the mock layer is enabled, the catalog's first data depends on it. Its chunk is a
 * dynamic import (so it can be left out entirely without mocks), which Vite does not preload;
 * this adds a <link rel="modulepreload"> so it downloads in parallel with the entry instead of
 * after the entry has been evaluated.
 */
function preloadMocks(enabled: boolean): Plugin {
  return {
    name: 'kurio:preload-mocks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!enabled || !ctx.bundle) return
        const chunk = Object.values(ctx.bundle).find(
          (output) =>
            output.type === 'chunk' && output.facadeModuleId?.endsWith('src/mocks/browser.ts'),
        )
        if (!chunk) return
        return [
          {
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: '', href: `/${chunk.fileName}` },
            injectTo: 'head',
          },
        ]
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const mocksEnabled = loadEnv(mode, process.cwd(), 'VITE_').VITE_ENABLE_MOCKS === 'true'
  return {
    plugins: [
      // Must run before the React plugin so generated route files are picked up.
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      preloadMocks(mocksEnabled || process.env.VITE_ENABLE_MOCKS === 'true'),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        // MSW's cookie jar (tough-cookie) pulls the full Public Suffix List through `tldts`;
        // the app uses no cookies, so a tiny shim replaces it (see the file for details).
        tldts: path.resolve(import.meta.dirname, 'src/mocks/shims/tldts.ts'),
      },
    },
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
  }
})
