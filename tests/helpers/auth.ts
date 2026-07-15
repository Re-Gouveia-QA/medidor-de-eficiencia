import request from 'supertest';
import type { Express } from 'express';
import { vi } from 'vitest';
import { UserModel } from '../../src/models/UserModel';

/** Usuário autenticado usado como padrão nos testes de rota. */
export const TEST_USER = { id: 'user-1', nome: 'Demo', email: 'demo@medidor.dev' };

/**
 * Faz login via POST /login (mockando UserModel) e retorna um agent do supertest
 * já autenticado, reutilizável para requisições subsequentes às rotas privadas.
 */
export async function loginAgent(app: Express, options: { isAdmin?: boolean } = {}) {
  vi.mocked(UserModel.findByEmail).mockResolvedValueOnce({
    id: TEST_USER.id,
    nome: TEST_USER.nome,
    email: TEST_USER.email,
    senhaHash: 'hash-fake',
    googleId: null,
    isAdmin: options.isAdmin ?? false,
    criadoEm: new Date(),
  } as never);
  vi.mocked(UserModel.verifyPassword).mockResolvedValueOnce(true);

  const agent = request.agent(app);
  await agent.post('/login').type('form').send({ email: TEST_USER.email, senha: 'senha12345' });
  return agent;
}
