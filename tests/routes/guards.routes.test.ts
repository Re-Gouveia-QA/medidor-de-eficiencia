import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

describe('requireAuth — proteção de rotas privadas (RNF02)', () => {
  const app = createApp();

  const rotasProtegidas = [
    '/',
    '/activities',
    '/activities/new',
    '/categories',
    '/categories/new',
    '/reports',
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
