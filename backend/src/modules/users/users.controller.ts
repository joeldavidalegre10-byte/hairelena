import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service.js';

export class UsersController {
  static async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await UsersService.list();
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UsersService.getById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await UsersService.create(req.body);
      res.status(201).json({ success: true, message: 'Usuario creado exitosamente', data: created });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await UsersService.update(req.params.id, req.body);
      res.json({ success: true, message: 'Usuario actualizado exitosamente', data: updated });
    } catch (error) {
      next(error);
    }
  }
}
