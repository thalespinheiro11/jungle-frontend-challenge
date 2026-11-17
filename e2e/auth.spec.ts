import { expect, test } from '@playwright/test'

import { loginAs, mocksReady, submitLogin, USERS } from './support'

test.describe('conta e sessão', () => {
  test('login válido volta para a rota privada que pediu login', async ({ page }) => {
    await page.goto('/account/wallets')
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fwallets/)

    await submitLogin(page, USERS.ana.email, USERS.ana.password)

    await expect(page).toHaveURL(/\/account\/wallets$/)
    await expect(page.getByText('Bem-vindo de volta, Ana Souza!')).toBeVisible()
  })

  test('credenciais inválidas mostram erro sem revelar qual campo', async ({ page }) => {
    await page.goto('/login')
    await submitLogin(page, USERS.ana.email, 'SenhaErrada1')
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
    await expect(page).toHaveURL(/\/login/)
  })

  test('validação do login aponta campos e associa as mensagens', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    const email = page.getByRole('textbox', { name: 'E-mail' })
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toHaveAccessibleDescription(/Informe seu e-mail/)
    await expect(email).toBeFocused()
  })

  test('cadastro valida campos e trata conflito de e-mail e usuário', async ({ page }) => {
    await page.goto('/signup')
    await page.getByPlaceholder('Nome de usuário').fill('ab')
    await page.getByPlaceholder('Digite seu e-mail').fill('invalido')
    await page.getByPlaceholder('Senha', { exact: true }).fill('curta')
    await page.getByPlaceholder('Confirmar senha').fill('diferente')
    await page.getByRole('button', { name: /Criar (conta|perfil)/ }).click()

    await expect(page.getByText('O nome de usuário precisa ter ao menos 3 caracteres.')).toBeVisible()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(page.getByText('A senha precisa ter ao menos 8 caracteres.')).toBeVisible()
    await expect(page.getByText('As senhas não conferem.')).toBeVisible()

    // Conflict comes from the API (409) and is mapped onto the fields.
    await page.getByPlaceholder('Nome de usuário').fill(USERS.bruno.username)
    await page.getByPlaceholder('Digite seu e-mail').fill(USERS.ana.email)
    await page.getByPlaceholder('Senha', { exact: true }).fill('NovaSenha123')
    await page.getByPlaceholder('Confirmar senha').fill('NovaSenha123')
    await page.getByRole('button', { name: /Criar (conta|perfil)/ }).click()

    await expect(page.getByText('Este e-mail já está cadastrado.')).toBeVisible()
    await expect(page.getByText('Este nome de usuário já está em uso.')).toBeVisible()
  })

  test('cadastro cria a conta, autentica e sobrevive ao refresh', async ({ page }) => {
    await page.goto('/signup')
    await page.getByPlaceholder('Nome de usuário').fill('carla.art')
    await page.getByPlaceholder('Digite seu e-mail').fill('carla@kurio.dev')
    await page.getByPlaceholder('Senha', { exact: true }).fill('Colecao2026')
    await page.getByPlaceholder('Confirmar senha').fill('Colecao2026')
    await page.getByRole('button', { name: /Criar (conta|perfil)/ }).click()

    await expect(page.getByText('Conta criada! Boas-vindas à Kurio.')).toBeVisible()
    await page.goto('/account/profile')
    await page.reload()
    await expect(page).toHaveURL(/\/account\/profile/)
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  })

  test('sessão expirada durante a navegação leva ao login e retoma o destino', async ({ page }) => {
    await loginAs(page, USERS.ana)
    await page.goto('/account/profile')
    await mocksReady(page)
    await page.evaluate(() => window.__mocks!.expireSessions())

    await page.goto('/account/wallets')

    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fwallets/)
    await submitLogin(page, USERS.ana.email, USERS.ana.password)
    await expect(page).toHaveURL(/\/account\/wallets$/)
  })

  test('expiração com a página aberta encerra a sessão e pede novo login', async ({ page }) => {
    await page.clock.install()
    await loginAs(page, USERS.ana, '/account/profile')
    await expect(page).toHaveURL(/\/account\/profile$/)

    // 30 min session TTL; jump past it without waiting.
    await page.clock.fastForward('31:00')

    await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar.')).toBeVisible()
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fprofile&reason=expired/)
  })

  test('logout e troca de usuário não deixam dados do anterior', async ({ page, isMobile }) => {
    test.skip(isMobile, 'O menu da conta fica no cabeçalho desktop.')
    await loginAs(page, USERS.ana)
    await page.getByRole('button', { name: 'Menu da conta de Ana Souza' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()

    await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kurio:access-token'))).toBeNull()

    await loginAs(page, USERS.bruno)
    await expect(page.getByRole('button', { name: 'Menu da conta de Bruno Lima' })).toBeVisible()
    await expect(page.getByText('ana.colecionadora')).toHaveCount(0)
  })

  test('modal de login prende o foco e fecha com Esc', async ({ page, isMobile }) => {
    test.skip(isMobile, 'No mobile o login é página, não modal.')
    await page.goto('/login')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/$/)
  })
})
