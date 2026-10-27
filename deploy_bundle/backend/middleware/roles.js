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
