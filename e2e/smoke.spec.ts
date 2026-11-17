import { expect, test } from '@playwright/test'

import { realtimeReady } from './support'

test.describe('base da aplicação', () => {
  test('lista o catálogo vindo do MSW', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/seja dono do futuro/i)
    await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
  })

  test('filtro entra na URL e sobrevive ao refresh', async ({ page }) => {
    await page.goto('/?sort=price-asc')
    await expect(page.getByRole('link', { name: /Topaz Rhythm #090/ })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('link', { name: /Topaz Rhythm #090/ })).toBeVisible()
  })

  test('NFT inexistente mostra 404', async ({ page }) => {
    await page.goto('/nfts/nao-existe')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  })

  test('rota privada redireciona para login', async ({ page }) => {
    await page.goto('/checkout')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test('nft.updated chega pelo Socket.IO e atualiza o preço no catálogo', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('1.19 ETH')).toBeVisible()
    await realtimeReady(page)
    await page.evaluate(() => {
      const nft = window.__mocks!.getNft('emerald-ape-042')!
      window.__mocks!.updateNft('emerald-ape-042', {
        editions: nft.editions.map((e) => (e.id === '1-50' ? { ...e, price: '1.49' } : e)),
      })
    })
    await expect(page.getByText('1.49 ETH')).toBeVisible()
  })

  for (const path of ['/', '/nfts/emerald-ape-042', '/login', '/signup']) {
    test(`sem overflow horizontal em ${path}`, async ({ page }) => {
      await page.goto(path)
      await page.getByRole('heading', { level: 1 }).first().waitFor()
      await page.waitForLoadState('networkidle')
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    })
  }
})
