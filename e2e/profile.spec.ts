import { expect, test, type Page } from '@playwright/test'

import { loginAs, submitLogin, USERS } from './support'

/** 1×1 PNG. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const form = (page: Page) => page.getByRole('form', { name: 'Perfil do colecionador' })
const field = (page: Page, name: string) => form(page).getByRole('textbox', { name, exact: true })
const save = (page: Page) => form(page).getByRole('button', { name: 'Salvar' })

async function openProfile(page: Page, user = USERS.ana) {
  await loginAs(page, user, '/account/profile')
  await expect(field(page, 'Nome de exibição')).toHaveValue(user.name)
}

test.describe('perfil do colecionador', () => {
  test('edição dos dados persiste após refresh e atualiza o cabeçalho', async ({ page, isMobile }) => {
    await openProfile(page)
    await field(page, 'Nome de exibição').fill('Ana S. Souza')
    await field(page, 'Nome de usuário').fill('ana.souza')
    await field(page, 'Apelido da carteira').fill('Cofre')
    await save(page).click()
    await expect(page.getByText('Perfil atualizado.')).toBeVisible()

    if (!isMobile) {
      await expect(page.getByRole('button', { name: 'Menu da conta de Ana S. Souza' })).toContainText('ana.souza')
    }
    await page.reload()
    await expect(field(page, 'Nome de usuário')).toHaveValue('ana.souza')
    await expect(field(page, 'Apelido da carteira')).toHaveValue('Cofre')
  })

  test('validação e conflito de nome de usuário vindo da API', async ({ page }) => {
    await openProfile(page)
    await field(page, 'Nome de exibição').fill('')
    await field(page, 'E-mail').fill('sem-arroba')
    await save(page).click()
    await expect(field(page, 'Nome de exibição')).toBeFocused()
    await expect(page.getByText('Informe o nome de exibição.')).toBeVisible()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()

    await field(page, 'Nome de exibição').fill('Ana Souza')
    await field(page, 'E-mail').fill('ana@kurio.dev')
    await field(page, 'Nome de usuário').fill(USERS.bruno.username)
    await save(page).click()
    await expect(page.getByText('Este nome de usuário já está em uso.')).toBeVisible()
    await expect(field(page, 'Nome de usuário')).toHaveAttribute('aria-invalid', 'true')
  })

  test('alteração de senha valida a senha atual e passa a valer no login', async ({ page, isMobile }) => {
    await openProfile(page)
    const current = form(page).getByLabel('Senha atual', { exact: true })
    const next = form(page).getByLabel('Nova senha', { exact: true })
    const confirm = form(page).getByLabel('Confirmar nova senha', { exact: true })

    await next.fill('NovaSenha2026')
    await confirm.fill('Outra2026')
    await save(page).click()
    await expect(page.getByText('Informe sua senha atual.')).toBeVisible()
    await expect(page.getByText('As senhas não conferem.')).toBeVisible()

    await current.fill('Errada123')
    await confirm.fill('NovaSenha2026')
    await save(page).click()
    await expect(page.getByText('Senha atual incorreta.')).toBeVisible()

    await current.fill(USERS.ana.password)
    await save(page).click()
    await expect(page.getByText('Senha alterada.')).toBeVisible()
    await expect(current).toHaveValue('')

    test.skip(isMobile, 'Logout pelo menu do cabeçalho desktop.')
    await page.getByRole('button', { name: 'Menu da conta de Ana Souza' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
    await page.goto('/login')
    await submitLogin(page, USERS.ana.email, USERS.ana.password)
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
    await submitLogin(page, USERS.ana.email, 'NovaSenha2026')
    await expect(page.getByText('Bem-vindo de volta, Ana Souza!')).toBeVisible()
  })

  test('avatar: envio, arquivo inválido e remoção', async ({ page }) => {
    await openProfile(page)
    const input = page.getByTestId('avatar-input')

    await input.setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('oi') })
    await expect(page.getByRole('alert').filter({ hasText: 'Use uma imagem PNG, JPG ou WEBP.' })).toBeVisible()

    await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByText('Avatar atualizado.')).toBeVisible()
    await expect(page.getByRole('img', { name: 'Avatar de Ana Souza' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('img', { name: 'Avatar de Ana Souza' })).toBeVisible()

    await page.getByRole('button', { name: 'Remover avatar' }).click()
    await expect(page.getByText('Avatar removido.')).toBeVisible()
    await expect(page.getByRole('img', { name: 'Sem avatar' })).toBeVisible()
  })

  test('lista de interesse mostra os favoritos do usuário', async ({ page }) => {
    await loginAs(page, USERS.ana, '/account/favorites')
    await expect(page.getByText('Você ainda não favoritou nenhum NFT.')).toBeVisible()

    await page.goto('/nfts/emerald-ape-042')
    await page.getByRole('button', { name: 'Favoritar Emerald Ape #042' }).filter({ visible: true }).click()
    await expect(page.getByText('Emerald Ape #042 adicionado aos favoritos.')).toBeVisible()

    await page.goto('/account/favorites')
    await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
  })
})
