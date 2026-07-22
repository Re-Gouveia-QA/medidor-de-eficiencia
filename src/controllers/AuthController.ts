import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { UserModel } from '../models/UserModel';
import { PasswordResetTokenModel } from '../models/PasswordResetTokenModel';
import { GoogleAuthService } from '../services/GoogleAuthService';
import { EmailService } from '../services/EmailService';
import { env } from '../config/env';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../utils/validators';

class AuthControllerImpl extends BaseController {
  showLogin = (_req: Request, res: Response) => {
    res.render('auth/login', { title: 'Entrar', layout: 'layouts/auth' });
  };

  login = async (req: Request, res: Response) => {
    const data = this.parseOrRedirect(req, res, loginSchema, '/login');
    if (!data) return;

    const user = await UserModel.findByEmail(data.email);
    const ok = user && (await UserModel.verifyPassword(data.senha, user.senhaHash));

    if (!ok || !user) {
      // Mensagem genérica: não revelar se o e-mail existe
      req.flash('error', 'Credenciais inválidas. Verifique e-mail e senha.');
      return res.redirect('/login');
    }

    req.session.userId = user.id;
    req.session.userName = user.nome;
    req.session.isAdmin = user.isAdmin;
    res.redirect('/');
  };

  showRegister = (_req: Request, res: Response) => {
    res.render('auth/register', { title: 'Criar conta', layout: 'layouts/auth' });
  };

  register = async (req: Request, res: Response) => {
    const data = this.parseOrRedirect(req, res, registerSchema, '/register');
    if (!data) return;

    const existing = await UserModel.findByEmail(data.email);
    if (existing) {
      req.flash('error', 'Já existe uma conta com este e-mail.');
      return res.redirect('/register');
    }

    const user = await UserModel.createLocal(data.nome, data.email, data.senha);
    req.session.userId = user.id;
    req.session.userName = user.nome;
    req.session.isAdmin = user.isAdmin;
    res.redirect('/');
  };

  /** RF03 — inicia o fluxo OAuth 2.0 redirecionando ao consent screen do Google. */
  googleLogin = (req: Request, res: Response) => {
    if (!GoogleAuthService.isConfigured()) {
      req.flash('error', 'Login com Google não está disponível no momento.');
      return res.redirect('/login');
    }
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    res.redirect(GoogleAuthService.getAuthUrl(state));
  };

  /** RF03 — troca o code por perfil e autentica, vinculando à conta local se o e-mail já existir (regra 3). */
  googleCallback = async (req: Request, res: Response) => {
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
    } catch (err) {
      // Log detalhado só no servidor — a flash pro usuário continua genérica de propósito
      // (não expor detalhes de token/OAuth), mas sem isso a causa real fica invisível.
      console.error('[GoogleAuth] Falha no callback:', err);
      req.flash('error', 'Não foi possível autenticar com o Google. Tente novamente.');
      res.redirect('/login');
    }
  };

  logout = (req: Request, res: Response) => {
    req.session.destroy(() => res.redirect('/login'));
  };

  showForgotPassword = (_req: Request, res: Response) => {
    res.render('auth/forgot-password', { title: 'Esqueceu a senha?', layout: 'layouts/auth' });
  };

  /**
   * Mensagem de sucesso é sempre a mesma, exista ou não o e-mail (anti-enumeração de contas —
   * mesmo cuidado do /login, que também usa mensagem genérica em vez de "e-mail não encontrado").
   * Contas Google (senhaHash nulo) não recebem e-mail: não têm senha local para redefinir.
   */
  forgotPassword = async (req: Request, res: Response) => {
    const data = this.parseOrRedirect(req, res, forgotPasswordSchema, '/forgot-password');
    if (!data) return;

    const user = await UserModel.findByEmail(data.email);
    if (user && user.senhaHash) {
      try {
        const rawToken = await PasswordResetTokenModel.create(user.id);
        const baseUrl = env.APP_URL ?? `http://localhost:${env.PORT}`;
        const resetUrl = `${baseUrl}/reset-password/${rawToken}`;
        await EmailService.sendPasswordResetEmail(user.email, resetUrl);
      } catch (err) {
        // Log detalhado só no servidor — a flash pro usuário continua genérica de propósito
        // (mesmo padrão do googleCallback): uma falha de envio (SMTP fora do ar, IP não
        // autorizado etc.) não pode virar 500 nem revelar se o e-mail existe na base.
        console.error('[ForgotPassword] Falha ao gerar/enviar o e-mail de redefinição:', err);
      }
    }

    req.flash('success', 'Se o e-mail informado estiver cadastrado, enviaremos instruções para redefinir a senha.');
    res.redirect('/forgot-password');
  };

  showResetPassword = async (req: Request, res: Response) => {
    const token = await PasswordResetTokenModel.findValidByRawToken(req.params.token);
    if (!token) {
      req.flash('error', 'Este link de redefinição de senha é inválido ou expirou.');
      return res.redirect('/forgot-password');
    }
    res.render('auth/reset-password', { title: 'Redefinir senha', layout: 'layouts/auth', token: req.params.token });
  };

  resetPassword = async (req: Request, res: Response) => {
    const rawToken = req.params.token;
    const data = this.parseOrRedirect(req, res, resetPasswordSchema, `/reset-password/${rawToken}`);
    if (!data) return;

    const token = await PasswordResetTokenModel.findValidByRawToken(rawToken);
    if (!token) {
      req.flash('error', 'Este link de redefinição de senha é inválido ou expirou.');
      return res.redirect('/forgot-password');
    }

    await UserModel.updatePassword(token.userId, data.senha);
    await PasswordResetTokenModel.markUsed(token.id);

    req.flash('success', 'Senha redefinida com sucesso. Faça login com sua nova senha.');
    res.redirect('/login');
  };
}

export const AuthController = new AuthControllerImpl();
