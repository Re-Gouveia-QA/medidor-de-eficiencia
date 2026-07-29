import { test, expect } from '@playwright/test';
import { createTestUser, login, disconnectPrisma } from './helpers/auth';

test.afterAll(async () => {
  await disconnectPrisma();
});

test('Dado um usuário autenticado, quando alterna pro tema escuro, então persiste após reload (cookie "theme")', async ({
  page,
}) => {
  const user = await createTestUser();
  await login(page, user);

  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');

  await page.locator('#themeToggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  const cookies = await page.context().cookies();
  const themeCookie = cookies.find((c) => c.name === 'theme');
  expect(themeCookie?.value).toBe('dark');
});

test('Dado um usuário no tema escuro, quando alterna de volta, então volta ao tema claro e persiste', async ({ page }) => {
  const user = await createTestUser();
  await login(page, user);

  await page.locator('#themeToggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.locator('#themeToggle').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
});
