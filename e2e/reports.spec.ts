import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createTestUser, login, disconnectPrisma, type E2ETestUser } from './helpers/auth';

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
  await disconnectPrisma();
});

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function seedActivity(
  user: E2ETestUser,
  categoryId: string,
  options: { nome: string; dataISO: string; horaInicio: string; horaFim: string; duracaoMin: number },
) {
  return prisma.activity.create({
    data: {
      userId: user.id,
      categoryId,
      nome: options.nome,
      data: new Date(`${options.dataISO}T00:00:00Z`),
      horaInicio: new Date(`${options.dataISO}T${options.horaInicio}:00Z`),
      horaFim: new Date(`${options.dataISO}T${options.horaFim}:00Z`),
      duracaoMin: options.duracaoMin,
    },
  });
}

test('Dado um usuário sem atividades registradas, quando acessa /reports sem filtro, então mostra o período do mês corrente (regra 7)', async ({
  page,
}) => {
  const user = await createTestUser();
  await login(page, user);

  await page.goto('/reports');

  const now = new Date();
  const inicioEsperado = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const fimEsperado = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  await expect(page.locator('#inicio')).toHaveValue(isoDate(inicioEsperado));
  await expect(page.locator('#fim')).toHaveValue(isoDate(fimEsperado));
  await expect(page.locator('.report-big').first()).toContainText('0/');
});

test('Dado atividades em datas diferentes, quando aplica um filtro de período, então recalcula dias/horas/categoria', async ({
  page,
}) => {
  const user = await createTestUser();
  await login(page, user);

  const categoria = await prisma.category.create({
    data: { userId: user.id, nome: 'Trabalho E2E', cor: '#2563eb' },
  });
  await seedActivity(user, categoria.id, {
    nome: 'Fora do filtro',
    dataISO: '2026-01-10',
    horaInicio: '08:00',
    horaFim: '09:00',
    duracaoMin: 60,
  });
  await seedActivity(user, categoria.id, {
    nome: 'Dentro do filtro',
    dataISO: '2026-01-20',
    horaInicio: '08:00',
    horaFim: '10:00',
    duracaoMin: 120,
  });

  await page.goto('/reports');
  await page.locator('#inicio').fill('2026-01-15');
  await page.locator('#fim').fill('2026-01-25');
  await page.locator('form[action="/reports"] button[type="submit"]').click();

  await expect(page).toHaveURL(/inicio=2026-01-15/);
  await expect(page.locator('.report-big').first()).toContainText('1/');
  await expect(page.locator('.report-big').nth(1)).toHaveText('2h');
  await expect(page.locator('.bar-label', { hasText: 'Trabalho E2E' })).toContainText('2h');
});
