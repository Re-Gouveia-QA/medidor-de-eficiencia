import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { ActivityModel } from '../../src/models/ActivityModel';
import { CategoryModel } from '../../src/models/CategoryModel';
import { loginAgent } from '../helpers/auth';

vi.mock('../../src/models/UserModel');
vi.mock('../../src/models/ActivityModel');
vi.mock('../../src/models/CategoryModel');

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
