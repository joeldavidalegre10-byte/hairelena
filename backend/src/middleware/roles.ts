import { Request, Response, NextFunction } from 'express';

export const authorize = (allowedRoles: Array<'admin' | 'cashier' | 'stylist'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Acceso denegado: se requiere uno de los siguientes roles [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
};
