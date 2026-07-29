import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createTestUser, login, disconnectPrisma, type E2ETestUser } from './helpers/auth';

// Categorias são seedadas direto no banco (não pela UI) — a criação de categoria já tem sua
// própria suíte em e2e/categories.spec.ts; aqui o que está sob teste é o fluxo de atividades.
const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
  await disconnectPrisma();
});

async function createCategoryDirect(
  user: E2ETestUser,
  options: { nome: string; possuiValor?: boolean; valorLabel?: string },
) {
  return prisma.category.create({
    data: {
      userId: user.id,
      nome: options.nome,
      cor: '#2563eb',
      possuiValor: options.possuiValor ?? false,
      valorLabel: options.valorLabel,
    },
  });
}

function itemFor(page: Page, nome: string) {
  return page.locator('.list-item', { has: page.locator('strong', { hasText: nome }) });
}

test('Dado um usuário autenticado com uma categoria, quando registra uma atividade com valor e descrição, então o card fica compacto e o modal mostra os detalhes completos com o valor por último', async ({
  page,
}) => {
  const user = await createTestUser();
  const categoria = await createCategoryDirect(user, {
    nome: 'Deslocamento E2E',
    possuiValor: true,
    valorLabel: 'Custo da passagem',
  });
  await login(page, user);

  await page.goto('/activities/new');
  await page.locator('#nome').fill('Ônibus pro trabalho E2E');
  await page.locator('#categoryId').selectOption({ label: categoria.nome });
  await page.locator('#data').fill('2026-07-15');
  await page.locator('#horaInicio').fill('08:00');
  await page.locator('#horaFim').fill('08:30');
  await page.locator('#valor').fill('4.4');
  await page.locator('#descricao').fill('Passagem de ônibus até o escritório');
  await page.locator('form#activityForm button[type="submit"]').click();

  await expect(page).toHaveURL('/activities');

  const item = itemFor(page, 'Ônibus pro trabalho E2E');
  await expect(item).toBeVisible();
  // Card compacto: valor/descrição não aparecem inline (só dentro do modal).
  await expect(item).not.toContainText('Custo da passagem');
  await expect(item).not.toContainText('Passagem de ônibus até o escritório');

  await item.locator('.list-item-info').click();
  const modalBody = page.locator('.activity-detail-body');
  await expect(modalBody).toContainText('Passagem de ônibus até o escritório');
  await expect(modalBody).toContainText('Custo da passagem');

  const modalParagraphs = await modalBody.locator('p').allTextContents();
  const descricaoIndex = modalParagraphs.findIndex((t) => t.includes('Passagem de ônibus até o escritório'));
  const valorIndex = modalParagraphs.findIndex((t) => t.includes('Custo da passagem'));
  expect(descricaoIndex).toBeGreaterThanOrEqual(0);
  expect(valorIndex).toBeGreaterThan(descricaoIndex);

  await page.keyboard.press('Escape');
  await expect(page.locator('#activityDetailModal')).not.toHaveClass(/is-visible/);
  await expect(item.locator('.list-item-info')).toBeFocused();
});

test('Dado uma atividade existente, quando edita o nome, então a listagem reflete a mudança', async ({ page }) => {
  const user = await createTestUser();
  const categoria = await createCategoryDirect(user, { nome: 'Estudos E2E' });
  await login(page, user);

  await page.goto('/activities/new');
  await page.locator('#nome').fill('Nome Antigo Atividade E2E');
  await page.locator('#categoryId').selectOption({ label: categoria.nome });
  await page.locator('#data').fill('2026-07-15');
  await page.locator('#horaInicio').fill('09:00');
  await page.locator('#horaFim').fill('10:00');
  await page.locator('form#activityForm button[type="submit"]').click();
  await expect(page).toHaveURL('/activities');

  await page.locator('a[href*="/edit"]').first().click();
  await page.locator('#nome').fill('Nome Novo Atividade E2E');
  await page.locator('form#activityForm button[type="submit"]').click();

  await expect(page).toHaveURL('/activities');
  await expect(itemFor(page, 'Nome Novo Atividade E2E')).toBeVisible();
  await expect(page.locator('strong', { hasText: 'Nome Antigo Atividade E2E' })).toHaveCount(0);
});

test('Dado um usuário autenticado com uma categoria, quando inicia uma atividade, então ela aparece com o badge "em andamento"', async ({
  page,
}) => {
  const user = await createTestUser();
  await createCategoryDirect(user, { nome: 'Reuniões E2E' });
  await login(page, user);

  await page.locator('form[action="/activities/start"] input[name="nome"]').fill('Reunião de alinhamento E2E');
  await page.locator('form[action="/activities/start"] select[name="categoryId"]').selectOption({ label: 'Reuniões E2E' });
  await page.locator('form[action="/activities/start"] button[type="submit"]').click();

  await expect(page).toHaveURL('/');
  await expect(page.locator('.in-progress-card.is-live')).toBeVisible();
  await expect(page.locator('.in-progress-name')).toHaveText('Reunião de alinhamento E2E');

  await page.goto('/activities');
  await expect(itemFor(page, 'Reunião de alinhamento E2E').locator('.badge-blue')).toBeVisible();
});

test('Dado uma atividade em andamento, quando finaliza com detalhes (descrição + valor), então grava e aparece no modal (regra 9)', async ({
  page,
}) => {
  const user = await createTestUser();
  const categoria = await createCategoryDirect(user, {
    nome: 'Deslocamento Finish E2E',
    possuiValor: true,
    valorLabel: 'Custo da passagem',
  });
  await login(page, user);

  await page.locator('form[action="/activities/start"] input[name="nome"]').fill('Trajeto até a reunião E2E');
  await page.locator('form[action="/activities/start"] select[name="categoryId"]').selectOption({ label: categoria.nome });
  await page.locator('form[action="/activities/start"] button[type="submit"]').click();
  await expect(page).toHaveURL('/');

  await page.locator('.in-progress-details summary').click();
  await page.locator('.in-progress-details textarea#descricao').fill('Fui de carro até a reunião com o cliente');
  await page.locator('.in-progress-details input#valor').fill('12.5');
  await page.locator('.in-progress-card form button[type="submit"]').click();

  await expect(page).toHaveURL('/');
  await expect(page.locator('.in-progress-card.is-live')).toHaveCount(0);

  await page.goto('/activities');
  const item = itemFor(page, 'Trajeto até a reunião E2E');
  await item.locator('.list-item-info').click();

  const modalBody = page.locator('.activity-detail-body');
  await expect(modalBody).toContainText('Fui de carro até a reunião com o cliente');
  await expect(modalBody).toContainText('Custo da passagem');
  await expect(modalBody).toContainText('12,50');
});
