import { expect, test, type Page } from '@playwright/test'

/** Filters live in the sidebar on desktop and in a drawer on mobile. */
async function openFilters(page: Page, isMobile: boolean) {
  if (!isMobile) return page.getByRole('complementary', { name: 'Filtros' })
  await page.getByRole('button', { name: /^Filtros/ }).click()
  const drawer = page.getByRole('dialog', { name: 'Filtros' })
  await expect(drawer).toBeVisible()
  return drawer
}

test.describe('início', () => {
  test('carrossel de destaques troca pelos indicadores, sem rotação automática', async ({ page }) => {
    await page.goto('/')
    const hero = page.getByRole('region', { name: 'Destaques da Kurio' })
    await expect(hero.getByRole('heading', { name: /seja dono do futuro/i })).toBeVisible()

    await hero.getByRole('button', { name: 'Destaque 2 de 3' }).click()
    await expect(hero.getByRole('heading', { name: /edições gênesis/i })).toBeVisible()
    await expect(hero.getByRole('button', { name: 'Destaque 2 de 3' })).toHaveAttribute('aria-current', 'true')

    // Nothing moves on its own.
    await page.waitForTimeout(1500)
    await expect(hero.getByRole('heading', { name: /edições gênesis/i })).toBeVisible()
  })

  test('faixa de preço por teclado filtra o catálogo e vai para a URL', async ({ page, isMobile }) => {
    await page.goto('/')
    const filters = await openFilters(page, isMobile)
    const max = filters.getByRole('slider', { name: 'Preço máximo' })
    await max.focus()
    // PageDown = 0.10 ETH (stops before crossing the minimum thumb); ArrowLeft = 0.01 ETH.
    for (let i = 0; i < 125; i++) await page.keyboard.press('PageDown')
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft')
    await expect(filters.getByText('Preço: 0,02 - 0,03 ETH')).toBeVisible()
    await expect(max).toHaveAttribute('aria-valuetext', '0,03 ETH')
    await filters.getByRole('button', { name: 'Aplicar' }).click()

    await expect(page).toHaveURL(/maxPrice=0\.03/)
    if (isMobile) await page.getByRole('button', { name: 'Ver 1 resultados' }).click()
    await expect(page.getByRole('link', { name: /Topaz Rhythm #090/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toHaveCount(0)
  })

  test('filtros no mobile ficam em uma gaveta com foco preso e contador', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Gaveta só existe no mobile.')
    await page.goto('/')
    const drawer = await openFilters(page, true)
    await drawer.getByRole('button', { name: 'Ethereum' }).click()
    await expect(drawer.getByRole('button', { name: 'Ethereum' })).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(page).toHaveURL(/network=ethereum/)
    await expect(page.getByRole('button', { name: 'Filtros (1 ativos)' })).toBeVisible()
  })

  test('selo de raridade e NFT em destaque', async ({ page, isMobile }) => {
    await page.goto('/')
    const emerald = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: /Emerald Ape #042/ }) })
    await expect(emerald.getByText('RARO')).toBeVisible()
    test.skip(isMobile, 'O card de destaque fica na barra lateral do desktop.')
    const featured = page.getByRole('region', { name: /NFT em destaque/i })
    await expect(featured.getByRole('link', { name: /Sage Nomad #009/ })).toBeVisible()
  })

  test('diário e rodapé sinalizam o que está fora do escopo', async ({ page }) => {
    await page.goto('/')
    const journal = page.getByRole('region', { name: 'Diário da Cunhagem' })
    await expect(journal.getByRole('link')).toHaveCount(0)
    await expect(journal.getByText('(em breve)').first()).toBeVisible()

    const footer = page.getByRole('contentinfo')
    await expect(footer.getByRole('link', { name: 'Lista de interesse' })).toHaveAttribute('href', '/account/favorites')
    await expect(footer.getByText('Central de ajuda (em breve)', { exact: false }).first()).toBeAttached()
  })

  test('newsletter valida, inscreve e trata e-mail repetido', async ({ page }) => {
    await page.goto('/')
    const email = page.getByRole('textbox', { name: 'Seu e-mail' })
    const send = page.getByRole('button', { name: 'Enviar' })

    await email.fill('invalido')
    await send.click()
    await expect(page.getByRole('alert').filter({ hasText: 'Informe um e-mail válido.' })).toBeVisible()
    await expect(email).toHaveAttribute('aria-invalid', 'true')

    await email.fill('colecionador@kurio.dev')
    await send.click()
    await expect(page.getByText('Inscrição confirmada. Obrigado!')).toBeVisible()

    await email.fill('colecionador@kurio.dev')
    await send.click()
    await expect(page.getByRole('alert').filter({ hasText: 'Este e-mail já está inscrito.' })).toBeVisible()
  })
})
