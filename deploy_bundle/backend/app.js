import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import routes from './routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';
const app = express();
app.disable('x-powered-by');
// Hostinger (y la mayoría de hostings) pone un proxy delante de Node.
// Sin esto, el límite de intentos vería a todos los usuarios como una sola IP.
app.set('trust proxy', 1);
// Orígenes permitidos: CLIENT_URL (admite varios separados por coma).
// El frontend se sirve desde el mismo dominio, así que normalmente no depende de CORS.
const allowedOrigins = env.CLIENT_URL.split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
if (!env.IS_PRODUCTION) {
    allowedOrigins.push('http://localhost:5173', 'http://127.0.0.1:5173');
}
app.use(cors({
    origin: (origin, callback) => {
        // Sin cabecera Origin = misma origen, curl o app móvil: se permite.
        if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
            return callback(null, true);
        }
        return callback(null, false); // sin cabeceras CORS: el navegador lo bloquea
    },
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.IS_PRODUCTION ? 'combined' : 'dev'));
}
// Límite general de la API (protege contra abuso sin molestar el uso normal).
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
});
// Límite estricto para login: 10 fallos cada 15 minutos por IP.
// Los logins correctos no cuentan.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo.',
    },
});
// Prefijo API v1
app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1', routes);
// Servir frontend compilado en producción (si existe la carpeta public o frontend/dist)
const possiblePublicDirs = [
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd(), 'dist', 'public'),
    path.resolve(process.cwd(), '../frontend/dist'),
];
const publicDir = possiblePublicDirs.find((d) => fs.existsSync(d) && fs.existsSync(path.join(d, 'index.html')));
if (publicDir) {
    app.use(express.static(publicDir));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(publicDir, 'index.html'));
    });
}
// 404 Handler para rutas de API no encontradas
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada',
    });
});
// Manejador centralizado de errores
app.use(errorHandler);
export default app;
