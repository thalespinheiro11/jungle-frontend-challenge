import { expect, type Page } from '@playwright/test'

export const USERS = {
  ana: { email: 'ana@kurio.dev', password: 'Kurio@123', name: 'Ana Souza', username: 'ana.colecionadora' },
  bruno: { email: 'bruno@kurio.dev', password: 'Kurio@123', name: 'Bruno Lima', username: 'bruno.nft' },
} as const

/** Fills and submits the login form on the current /login screen (modal or page). */
export async function submitLogin(page: Page, email: string, password: string) {
  await page.getByPlaceholder('contato@email.com').fill(email)
  await page.getByPlaceholder('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

export async function loginAs(page: Page, user: (typeof USERS)[keyof typeof USERS], redirect?: string) {
  await page.goto(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login')
  await submitLogin(page, user.email, user.password)
  await expect(page.getByText(`Bem-vindo de volta, ${user.name}!`)).toBeVisible()
}

/** Waits until the MSW worker exposed its control surface (mocks started). */
export async function mocksReady(page: Page) {
  await page.waitForFunction(() => Boolean(window.__mocks))
}

/** Waits until the app's socket.io-client is connected to the mocked server. */
export async function realtimeReady(page: Page) {
  await page.waitForFunction(() => (window.__mocks?.realtimeConnections() ?? 0) > 0)
}
