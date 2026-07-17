import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { env, isProd } from './env';

// RNF02: sessões autenticadas protegem as rotas internas.
// Em produção usa-se connect-pg-simple (mesmo PostgreSQL do Prisma) em vez do
// MemoryStore padrão — sem isso, cada redeploy/restart do processo (ex.: Railway)
// derrubaria todas as sessões ativas, e múltiplas instâncias não compartilhariam sessão.
const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: isProd
    ? new PgSession({
        conString: env.DATABASE_URL,
        tableName: 'session',
        createTableIfMissing: true,
      })
    : undefined,
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
