import { NextFunction, Request, Response } from 'express';
import { isProd } from '../config/env';

export function notFound(_req: Request, res: Response) {
  res.status(404).render('errors/404', { title: 'Página não encontrada' });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  res.status(500).render('errors/500', {
    title: 'Erro interno',
    message: isProd ? 'Ocorreu um erro inesperado. Tente novamente.' : err.message,
  });
}
