import { Router } from 'express';
import { ActivityController } from '../controllers/ActivityController';

export const activityRoutes = Router();

activityRoutes.get('/', ActivityController.index);
activityRoutes.get('/new', ActivityController.create);
activityRoutes.post('/', ActivityController.store);
activityRoutes.post('/start', ActivityController.startInProgress);
activityRoutes.get('/:id/edit', ActivityController.edit);
activityRoutes.put('/:id', ActivityController.update);
activityRoutes.delete('/:id', ActivityController.destroy);
activityRoutes.post('/:id/finish', ActivityController.finish);
