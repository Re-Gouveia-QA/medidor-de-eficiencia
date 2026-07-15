import 'express-async-errors'; // encaminha rejeições de handlers async para o errorHandler (evita crash do processo)
import path from 'node:path';
import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import methodOverride from 'method-override';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { isProd } from './config/env';
import { sessionMiddleware } from './config/session';
import { loadOpenApiDocument } from './config/openapi';
import { globalLimiter } from './config/rateLimit';
import { routes } from './routes';
import { flash } from './middlewares/flash';
import { requireAdmin, requireAuth } from './middlewares/requireAuth';
import { errorHandler, notFound } from './middlewares/errorHandler';

export function createApp() {
  const app = express();

  // Atrás de proxy/load balancer em produção: necessário para IP real (rate limit) e cookie "secure" corretos.
  // O valor "1" assume um único hop confiável (ex.: um load balancer); ajuste conforme a topologia real.
  if (isProd) app.set('trust proxy', 1);

  // View engine (camada View do MVC)
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(expressLayouts);
  app.set('layout', 'layouts/main');

  // Parsers e assets
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(methodOverride('_method')); // habilita PUT/DELETE em formulários HTML

  // Rate limit geral — mitigação de abuso/DoS (assets estáticos ficam de fora, servidos acima)
  app.use(globalLimiter);

  // Sessão e mensagens de feedback
  app.use(sessionMiddleware);
  app.use(flash);
  app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currentUser = req.session.userId
      ? { id: req.session.userId, nome: req.session.userName, isAdmin: req.session.isAdmin ?? false }
      : null;
    next();
  });

  // Documentação da API (Swagger/OpenAPI) — restrita a administradores (regra 11).
  // CSP e COEP desabilitadas apenas aqui: a UI do Swagger depende de recursos que a política padrão bloquearia.
  app.use(
    '/docs',
    requireAuth,
    requireAdmin,
    helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(loadOpenApiDocument()),
  );

  // Cabeçalhos de segurança (CSP restritiva por padrão) para o restante da aplicação
  app.use(helmet());

  // Rotas (camada Controller)
  app.use(routes);

  // Erros
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
