import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { activityRoutes } from './activity.routes';
import { categoryRoutes } from './category.routes';
import { reportRoutes } from './report.routes';
import { HomeController } from '../controllers/HomeController';
import { requireAuth } from '../middlewares/requireAuth';

export const routes = Router();

routes.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

routes.use(authRoutes);
routes.get('/', requireAuth, HomeController.index);
routes.use('/activities', requireAuth, activityRoutes);
routes.use('/categories', requireAuth, categoryRoutes);
routes.use('/reports', requireAuth, reportRoutes);
