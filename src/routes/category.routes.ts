import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';

export const categoryRoutes = Router();

categoryRoutes.get('/', CategoryController.index);
categoryRoutes.get('/new', CategoryController.create);
categoryRoutes.post('/', CategoryController.store);
categoryRoutes.get('/:id/edit', CategoryController.edit);
categoryRoutes.put('/:id', CategoryController.update);
categoryRoutes.delete('/:id', CategoryController.destroy);
