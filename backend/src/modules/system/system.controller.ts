import path from 'node:path';
import { Request, Response, NextFunction } from 'express';
import { backupDatabase, restoreDatabase, listBackups } from '../../db/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export class SystemController {
  static async createBackup(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = backupDatabase();
      res.json({
        success: true,
        message: 'Copia de seguridad creada exitosamente',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBackups(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const backups = listBackups();
      res.json({
        success: true,
        data: backups,
      });
    } catch (error) {
      next(error);
    }
  }

  static async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { backupPath } = req.body ?? {};

      if (typeof backupPath !== 'string' || !backupPath.trim() || backupPath.length > 300 || backupPath.includes('\0')) {
        throw new AppError('Ruta de respaldo no especificada o inválida', 400);
      }

      // Solo se usa el NOMBRE del archivo: da igual si el cliente manda una ruta completa
      // (como la que devuelve /system/backups) o con "../". Siempre se busca en backups/.
      const filename = path.basename(backupPath.replace(/\\/g, '/'));

      try {
        restoreDatabase(filename);
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(err instanceof Error ? err.message : 'No se pudo restaurar la base de datos', 400);
      }

      res.json({
        success: true,
        message: 'Base de datos restaurada correctamente',
      });
    } catch (error) {
      next(error);
    }
  }
}