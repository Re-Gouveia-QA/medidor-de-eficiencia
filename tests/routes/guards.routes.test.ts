import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

describe('requireAuth — proteção de rotas privadas (RNF02)', () => {
  const app = createApp();

  // "/" não entra aqui: desde a Fase 1 do plano de landing page, é pública pra visitante sem
  // sessão (mostra a home explicativa em vez de redirecionar) — ver
  // tests/routes/home.routes.test.ts pro comportamento detalhado dela.
  const rotasProtegidas = [
    '/activities',
    '/activities/new',
    '/categories',
    '/categories/new',
    '/reports',
    '/docs',
  ];

  it.each(rotasProtegidas)('GET %s redireciona para /login quando não autenticado', async (rota) => {
    const res = await request(app).get(rota);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  it('POST /logout redireciona para /login quando não autenticado', async () => {
    const res = await request(app).post('/logout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});
