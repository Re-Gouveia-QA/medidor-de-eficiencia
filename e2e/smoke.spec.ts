import { test, expect } from '@playwright/test';
import { createTestUser, login, disconnectPrisma } from './helpers/auth';

test.afterAll(async () => {
  await disconnectPrisma();
});

test('GET /login carrega com o título correto', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/Sketch your time/);
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#senha')).toBeVisible();
});

test('login com um usuário criado direto no banco "_e2e" autentica e chega na home', async ({ page }) => {
  const user = await createTestUser();

  await login(page, user);

  await expect(page).toHaveURL('/');
});
