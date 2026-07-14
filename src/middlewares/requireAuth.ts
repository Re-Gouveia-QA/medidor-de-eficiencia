import { NextFunction, Request, Response } from 'express';

/** RNF02: rotas privadas sem sessão redirecionam ao login. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    req.flash('error', 'Faça login para continuar.');
    return res.redirect('/login');
  }
  req.currentUser = { id: req.session.userId, nome: req.session.userName ?? '' };
  res.locals.currentUser = req.currentUser;
  next();
}

/** Impede que usuário logado veja login/cadastro novamente. */
export function redirectIfAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session.userId) return res.redirect('/');
  next();
}
