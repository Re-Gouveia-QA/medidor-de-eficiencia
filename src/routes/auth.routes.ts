import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authLimiter } from '../config/rateLimit';
import { redirectIfAuthenticated, requireAuth } from '../middlewares/requireAuth';

export const authRoutes = Router();

authRoutes.get('/login', redirectIfAuthenticated, AuthController.showLogin);
authRoutes.post('/login', authLimiter, redirectIfAuthenticated, AuthController.login);
authRoutes.get('/register', redirectIfAuthenticated, AuthController.showRegister);
authRoutes.post('/register', authLimiter, redirectIfAuthenticated, AuthController.register);
authRoutes.get('/auth/google', redirectIfAuthenticated, AuthController.googleLogin);
authRoutes.get('/auth/google/callback', authLimiter, redirectIfAuthenticated, AuthController.googleCallback);
authRoutes.post('/logout', requireAuth, AuthController.logout);
