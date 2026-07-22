import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { UserModel } from '../../src/models/UserModel';
import { PasswordResetTokenModel } from '../../src/models/PasswordResetTokenModel';
import { GoogleAuthService } from '../../src/services/GoogleAuthService';
import { EmailService } from '../../src/services/EmailService';
import { loginAgent, TEST_USER } from '../helpers/auth';

vi.mock('../../src/models/UserModel');
vi.mock('../../src/models/PasswordResetTokenModel');
vi.mock('../../src/services/GoogleAuthService');
vi.mock('../../src/services/EmailService');

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

  it('GET /auth/google redireciona ao consent screen do Google quando configurado (RF03)', async () => {
    vi.mocked(GoogleAuthService.isConfigured).mockReturnValue(true);
    vi.mocked(GoogleAuthService.getAuthUrl).mockImplementation((state) => `https://accounts.google.com/mock?state=${state}`);

    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^https:\/\/accounts\.google\.com\/mock\?state=/);
    expect(GoogleAuthService.getAuthUrl).toHaveBeenCalledWith(expect.any(String));
  });

  it('GET /auth/google redireciona para /login quando o Google não está configurado', async () => {
    vi.mocked(GoogleAuthService.isConfigured).mockReturnValue(false);

    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
    expect(GoogleAuthService.getAuthUrl).not.toHaveBeenCalled();
  });

  it('GET /auth/google/callback autentica e redireciona para a home quando o state confere (regra 3)', async () => {
    vi.mocked(GoogleAuthService.isConfigured).mockReturnValue(true);
    vi.mocked(GoogleAuthService.getAuthUrl).mockImplementation((state) => `https://accounts.google.com/mock?state=${state}`);
    vi.mocked(GoogleAuthService.handleCallback).mockResolvedValue({
      googleId: 'google-1',
      nome: 'Demo Google',
      email: 'demo@medidor.dev',
    });
    vi.mocked(UserModel.findOrCreateFromGoogle).mockResolvedValue({
      id: 'user-3',
      nome: 'Demo Google',
      email: 'demo@medidor.dev',
      senhaHash: null,
      googleId: 'google-1',
      criadoEm: new Date(),
    } as never);

    const agent = request.agent(app);
    await agent.get('/auth/google');
    const state = vi.mocked(GoogleAuthService.getAuthUrl).mock.calls[0][0];

    const res = await agent.get('/auth/google/callback').query({ code: 'auth-code', state });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    expect(GoogleAuthService.handleCallback).toHaveBeenCalledWith('auth-code');
    expect(UserModel.findOrCreateFromGoogle).toHaveBeenCalledWith('google-1', 'Demo Google', 'demo@medidor.dev');

    const home = await agent.get('/');
    expect(home.status).toBe(200);
  });

  it('GET /auth/google/callback com state divergente redireciona para /login sem autenticar (CSRF)', async () => {
    vi.mocked(GoogleAuthService.isConfigured).mockReturnValue(true);
    vi.mocked(GoogleAuthService.getAuthUrl).mockImplementation((state) => `https://accounts.google.com/mock?state=${state}`);

    const agent = request.agent(app);
    await agent.get('/auth/google');

    const res = await agent.get('/auth/google/callback').query({ code: 'auth-code', state: 'state-forjado' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
    expect(GoogleAuthService.handleCallback).not.toHaveBeenCalled();
  });

  it('GET /auth/google/callback sem fluxo iniciado (sem state na sessão) redireciona para /login', async () => {
    const res = await request(app).get('/auth/google/callback').query({ code: 'auth-code', state: 'qualquer' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
    expect(GoogleAuthService.handleCallback).not.toHaveBeenCalled();
  });

  it('GET /auth/google/callback com erro do provedor (?error=access_denied) redireciona para /login', async () => {
    vi.mocked(GoogleAuthService.isConfigured).mockReturnValue(true);
    vi.mocked(GoogleAuthService.getAuthUrl).mockImplementation((state) => `https://accounts.google.com/mock?state=${state}`);

    const agent = request.agent(app);
    await agent.get('/auth/google');

    const res = await agent.get('/auth/google/callback').query({ error: 'access_denied' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
    expect(GoogleAuthService.handleCallback).not.toHaveBeenCalled();
  });

  it('GET /auth/google/callback redireciona para /login quando a troca do token falha', async () => {
    vi.mocked(GoogleAuthService.isConfigured).mockReturnValue(true);
    vi.mocked(GoogleAuthService.getAuthUrl).mockImplementation((state) => `https://accounts.google.com/mock?state=${state}`);
    vi.mocked(GoogleAuthService.handleCallback).mockRejectedValue(new Error('token inválido'));

    const agent = request.agent(app);
    await agent.get('/auth/google');
    const state = vi.mocked(GoogleAuthService.getAuthUrl).mock.calls[0][0];

    const res = await agent.get('/auth/google/callback').query({ code: 'auth-code', state });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
    expect(UserModel.findOrCreateFromGoogle).not.toHaveBeenCalled();
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

  describe('Recuperação de senha', () => {
    it('GET /forgot-password retorna 200 para visitante não autenticado', async () => {
      const res = await request(app).get('/forgot-password');
      expect(res.status).toBe(200);
    });

    it('POST /forgot-password com e-mail cadastrado gera token e envia e-mail, com mensagem genérica', async () => {
      vi.mocked(UserModel.findByEmail).mockResolvedValue({
        id: TEST_USER.id,
        nome: TEST_USER.nome,
        email: TEST_USER.email,
        senhaHash: 'hash-fake',
        googleId: null,
        criadoEm: new Date(),
      } as never);
      vi.mocked(PasswordResetTokenModel.create).mockResolvedValue('raw-token-123');

      const res = await request(app).post('/forgot-password').type('form').send({ email: TEST_USER.email });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/forgot-password');
      expect(PasswordResetTokenModel.create).toHaveBeenCalledWith(TEST_USER.id);
      expect(EmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        TEST_USER.email,
        expect.stringContaining('/reset-password/raw-token-123'),
      );
    });

    it('POST /forgot-password não retorna 500 quando o envio de e-mail falha (SMTP fora do ar, IP não autorizado etc.)', async () => {
      vi.mocked(UserModel.findByEmail).mockResolvedValue({
        id: TEST_USER.id,
        nome: TEST_USER.nome,
        email: TEST_USER.email,
        senhaHash: 'hash-fake',
        googleId: null,
        criadoEm: new Date(),
      } as never);
      vi.mocked(PasswordResetTokenModel.create).mockResolvedValue('raw-token-123');
      vi.mocked(EmailService.sendPasswordResetEmail).mockRejectedValue(new Error('535 Authentication failed'));

      const res = await request(app).post('/forgot-password').type('form').send({ email: TEST_USER.email });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/forgot-password');
    });

    it('POST /forgot-password com e-mail não cadastrado responde com a mesma mensagem genérica, sem gerar token (anti-enumeração)', async () => {
      vi.mocked(UserModel.findByEmail).mockResolvedValue(null);

      const res = await request(app).post('/forgot-password').type('form').send({ email: 'inexistente@medidor.dev' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/forgot-password');
      expect(PasswordResetTokenModel.create).not.toHaveBeenCalled();
      expect(EmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('POST /forgot-password para conta Google (sem senha local) não gera token nem envia e-mail', async () => {
      vi.mocked(UserModel.findByEmail).mockResolvedValue({
        id: 'user-google',
        nome: 'Conta Google',
        email: 'google@medidor.dev',
        senhaHash: null,
        googleId: 'google-1',
        criadoEm: new Date(),
      } as never);

      const res = await request(app).post('/forgot-password').type('form').send({ email: 'google@medidor.dev' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/forgot-password');
      expect(PasswordResetTokenModel.create).not.toHaveBeenCalled();
      expect(EmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('GET /reset-password/:token redireciona para /forgot-password quando o token é inválido ou expirou', async () => {
      vi.mocked(PasswordResetTokenModel.findValidByRawToken).mockResolvedValue(null);

      const res = await request(app).get('/reset-password/token-invalido');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/forgot-password');
    });

    it('GET /reset-password/:token retorna 200 quando o token é válido', async () => {
      vi.mocked(PasswordResetTokenModel.findValidByRawToken).mockResolvedValue({
        id: 'reset-1',
        userId: TEST_USER.id,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000 * 60),
        usedAt: null,
        criadoEm: new Date(),
      } as never);

      const res = await request(app).get('/reset-password/token-valido');
      expect(res.status).toBe(200);
    });

    it('POST /reset-password/:token com senhas divergentes redireciona de volta sem alterar a senha', async () => {
      const res = await request(app)
        .post('/reset-password/token-qualquer')
        .type('form')
        .send({ senha: 'novaSenha123', confirmarSenha: 'diferente' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/reset-password/token-qualquer');
      expect(UserModel.updatePassword).not.toHaveBeenCalled();
    });

    it('POST /reset-password/:token com token inválido redireciona para /forgot-password sem alterar a senha', async () => {
      vi.mocked(PasswordResetTokenModel.findValidByRawToken).mockResolvedValue(null);

      const res = await request(app)
        .post('/reset-password/token-invalido')
        .type('form')
        .send({ senha: 'novaSenha123', confirmarSenha: 'novaSenha123' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/forgot-password');
      expect(UserModel.updatePassword).not.toHaveBeenCalled();
    });

    it('POST /reset-password/:token válido atualiza a senha, marca o token como usado e redireciona para /login', async () => {
      vi.mocked(PasswordResetTokenModel.findValidByRawToken).mockResolvedValue({
        id: 'reset-1',
        userId: TEST_USER.id,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000 * 60),
        usedAt: null,
        criadoEm: new Date(),
      } as never);

      const res = await request(app)
        .post('/reset-password/token-valido')
        .type('form')
        .send({ senha: 'novaSenha123', confirmarSenha: 'novaSenha123' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
      expect(UserModel.updatePassword).toHaveBeenCalledWith(TEST_USER.id, 'novaSenha123');
      expect(PasswordResetTokenModel.markUsed).toHaveBeenCalledWith('reset-1');
    });
  });
});
