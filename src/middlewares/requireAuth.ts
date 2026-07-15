import { NextFunction, Request, Response } from 'express';

/** RNF02: rotas privadas sem sessão redirecionam ao login. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    req.flash('error', 'Faça login para continuar.');
    return res.redirect('/login');
  }
  req.currentUser = {
    id: req.session.userId,
    nome: req.session.userName ?? '',
    isAdmin: req.session.isAdmin ?? false,
  };
  res.locals.currentUser = req.currentUser;
  next();
}

/** Regra 11: restringe rotas (ex.: /docs) a usuários administradores. Deve vir após requireAuth. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.currentUser?.isAdmin) {
    req.flash('error', 'Acesso restrito a administradores.');
    return res.redirect('/');
  }
  next();
}

/** Impede que usuário logado veja login/cadastro novamente. */
export function redirectIfAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session.userId) return res.redirect('/');
  next();
}
