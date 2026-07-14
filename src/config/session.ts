import session from 'express-session';
import { env, isProd } from './env';

// RNF02: sessões autenticadas protegem as rotas internas.
// Em produção, trocar o MemoryStore padrão por um store persistente
// (ex.: connect-pg-simple apontando para o mesmo PostgreSQL).
export const sessionMiddleware = session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd, // exige HTTPS em produção
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
  },
});
