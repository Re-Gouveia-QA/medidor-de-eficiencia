import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { SetupController } from '../controllers/SetupController';

export const categoryRoutes = Router();

categoryRoutes.get('/', CategoryController.index);
categoryRoutes.get('/new', CategoryController.create);
categoryRoutes.get('/setup', SetupController.index);
categoryRoutes.get('/setup/:presetId', SetupController.show);
categoryRoutes.post('/setup/:presetId', SetupController.apply);
categoryRoutes.post('/', CategoryController.store);
categoryRoutes.get('/:id/edit', CategoryController.edit);
categoryRoutes.put('/:id', CategoryController.update);
categoryRoutes.delete('/:id', CategoryController.destroy);
