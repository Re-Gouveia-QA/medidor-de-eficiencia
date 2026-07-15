import rateLimit from 'express-rate-limit';
import { env } from './env';

// Em testes, a mesma instância do app recebe muitas requisições em sequência propositalmente
// (supertest reaproveita createApp()) — o rate limit é desabilitado apenas nesse ambiente.
const skipInTests = () => env.NODE_ENV === 'test';

/** Limite geral: mitigação básica de abuso/DoS em toda a aplicação. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: 'Muitas requisições deste endereço. Tente novamente em alguns minutos.',
});

/** Limite estrito: protege login, registro e callback do Google contra força bruta e spam de contas. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: 'Muitas tentativas. Tente novamente em alguns minutos.',
});
