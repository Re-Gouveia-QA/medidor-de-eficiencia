import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { activityRoutes } from './activity.routes';
import { categoryRoutes } from './category.routes';
import { reportRoutes } from './report.routes';
import { HomeController } from '../controllers/HomeController';
import { LandingController } from '../controllers/LandingController';
import { requireAuth } from '../middlewares/requireAuth';

export const routes = Router();

routes.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

routes.use(authRoutes);
// "/" é pública pra visitante sem sessão (home explicativa) e o dashboard de sempre pra quem já
// está logado — dois handlers no mesmo path: o primeiro segue pro próximo (dashboard) se houver
// sessão, senão já responde com a landing (ver .claude/plans/home-landing-page-2026-07-27.md).
routes.get('/', (req, res, next) => {
  if (req.session.userId) return next();
  return LandingController.show(req, res);
});
routes.get('/', requireAuth, HomeController.index);
routes.use('/activities', requireAuth, activityRoutes);
routes.use('/categories', requireAuth, categoryRoutes);
routes.use('/reports', requireAuth, reportRoutes);
