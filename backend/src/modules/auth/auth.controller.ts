import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, username, identifier, password } = req.body;
      const userIdentifier = (username || identifier || email || '').trim();
      const result = await AuthService.login(userIdentifier, password);
      res.json({
        success: true,
        message: 'Sesión iniciada correctamente',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return;
      }
      const profile = await AuthService.getProfile(userId);
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}
