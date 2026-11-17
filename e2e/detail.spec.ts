import { expect, test, type Page } from '@playwright/test'

import { loginAs, mocksReady, realtimeReady, submitLogin, USERS } from './support'

const EMERALD = 'emerald-ape-042'

const favoriteButton = (page: Page) => page.getByRole('button', { name: 'Favoritar Emerald Ape #042' })

test.describe('detalhe do NFT', () => {
  test('acesso direto mostra informações, edições e edição esgotada', async ({ page }) => {
    await page.goto(`/nfts/${EMERALD}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByText('Coleção:')).toBeVisible()

    const editions = page.getByRole('group', { name: 'Edição:' })
    await expect(editions.getByRole('radio', { name: '1/50' })).toBeChecked()
    // The open edition of Emerald Ape is sold out in the fixture.
    await expect(editions.getByRole('radio', { name: 'ABERTA (esgotada)' })).toBeDisabled()
  })

  test('quantidade respeita o limite da edição', async ({ page }) => {
    await page.goto(`/nfts/${EMERALD}`)
    await mocksReady(page)
    const available = await page.evaluate(
      () => window.__mocks!.getNft('emerald-ape-042')!.editions.find((e) => e.id === '1-50')!.available,
    )
    const max = Math.min(available, 10)

    const plus = page.getByRole('button', { name: 'Aumentar quantidade' }).filter({ visible: true })
    for (let i = 1; i < max; i++) await plus.click()
    await expect(plus).toBeDisabled()
    await expect(page.getByRole('spinbutton', { name: /Quantidade|Qtd/ }).filter({ visible: true })).toHaveValue(String(max))
    await expect(page.getByText(`Máximo disponível para esta edição: ${max}.`)).toBeVisible()
  })

  test('preço e esgotamento chegam em tempo real e são anunciados', async ({ page }) => {
    await page.goto(`/nfts/${EMERALD}`)
    // The change must happen while the page shows the original data.
    await expect(page.getByRole('radio', { name: '1/50' })).toBeChecked()
    await realtimeReady(page)

    await page.evaluate(() => {
      const nft = window.__mocks!.getNft('emerald-ape-042')!
      window.__mocks!.updateNft('emerald-ape-042', {
        editions: nft.editions.map((e) => (e.id === '1-50' ? { ...e, price: '1.49' } : e)),
      })
    })
    await expect(page.getByRole('status').filter({ hasText: 'Preço da edição 1/50 atualizado: 1.19 ETH → 1.49 ETH.' })).toBeVisible()

    await page.evaluate(() => {
      const nft = window.__mocks!.getNft('emerald-ape-042')!
      window.__mocks!.updateNft('emerald-ape-042', {
        editions: nft.editions.map((e) => (e.id === '1-50' ? { ...e, available: 0 } : e)),
      })
    })
    await expect(page.getByText('A edição 1/50 acabou de esgotar.')).toBeVisible()
    await expect(page.getByRole('radio', { name: '1/50 (esgotada)' })).toBeDisabled()
  })

  test('mostra avaliações e coleção relacionada', async ({ page }) => {
    await page.goto(`/nfts/${EMERALD}`)
    await page.getByRole('tab', { name: /Avaliações( de colecionadores)? \(19\)/ }).click()
    await expect(page.getByText('Mostrando as 3 avaliações mais recentes de 19.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Mais desta coleção' })).toBeVisible()
  })
})

test.describe('favoritos', () => {
  test('visitante é levado ao login e volta ao NFT', async ({ page }) => {
    await page.goto(`/nfts/${EMERALD}`)
    await favoriteButton(page).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fnfts%2Femerald-ape-042/)
    await submitLogin(page, USERS.ana.email, USERS.ana.password)
    await expect(page).toHaveURL(new RegExp(`/nfts/${EMERALD}$`))
  })

  test('favoritar persiste por usuário e após refresh', async ({ page, isMobile }) => {
    await loginAs(page, USERS.ana, `/nfts/${EMERALD}`)
    await favoriteButton(page).click()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Emerald Ape #042 adicionado aos favoritos.')).toBeVisible()

    await page.reload()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')

    // Another user does not see Ana's favorite.
    test.skip(isMobile, 'Troca de usuário pelo menu do cabeçalho desktop.')
    await page.getByRole('button', { name: 'Menu da conta de Ana Souza' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
    await loginAs(page, USERS.bruno, `/nfts/${EMERALD}`)
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')
  })

  test('falha ao favoritar desfaz a atualização otimista e permite tentar de novo', async ({ page }) => {
    await loginAs(page, USERS.ana, `/nfts/${EMERALD}`)
    await page.evaluate(() => window.__mocks!.setScenario('favorites-error'))

    await favoriteButton(page).click()
    await expect(page.getByText('Não foi possível favoritar agora. Tente novamente.')).toBeVisible()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')

    // Recovery: once the API is back, the same action succeeds.
    await page.evaluate(() => window.__mocks!.setScenario('default'))
    await favoriteButton(page).click()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Emerald Ape #042 adicionado aos favoritos.')).toBeVisible()
  })
})
