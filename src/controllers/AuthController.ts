import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { UserModel } from '../models/UserModel';
import { GoogleAuthService } from '../services/GoogleAuthService';
import { loginSchema, registerSchema } from '../utils/validators';

export const AuthController = {
  showLogin(_req: Request, res: Response) {
    res.render('auth/login', { title: 'Entrar', layout: 'layouts/auth' });
  },

  async login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      req.flash('error', parsed.error.errors[0].message);
      return res.redirect('/login');
    }

    const { email, senha } = parsed.data;
    const user = await UserModel.findByEmail(email);
    const ok = user && (await UserModel.verifyPassword(senha, user.senhaHash));

    if (!ok || !user) {
      // Mensagem genérica: não revelar se o e-mail existe
      req.flash('error', 'Credenciais inválidas. Verifique e-mail e senha.');
      return res.redirect('/login');
    }

    req.session.userId = user.id;
    req.session.userName = user.nome;
    req.session.isAdmin = user.isAdmin;
    res.redirect('/');
  },

  showRegister(_req: Request, res: Response) {
    res.render('auth/register', { title: 'Criar conta', layout: 'layouts/auth' });
  },

  async register(req: Request, res: Response) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      req.flash('error', parsed.error.errors[0].message);
      return res.redirect('/register');
    }

    const { nome, email, senha } = parsed.data;
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      req.flash('error', 'Já existe uma conta com este e-mail.');
      return res.redirect('/register');
    }

    const user = await UserModel.createLocal(nome, email, senha);
    req.session.userId = user.id;
    req.session.userName = user.nome;
    req.session.isAdmin = user.isAdmin;
    res.redirect('/');
  },

  /** RF03 — inicia o fluxo OAuth 2.0 redirecionando ao consent screen do Google. */
  googleLogin(req: Request, res: Response) {
    if (!GoogleAuthService.isConfigured()) {
      req.flash('error', 'Login com Google não está disponível no momento.');
      return res.redirect('/login');
    }
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    res.redirect(GoogleAuthService.getAuthUrl(state));
  },

  /** RF03 — troca o code por perfil e autentica, vinculando à conta local se o e-mail já existir (regra 3). */
  async googleCallback(req: Request, res: Response) {
    const { code, state, error } = req.query as Record<string, string | undefined>;
    const expectedState = req.session.oauthState;
    req.session.oauthState = undefined;

    if (error || !code || !state || !expectedState || state !== expectedState) {
      req.flash('error', 'Não foi possível autenticar com o Google. Tente novamente.');
      return res.redirect('/login');
    }

    try {
      const profile = await GoogleAuthService.handleCallback(code);
      const user = await UserModel.findOrCreateFromGoogle(profile.googleId, profile.nome, profile.email);
      req.session.userId = user.id;
      req.session.userName = user.nome;
      req.session.isAdmin = user.isAdmin;
      res.redirect('/');
    } catch {
      req.flash('error', 'Não foi possível autenticar com o Google. Tente novamente.');
      res.redirect('/login');
    }
  },

  logout(req: Request, res: Response) {
    req.session.destroy(() => res.redirect('/login'));
  },
};
