import { expect, test, type Page } from '@playwright/test'

import { loginAs, USERS } from './support'

/**
 * Visual regression of the screens required by the brief: Início, detalhe, carrinho e pagamento,
 * on desktop (1440) and mobile (390), full page.
 *
 * Stable data: deterministic mock fixtures and a fresh browser context per test. Before each
 * capture the page waits for web fonts and for every image (lazy ones are switched to eager so
 * the whole page renders). Animations and the caret are disabled by Playwright; toasts are hidden
 * by e2e/visual.css.
 *
 * Baselines live in e2e/visual.spec.ts-snapshots and are per OS (font antialiasing differs between
 * Windows, macOS and Linux). On a platform without baselines, generate them with
 * `npm run test:e2e:update -- e2e/visual.spec.ts` and review the images before committing.
 */

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    for (const img of Array.from(document.images)) img.loading = 'eager'
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? null
          : new Promise((resolve) => img.addEventListener('load', resolve, { once: true })),
      ),
    )
  })
  // Let layout settle after late images/fonts.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
}

async function capture(page: Page, name: string) {
  await settle(page)
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true })
}

test.describe('regressão visual', () => {
  test('início', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
    await capture(page, 'inicio')
  })

  test('detalhe do NFT', async ({ page }) => {
    await page.goto('/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { name: 'Mais desta coleção' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Ivory Baron #088/ })).toBeVisible()
    await capture(page, 'detalhe')
  })

  test('carrinho', async ({ page }) => {
    await page.goto('/nfts/emerald-ape-042')
    await page
      .getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ })
      .filter({ visible: true })
      .click()
    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.getByRole('listitem', { name: /Emerald Ape #042/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Colecionadores também viram' })).toBeVisible()
    await capture(page, 'carrinho')
  })

  test('pagamento', async ({ page }) => {
    await loginAs(page, USERS.ana)
    await page.goto('/nfts/emerald-ape-042')
    await page
      .getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ })
      .filter({ visible: true })
      .click()
    await expect(page).toHaveURL(/\/cart$/)
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar MetaMask' })).toBeVisible()
    await capture(page, 'pagamento')
  })
})
