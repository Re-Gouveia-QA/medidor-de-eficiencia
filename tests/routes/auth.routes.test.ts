import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { UserModel } from '../../src/models/UserModel';
import { loginAgent, TEST_USER } from '../helpers/auth';

vi.mock('../../src/models/UserModel');

describe('Rotas de autenticação', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('GET /login retorna 200 para visitante não autenticado', async () => {
    const res = await request(app).get('/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Entrar');
  });

  it('GET /register retorna 200 para visitante não autenticado', async () => {
    const res = await request(app).get('/register');
    expect(res.status).toBe(200);
  });

  it('POST /login com e-mail inválido redireciona para /login com mensagem de erro', async () => {
    const res = await request(app).post('/login').type('form').send({ email: 'nao-e-email', senha: 'x' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
    expect(UserModel.findByEmail).not.toHaveBeenCalled();
  });

  it('POST /login com credenciais que não existem redireciona sem autenticar', async () => {
    vi.mocked(UserModel.findByEmail).mockResolvedValue(null);

    const res = await request(app).post('/login').type('form').send({ email: TEST_USER.email, senha: 'senhaerrada' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  it('POST /login com senha incorreta redireciona sem autenticar', async () => {
    vi.mocked(UserModel.findByEmail).mockResolvedValue({
      id: TEST_USER.id,
      nome: TEST_USER.nome,
      email: TEST_USER.email,
      senhaHash: 'hash-fake',
      googleId: null,
      criadoEm: new Date(),
    } as never);
    vi.mocked(UserModel.verifyPassword).mockResolvedValue(false);

    const res = await request(app).post('/login').type('form').send({ email: TEST_USER.email, senha: 'errada12345' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  it('POST /login com credenciais válidas autentica e redireciona para a home', async () => {
    const agent = await loginAgent(app);

    const home = await agent.get('/');
    expect(home.status).toBe(200);
  });

  it('rota de login redireciona usuário já autenticado para a home', async () => {
    const agent = await loginAgent(app);

    const res = await agent.get('/login');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  it('POST /register bloqueia e-mail já cadastrado', async () => {
    vi.mocked(UserModel.findByEmail).mockResolvedValue({
      id: TEST_USER.id,
      nome: TEST_USER.nome,
      email: TEST_USER.email,
      senhaHash: 'hash-fake',
      googleId: null,
      criadoEm: new Date(),
    } as never);

    const res = await request(app)
      .post('/register')
      .type('form')
      .send({ nome: 'Outro', email: TEST_USER.email, senha: 'senha12345' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/register');
    expect(UserModel.createLocal).not.toHaveBeenCalled();
  });

  it('POST /register com senha curta redireciona com erro (RNF01)', async () => {
    const res = await request(app)
      .post('/register')
      .type('form')
      .send({ nome: 'Fulano', email: 'novo@medidor.dev', senha: '123' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/register');
    expect(UserModel.createLocal).not.toHaveBeenCalled();
  });

  it('POST /register com dados válidos cria conta e autentica', async () => {
    vi.mocked(UserModel.findByEmail).mockResolvedValue(null);
    vi.mocked(UserModel.createLocal).mockResolvedValue({
      id: 'user-2',
      nome: 'Fulano',
      email: 'novo@medidor.dev',
      senhaHash: 'hash',
      googleId: null,
      criadoEm: new Date(),
    } as never);

    const agent = request.agent(app);
    const res = await agent
      .post('/register')
      .type('form')
      .send({ nome: 'Fulano', email: 'novo@medidor.dev', senha: 'senha12345' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');

    const home = await agent.get('/');
    expect(home.status).toBe(200);
  });

  it('GET /auth/google/callback retorna 501 (stub — Fase 5)', async () => {
    const res = await request(app).get('/auth/google/callback');
    expect(res.status).toBe(501);
  });

  it('POST /logout encerra a sessão e redireciona para /login', async () => {
    const agent = await loginAgent(app);

    const res = await agent.post('/logout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');

    const home = await agent.get('/');
    expect(home.status).toBe(302);
    expect(home.headers.location).toBe('/login');
  });
});
