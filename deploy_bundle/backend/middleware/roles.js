export const authorize = (allowedRoles) => {
    return (req, res, next) => {
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
/**
 * Exige que el usuario tenga AL MENOS UNO de los permisos indicados.
 * Los permisos se leen de la base de datos en cada petición (middleware `authenticate`),
 * por lo que cualquier cambio hecho por un administrador aplica de inmediato.
 */
export const requirePermission = (...required) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Usuario no autenticado' });
            return;
        }
        const granted = req.user.permissions || [];
        if (!required.some((key) => granted.includes(key))) {
            res.status(403).json({
                success: false,
                message: 'Acceso denegado: tu usuario no tiene permiso para realizar esta acción',
            });
            return;
        }
        next();
    };
};
