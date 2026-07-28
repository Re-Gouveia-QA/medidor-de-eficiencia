import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { ActivityModel } from '../../src/models/ActivityModel';
import { CategoryModel } from '../../src/models/CategoryModel';
import { loginAgent } from '../helpers/auth';

vi.mock('../../src/models/UserModel');
vi.mock('../../src/models/ActivityModel');
vi.mock('../../src/models/CategoryModel');

describe('GET / (home pública x dashboard — plano de landing page)', () => {
  const app = createApp();

  it('sem sessão, renderiza a home pública (landing) com hero e CTAs em pt-BR', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<html lang="pt-BR"');
    expect(res.text).toContain('Anote. Nós rascunhamos');
    expect(res.text).toContain('as métricas =D');
    expect(res.text).toContain('href="/register"');
    expect(res.text).toContain('Criar conta grátis');
    expect(res.text).toContain('href="/login"');
    expect(res.text).toContain('Já tenho conta');
    // Não é o dashboard autenticado — não deve trazer texto que só existe pra quem está logado.
    expect(res.text).not.toContain('O que você quer fazer agora?');
  });

  it('sem sessão, com cookie "locale=en-US", renderiza a landing em inglês', async () => {
    const res = await request(app).get('/').set('Cookie', 'locale=en-US');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<html lang="en-US"');
    expect(res.text).toContain('Jot it down. We sketch');
    expect(res.text).toContain('the metrics =D');
    expect(res.text).toContain('Create free account');
    expect(res.text).toContain('Log in');
    expect(res.text).toContain('Create account');
  });

  it('com sessão, continua renderizando o dashboard normal (comportamento inalterado)', async () => {
    const agent = await loginAgent(app);
    vi.mocked(ActivityModel.findInProgress).mockResolvedValue(null);
    vi.mocked(CategoryModel.listByUser).mockResolvedValue([]);
    const res = await agent.get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('O que você quer fazer agora?');
  });
});

describe('GET / (i18n Fase 0 — RNF04)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(ActivityModel.findInProgress).mockResolvedValue(null);
    vi.mocked(CategoryModel.listByUser).mockResolvedValue([]);
  });

  it('sem cookie "locale", renderiza em pt-BR (idioma padrão)', async () => {
    const agent = await loginAgent(app);
    const res = await agent.get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<html lang="pt-BR"');
    expect(res.text).toContain('O que você quer fazer agora?');
  });

  it('com cookie "locale=en-US", renderiza em inglês', async () => {
    const agent = await loginAgent(app);
    const res = await agent.get('/').set('Cookie', 'locale=en-US');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<html lang="en-US"');
    expect(res.text).toContain('What do you want to do now?');
    expect(res.text).toContain('Welcome back,');
  });

  it('cookie "locale" com valor inválido cai pro padrão pt-BR', async () => {
    const agent = await loginAgent(app);
    const res = await agent.get('/').set('Cookie', 'locale=fr-FR');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<html lang="pt-BR"');
  });
});
