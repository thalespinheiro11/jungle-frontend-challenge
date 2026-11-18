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
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
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
