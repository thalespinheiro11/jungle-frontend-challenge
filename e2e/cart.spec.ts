import { expect, test, type Page } from '@playwright/test'

import { loginAs, mocksReady, realtimeReady, USERS } from './support'

const EMERALD = 'emerald-ape-042'

/** Adds the default edition (1/50) of an NFT through the detail page and lands on /cart. */
async function buyFromDetail(page: Page, nftId = EMERALD) {
  await page.goto(`/nfts/${nftId}`)
  await page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).filter({ visible: true }).click()
  await expect(page).toHaveURL(/\/cart$/)
}

const row = (page: Page, name: RegExp) => page.getByRole('listitem', { name })
const visible = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true })
const checkout = (page: Page) => page.getByRole('button', { name: 'Conectar e finalizar' })

async function setEdition(page: Page, patch: { price?: string; available?: number }) {
  await page.evaluate((p) => {
    const nft = window.__mocks!.getNft('emerald-ape-042')!
    window.__mocks!.updateNft('emerald-ape-042', {
      editions: nft.editions.map((e) => (e.id === '1-50' ? { ...e, ...p } : e)),
    })
  }, patch)
}

test.describe('carrinho', () => {
  test('comprar leva ao carrinho com o resumo calculado pela API', async ({ page }) => {
    await buyFromDetail(page)
    const line = row(page, /Emerald Ape #042 \(edição 1\/50\)/)
    await expect(line).toBeVisible()
    await expect(visible(page, '1.19 ETH').first()).toBeVisible()
    // Subtotal 1.19 + network fee 0.016
    await expect(visible(page, '1.206 ETH')).toBeVisible()
  })

  test('alterar quantidade e remover itens atualiza o resumo', async ({ page }) => {
    await buyFromDetail(page)
    const line = row(page, /Emerald Ape #042/)
    await line.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(line.getByRole('spinbutton')).toHaveValue('2')
    await expect(visible(page, '2.396 ETH')).toBeVisible()

    await line.getByRole('button', { name: /Remover Emerald Ape #042/ }).filter({ visible: true }).click()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Carrinho de NFTs' })).toBeFocused()
  })

  test('cupom inválido, expirado, aplicado e removido', async ({ page }) => {
    await buyFromDetail(page)
    const coupon = page.getByRole('textbox', { name: 'Código promocional' })
    const apply = page.getByRole('button', { name: 'Aplicar' })

    await coupon.fill('NAOEXISTE')
    await apply.click()
    await expect(page.getByRole('alert')).toHaveText(/Cupom inválido\./)
    await expect(coupon).toHaveAttribute('aria-invalid', 'true')

    await coupon.fill('genesis2025')
    await apply.click()
    await expect(page.getByRole('alert')).toHaveText(/Este cupom expirou em 31\/01\/2026\./)

    await coupon.fill('kurio10')
    await apply.click()
    await expect(page.getByText('KURIO10 · 10% de desconto')).toBeVisible()
    // 1.19 − 10% (0.119) + 0.016
    await expect(visible(page, '(-) 0.119 ETH')).toBeVisible()
    await expect(visible(page, '1.087 ETH')).toBeVisible()

    await page.getByRole('button', { name: 'Remover cupom KURIO10' }).click()
    await expect(visible(page, '1.206 ETH')).toBeVisible()
  })

  test('carrinho do visitante sobrevive ao refresh e é preservado no login', async ({ page }) => {
    await buyFromDetail(page)
    await page.reload()
    await expect(row(page, /Emerald Ape #042/)).toBeVisible()

    await loginAs(page, USERS.ana, '/cart')
    await expect(page).toHaveURL(/\/cart$/)
    await expect(row(page, /Emerald Ape #042/)).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kurio:guest-cart-id'))).toBeNull()
  })

  test('carrinho de um usuário não aparece para outro', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Troca de usuário pelo menu do cabeçalho desktop.')
    await loginAs(page, USERS.ana)
    await buyFromDetail(page)
    await page.getByRole('button', { name: 'Menu da conta de Ana Souza' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()

    await loginAs(page, USERS.bruno, '/cart')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('preço alterado em tempo real exige revisão antes de finalizar', async ({ page }) => {
    await buyFromDetail(page)
    await expect(checkout(page)).toBeEnabled()
    await mocksReady(page)
    await realtimeReady(page)

    await setEdition(page, { price: '1.49' })

    const line = row(page, /Emerald Ape #042/)
    await expect(line.getByText(/Preço alterado:/)).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Emerald Ape #042: preço mudou para 1.49 ETH.' })).toBeAttached()
    await expect(visible(page, '1.506 ETH')).toBeVisible()
    await expect(checkout(page)).toBeDisabled()

    await page.getByRole('button', { name: 'Aceitar novos preços' }).click()
    await expect(line.getByText(/Preço alterado:/)).toHaveCount(0)
    await expect(checkout(page)).toBeEnabled()
  })

  test('disponibilidade reduzida em tempo real pede ajuste da quantidade', async ({ page }) => {
    await buyFromDetail(page)
    const line = row(page, /Emerald Ape #042/)
    await line.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(line.getByRole('spinbutton')).toHaveValue('2')
    await mocksReady(page)
    await realtimeReady(page)

    await setEdition(page, { available: 1 })

    await expect(line.getByText('Só resta 1 unidade desta edição.')).toBeVisible()
    await expect(checkout(page)).toBeDisabled()
    await line.getByRole('button', { name: 'Ajustar para 1' }).click()
    await expect(line.getByRole('spinbutton')).toHaveValue('1')
    await expect(checkout(page)).toBeEnabled()

    await setEdition(page, { available: 0 })
    await expect(line.getByText('Esta edição esgotou. Remova o item para continuar.')).toBeVisible()
    await expect(checkout(page)).toBeDisabled()
  })
})
