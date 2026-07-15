import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { redirectIfAuthenticated, requireAuth } from '../middlewares/requireAuth';

export const authRoutes = Router();

authRoutes.get('/login', redirectIfAuthenticated, AuthController.showLogin);
authRoutes.post('/login', redirectIfAuthenticated, AuthController.login);
authRoutes.get('/register', redirectIfAuthenticated, AuthController.showRegister);
authRoutes.post('/register', redirectIfAuthenticated, AuthController.register);
authRoutes.get('/auth/google', redirectIfAuthenticated, AuthController.googleLogin);
authRoutes.get('/auth/google/callback', redirectIfAuthenticated, AuthController.googleCallback);
authRoutes.post('/logout', requireAuth, AuthController.logout);
