import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createTestUser, login, disconnectPrisma } from './helpers/auth';

// Cliente próprio só pra seedar o cenário de "categoria com atividade vinculada" (regra 7) direto
// no banco — mais rápido/focado que passar pelo formulário de atividade, que já tem sua própria
// suíte E2E (e2e/activities.spec.ts).
const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
  await disconnectPrisma();
});

async function createCategory(
  page: Page,
  options: { nome: string; cor?: string; possuiValor?: boolean; valorLabel?: string; valorPadrao?: string },
) {
  await page.goto('/categories/new');
  await page.locator('#nome').fill(options.nome);
  await page.locator('#cor').fill(options.cor ?? '#2563eb');
  if (options.possuiValor) {
    // O checkbox nativo fica visualmente escondido atrás de .check-box (span decorativo
    // sketch-edge que representa o visual) — precisa de force, senão o Playwright considera o
    // elemento "coberto" e nunca conclui a ação.
    await page.locator('#possuiValor').check({ force: true });
    if (options.valorLabel) await page.locator('#valorLabel').fill(options.valorLabel);
    if (options.valorPadrao) await page.locator('#valorPadrao').fill(options.valorPadrao);
  }
  await page.locator('form.category-form button[type="submit"]').click();
  await page.waitForURL('/categories');
}

function cardFor(page: Page, nome: string) {
  return page.locator('.card', { has: page.locator('.card-title', { hasText: nome }) });
}

test('Dado um usuário autenticado, quando cria uma categoria, então ela aparece na listagem', async ({ page }) => {
  const user = await createTestUser();
  await login(page, user);

  await createCategory(page, { nome: 'Trabalho E2E' });

  await expect(cardFor(page, 'Trabalho E2E')).toBeVisible();
});

test('Dado uma categoria existente, quando edita o nome, então a listagem reflete a mudança', async ({ page }) => {
  const user = await createTestUser();
  await login(page, user);
  await createCategory(page, { nome: 'Nome Antigo E2E' });

  await cardFor(page, 'Nome Antigo E2E').locator('a[href*="/edit"]').click();
  await page.locator('#nome').fill('Nome Novo E2E');
  await page.locator('form.category-form button[type="submit"]').click();

  await expect(page).toHaveURL('/categories');
  await expect(cardFor(page, 'Nome Novo E2E')).toBeVisible();
  await expect(page.locator('.card-title', { hasText: 'Nome Antigo E2E' })).toHaveCount(0);
});

test('Dado uma categoria com valor numérico habilitado, quando é criada, então a listagem mostra o rótulo de valor (regra 9)', async ({
  page,
}) => {
  const user = await createTestUser();
  await login(page, user);

  await createCategory(page, {
    nome: 'Deslocamento E2E',
    possuiValor: true,
    valorLabel: 'Custo da passagem',
    valorPadrao: '4.40',
  });

  await expect(cardFor(page, 'Deslocamento E2E').locator('.badge-yellow')).toContainText('Custo da passagem');
});

test('Dado uma categoria com atividade vinculada, quando tenta excluir, então é bloqueada com mensagem de erro (regra 7)', async ({
  page,
}) => {
  const user = await createTestUser();
  await login(page, user);
  await createCategory(page, { nome: 'Com Atividade E2E' });

  const categoria = await prisma.category.findFirstOrThrow({ where: { userId: user.id, nome: 'Com Atividade E2E' } });
  await prisma.activity.create({
    data: {
      userId: user.id,
      categoryId: categoria.id,
      nome: 'Atividade vinculada',
      data: new Date('2026-07-20T00:00:00Z'),
      horaInicio: new Date('2026-07-20T08:00:00Z'),
      horaFim: new Date('2026-07-20T09:00:00Z'),
      duracaoMin: 60,
    },
  });

  await page.goto('/categories');
  await cardFor(page, 'Com Atividade E2E').locator('form.js-confirm-submit button[type="submit"]').click();
  await page.locator('.confirm-toast-confirm').click();

  await expect(page).toHaveURL('/categories');
  await expect(page.locator('.alert-error')).toBeVisible();
  await expect(cardFor(page, 'Com Atividade E2E')).toBeVisible();
});

test('Dado uma categoria sem atividades vinculadas, quando exclui, então some da listagem', async ({ page }) => {
  const user = await createTestUser();
  await login(page, user);
  await createCategory(page, { nome: 'Sem Atividade E2E' });

  await cardFor(page, 'Sem Atividade E2E').locator('form.js-confirm-submit button[type="submit"]').click();
  await page.locator('.confirm-toast-confirm').click();

  await expect(page).toHaveURL('/categories');
  await expect(page.locator('.card-title', { hasText: 'Sem Atividade E2E' })).toHaveCount(0);
});
