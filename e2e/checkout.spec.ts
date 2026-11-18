import { expect, test, type Page } from '@playwright/test'

import { loginAs, mocksReady, USERS } from './support'

const RECEIPT_TITLE = 'Seus NFTs agora estão na sua carteira'

/** Ana (who has registered wallets) with Emerald Ape 1/50 in the cart, on /checkout. */
async function readyToPay(page: Page) {
  await loginAs(page, USERS.ana)
  await page.goto('/nfts/emerald-ape-042')
  await page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).filter({ visible: true }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await mocksReady(page)
}

async function connectWallet(page: Page) {
  await page.getByRole('button', { name: /^Conectar (MetaMask|WalletConnect|Coinbase Wallet)$/ }).click()
  await expect(page.getByText(/Conectada:/)).toBeVisible()
}

async function review(page: Page) {
  await page.getByRole('button', { name: 'Revisar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Revise seu pedido' })).toBeFocused()
}

const confirm = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })
const orderIds = (page: Page) => page.evaluate(() => window.__mocks!.orderIds())

async function setEmeraldPrice(page: Page, price: string) {
  await page.evaluate((p) => {
    const nft = window.__mocks!.getNft('emerald-ape-042')!
    window.__mocks!.updateNft('emerald-ape-042', {
      editions: nft.editions.map((e) => (e.id === '1-50' ? { ...e, price: p } : e)),
    })
  }, price)
}

test.describe('pagamento e pedido', () => {
  test('compra completa: do catálogo ao recibo confirmado', async ({ page }) => {
    await readyToPay(page)
    await connectWallet(page)
    await review(page)
    await confirm(page).click()

    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Emerald Ape #042')).toBeVisible()
    await expect(page.getByText('1.206 ETH').first()).toBeVisible()

    // The purchased quantity left the cart.
    await page.goto('/cart')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('recibo mantém o snapshot mesmo se o catálogo mudar', async ({ page }) => {
    await readyToPay(page)
    await connectWallet(page)
    await review(page)
    await confirm(page).click()
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toBeVisible({ timeout: 15_000 })

    await setEmeraldPrice(page, '9.99')
    await page.reload()
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toBeVisible()
    await expect(page.getByText('1.206 ETH').first()).toBeVisible()
    await expect(page.getByText('9.99 ETH')).toHaveCount(0)
  })

  test('valida dados e exige carteira conectada antes da revisão', async ({ page }) => {
    await readyToPay(page)
    const name = page.getByRole('textbox', { name: 'Nome de exibição' })
    await name.fill('')
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('invalido')
    await page.getByRole('button', { name: 'Revisar pedido' }).click()

    await expect(name).toBeFocused()
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Informe o nome de exibição.')).toBeVisible()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()

    await name.fill('Ana Souza')
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('ana@kurio.dev')
    await page.getByRole('button', { name: 'Revisar pedido' }).click()
    await expect(page.getByText('Conecte sua carteira para revisar o pedido.')).toBeVisible()
  })

  test('carteira recusa a conexão, depois conecta e desconecta', async ({ page }) => {
    await readyToPay(page)
    await page.evaluate(() => window.__mocks!.setScenario('wallet-rejected'))
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await expect(page.getByText(/A conexão foi recusada na carteira/)).toBeVisible()

    await page.evaluate(() => window.__mocks!.setScenario('default'))
    await connectWallet(page)
    await page.getByRole('button', { name: 'Desconectar' }).click()
    await expect(page.getByRole('button', { name: 'Conectar MetaMask' })).toBeVisible()
  })

  test('pagamento recusado mantém os itens no carrinho', async ({ page }) => {
    await readyToPay(page)
    await page.evaluate(() => window.__mocks!.setScenario('payment-declined'))
    await connectWallet(page)
    await review(page)
    await confirm(page).click()

    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toHaveCount(0)
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.getByRole('listitem', { name: /Emerald Ape #042/ })).toBeVisible()
  })

  test('clique repetido cria um único pedido', async ({ page }) => {
    await readyToPay(page)
    await connectWallet(page)
    await review(page)
    let posts = 0
    page.on('request', (r) => r.method() === 'POST' && r.url().endsWith('/api/orders') && posts++)

    await confirm(page).dblclick()

    await expect(page).toHaveURL(/\/orders\/ord_/)
    expect(posts).toBe(1)
    expect(await orderIds(page)).toHaveLength(1)
  })

  test('timeout após criar o pedido recupera o mesmo pedido pela idempotência', async ({ page }) => {
    test.setTimeout(60_000)
    await readyToPay(page)
    await connectWallet(page)
    await review(page)
    await page.evaluate(() => window.__mocks!.setScenario('order-timeout'))
    const keys: string[] = []
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/api/orders')) keys.push(r.headers()['idempotency-key'] ?? '')
    })

    await confirm(page).click()
    await expect(page).toHaveURL(/\/orders\/ord_/, { timeout: 30_000 })

    // Two sends (original + automatic resend after the timeout) with the same key → one order.
    expect(keys.length).toBeGreaterThanOrEqual(2)
    expect(new Set(keys).size).toBe(1)
    expect(await orderIds(page)).toHaveLength(1)
  })

  test('preço alterado via Socket.IO durante a revisão impede confirmar a cotação antiga', async ({ page }) => {
    await readyToPay(page)
    await connectWallet(page)
    await review(page)
    await page.waitForFunction(() => window.__mocks!.authenticatedRealtimeConnections() > 0)

    await setEmeraldPrice(page, '1.49')

    await expect(page.getByText(/mudaram enquanto você revisava/)).toBeVisible()
    await expect(confirm(page)).toHaveCount(0)
    await page.getByRole('button', { name: 'Atualizar cotação' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'total 1.206 ETH → 1.506 ETH' })).toBeVisible()
    await expect(page.getByText('1.506 ETH').first()).toBeVisible()

    await confirm(page).click()
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toBeVisible({ timeout: 15_000 })
  })

  test('pedido pendente sobrevive a desconexão e refresh sem nova compra; eventos antigos são ignorados', async ({ page }) => {
    await readyToPay(page)
    await connectWallet(page)
    await review(page)
    await page.evaluate(() => window.__mocks!.pauseSettlement())
    await confirm(page).click()
    await expect(page.getByRole('heading', { name: 'Processando pagamento' })).toBeVisible()
    const url = page.url()

    // Network interruption + reload while pending.
    await page.evaluate(() => window.__mocks!.disconnectRealtime())
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Processando pagamento' })).toBeVisible()

    // Going back to checkout resumes the same order instead of buying again.
    await page.goto('/checkout')
    await expect(page).toHaveURL(url, { timeout: 10_000 })
    expect(await orderIds(page)).toHaveLength(1)

    // The chain settles; the update arrives over the (reconnected) socket.
    await page.waitForFunction(() => window.__mocks!.authenticatedRealtimeConnections() > 0)
    await page.evaluate(() => window.__mocks!.resumeSettlement())
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toBeVisible({ timeout: 8_000 })

    // Duplicate and stale (older version, "pending") events don't regress the receipt.
    const orderId = url.split('/').pop()!
    await page.evaluate((id) => {
      window.__mocks!.replayOrderEvent(id)
      window.__mocks!.replayOrderEvent(id, 1)
    }, orderId)
    await page.waitForTimeout(300)
    await expect(page.getByRole('heading', { name: RECEIPT_TITLE })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Processando pagamento' })).toHaveCount(0)
  })

  test('pedido de um usuário não é visível para outro', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Troca de usuário pelo menu do cabeçalho desktop.')
    await readyToPay(page)
    await connectWallet(page)
    await review(page)
    await confirm(page).click()
    await expect(page).toHaveURL(/\/orders\/ord_/)
    const url = page.url()

    await page.getByRole('button', { name: 'Menu da conta de Ana Souza' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
    await loginAs(page, USERS.bruno)
    await page.goto(url)
    await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
  })
})

test.describe('carteiras', () => {
  test('cadastro valida campos, salva e persiste após refresh', async ({ page }) => {
    await loginAs(page, USERS.bruno, '/account/wallets')
    await page.getByRole('button', { name: 'Adicionar' }).first().click()
    const form = page.getByRole('form', { name: 'Carteira principal' })
    await form.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0x123')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()

    await expect(form.getByText('Informe o nome de exibição.')).toBeVisible()
    await expect(form.getByText('Use um endereço 0x com 40 caracteres hexadecimais.')).toBeVisible()
    await expect(form.getByText('Selecione uma rede.')).toBeVisible()

    await form.getByRole('textbox', { name: 'Nome de exibição' }).fill('Bruno Lima')
    await form.getByRole('textbox', { name: 'Apelido da carteira' }).fill('Principal')
    await form.getByRole('combobox', { name: 'Rede' }).selectOption('polygon')
    await form.getByRole('textbox', { name: 'Nome do perfil' }).fill('bruno.nft')
    await form.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0x' + 'b'.repeat(40))
    await form.getByRole('combobox', { name: 'Tipo de carteira' }).selectOption('walletconnect')
    await form.getByRole('textbox', { name: 'Código de indicação' }).fill('BRUNO26')
    await form.getByRole('textbox', { name: 'E-mail', exact: true }).fill('bruno@kurio.dev')
    await form.getByRole('textbox', { name: 'Nome ENS' }).fill('bruno')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira principal salva.')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('form', { name: 'Carteira principal' }).getByRole('textbox', { name: 'Endereço da carteira' })).toHaveValue(
      '0x' + 'b'.repeat(40),
    )
  })

  test('carteira secundária com o mesmo endereço da principal gera conflito', async ({ page }) => {
    await loginAs(page, USERS.ana, '/account/wallets')
    const form = page.getByRole('form', { name: 'Carteira secundária' })
    await form.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0xA91F3c5d7e2b4a8f9c0d1e2f3a4b5c6d7e8fE82C')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(form.getByText('Este endereço já está cadastrado na outra carteira.')).toBeVisible()
  })
})
