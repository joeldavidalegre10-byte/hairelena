import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';
const router = Router();
const loginSchema = z.object({
    body: z.object({
        username: z.string().optional(),
        email: z.string().optional(),
        identifier: z.string().optional(),
        password: z.string().min(1, 'Debes ingresar tu contraseña'),
    }).refine((data) => Boolean(data.username || data.email || data.identifier), {
        message: 'Debes ingresar tu usuario',
        path: ['username'],
    }),
});
router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.me);
export default router;
