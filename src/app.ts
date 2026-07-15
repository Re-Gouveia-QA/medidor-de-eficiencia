import path from 'node:path';
import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import flash from 'connect-flash';
import methodOverride from 'method-override';
import swaggerUi from 'swagger-ui-express';
import { sessionMiddleware } from './config/session';
import { loadOpenApiDocument } from './config/openapi';
import { routes } from './routes';
import { requireAuth } from './middlewares/requireAuth';
import { errorHandler, notFound } from './middlewares/errorHandler';

export function createApp() {
  const app = express();

  // View engine (camada View do MVC)
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(expressLayouts);
  app.set('layout', 'layouts/main');

  // Parsers e assets
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(methodOverride('_method')); // habilita PUT/DELETE em formulários HTML

  // Sessão e mensagens de feedback
  app.use(sessionMiddleware);
  app.use(flash());
  app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currentUser = req.session.userId
      ? { id: req.session.userId, nome: req.session.userName }
      : null;
    next();
  });

  // Documentação da API (Swagger/OpenAPI) — protegida por login
  app.use('/docs', requireAuth, swaggerUi.serve, swaggerUi.setup(loadOpenApiDocument()));

  // Rotas (camada Controller)
  app.use(routes);

  // Erros
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
