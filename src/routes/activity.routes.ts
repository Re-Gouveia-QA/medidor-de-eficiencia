import { Router } from 'express';
import { ActivityController } from '../controllers/ActivityController';

export const activityRoutes = Router();

activityRoutes.get('/', ActivityController.index);
activityRoutes.get('/new', ActivityController.create);
activityRoutes.post('/', ActivityController.store);
activityRoutes.get('/:id/edit', ActivityController.edit);
activityRoutes.put('/:id', ActivityController.update);
activityRoutes.delete('/:id', ActivityController.destroy);
