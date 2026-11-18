import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
/**
 * BASE_URL runs the suite against an already deployed build (e.g. the Vercel URL) instead
 * of building and serving locally:  BASE_URL=https://… npx playwright test
 */
const remoteURL = process.env.BASE_URL
const baseURL = remoteURL ?? `http://localhost:${PORT}`

/**
 * E2E runs against the optimized build with mocks enabled (same artifact as the demo deploy).
 * Each test gets a fresh browser context (isolated localStorage → isolated mock DB).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  expect: {
    // Visual regression: CSS-pixel scale (small, comparable images on high-DPR mobile),
    // no animations or caret, transient UI hidden by e2e/visual.css.
    toHaveScreenshot: {
      // Calibrated by injecting regressions: with the defaults (1% of pixels, per-pixel
      // threshold 0.2) a full recolour of the primary colour to blue or mustard passed.
      // 0.1% of pixels and threshold 0.05 catch both, and repeated runs stay at 0 px diff.
      maxDiffPixelRatio: 0.001,
      threshold: 0.05,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      stylePath: './e2e/visual.css',
    },
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: remoteURL
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { VITE_ENABLE_MOCKS: 'true' },
      },
})
