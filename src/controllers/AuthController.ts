import { Request, Response } from 'express';
import { UserModel } from '../models/UserModel';
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
    res.redirect('/');
  },

  /** RF03 — Fase 5 do roadmap (ver GoogleAuthService). */
  googleCallback(_req: Request, res: Response) {
    res.status(501).send('Login com Google será implementado na Fase 5.');
  },

  logout(req: Request, res: Response) {
    req.session.destroy(() => res.redirect('/login'));
  },
};
