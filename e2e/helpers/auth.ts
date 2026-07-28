import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { Page } from '@playwright/test';

// Cliente próprio (não importa src/config/database.ts) porque o processo de teste roda fora do
// app — pega o DATABASE_URL do ambiente do próprio processo do Playwright (carregado de
// .env.test em playwright.config.ts/global-setup.ts).
const prisma = new PrismaClient();

export interface E2ETestUser {
  id: string;
  nome: string;
  email: string;
  senha: string;
}

let sequencia = 0;

/** Cria um usuário direto no banco "_e2e" (bcrypt de verdade) — cada teste tem o seu, não reaproveita o seed de dev. */
export async function createTestUser(overrides: Partial<{ nome: string; email: string; senha: string }> = {}): Promise<E2ETestUser> {
  sequencia += 1;
  const senha = overrides.senha ?? 'senha12345';
  const nome = overrides.nome ?? 'Usuário E2E';
  const email = overrides.email ?? `e2e-${Date.now()}-${sequencia}@example.com`;

  const senhaHash = await bcrypt.hash(senha, 10);
  const user = await prisma.user.create({ data: { nome, email, senhaHash } });

  return { id: user.id, nome, email, senha };
}

/** Preenche e envia o formulário de /login (ids, não texto traduzido — independe do idioma da UI). */
export async function login(page: Page, user: E2ETestUser) {
  await page.goto('/login');
  await page.locator('#email').fill(user.email);
  await page.locator('#senha').fill(user.senha);
  await page.locator('form[action="/login"] button[type="submit"]').click();
  await page.waitForURL('/');
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
