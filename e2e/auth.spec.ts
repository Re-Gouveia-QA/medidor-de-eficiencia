import { test, expect } from '@playwright/test';
import { createTestUser, login, disconnectPrisma } from './helpers/auth';

test.afterAll(async () => {
  await disconnectPrisma();
});

test('Dado um usuário cadastrado, quando faz login com credenciais válidas, então chega na home', async ({ page }) => {
  const user = await createTestUser();

  await login(page, user);

  await expect(page).toHaveURL('/');
});

test('Dado um usuário cadastrado, quando faz login com senha errada, então vê mensagem de erro e continua em /login', async ({
  page,
}) => {
  const user = await createTestUser();

  await page.goto('/login');
  await page.locator('#email').fill(user.email);
  await page.locator('#senha').fill('senha-errada');
  await page.locator('form[action="/login"] button[type="submit"]').click();

  await expect(page).toHaveURL('/login');
  await expect(page.locator('.alert-error')).toBeVisible();
});

test('Dado um visitante não autenticado, quando acessa /activities, então é redirecionado para /login', async ({ page }) => {
  await page.goto('/activities');

  await expect(page).toHaveURL('/login');
});

test('Dado um usuário autenticado, quando clica em sair, então a sessão encerra e rotas privadas voltam a exigir login', async ({
  page,
}) => {
  const user = await createTestUser();
  await login(page, user);

  await page.locator('form[action="/logout"] button[type="submit"]').click();
  await expect(page).toHaveURL('/login');

  await page.goto('/activities');
  await expect(page).toHaveURL('/login');
});
