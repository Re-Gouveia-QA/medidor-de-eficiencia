import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { loginAgent } from '../helpers/auth';

vi.mock('../../src/models/UserModel');

describe('GET /docs — restrito a administradores (regra 11)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('redireciona para / com mensagem de erro quando o usuário autenticado não é administrador', async () => {
    const agent = await loginAgent(app, { isAdmin: false });

    const res = await agent.get('/docs');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  it('permite acesso quando o usuário autenticado é administrador', async () => {
    const agent = await loginAgent(app, { isAdmin: true });

    const res = await agent.get('/docs');
    expect([200, 301]).toContain(res.status);
  });
});
