import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';

export const reportRoutes = Router();

reportRoutes.get('/', ReportController.index);
