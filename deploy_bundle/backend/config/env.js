import dotenv from 'dotenv';
import path from 'path';
import crypto from 'node:crypto';
dotenv.config();
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
// Valores que alguna vez estuvieron en el código o en .env.example: nunca se aceptan.
const KNOWN_INSECURE_SECRETS = new Set([
    'elite_studio_pos_jwt_secret_key_2026',
    'change_me',
    'changeme',
    'secret',
    'your_jwt_secret',
    'tu_clave_secreta',
]);
function resolveJwtSecret() {
    const secret = process.env.JWT_SECRET?.trim();
    if (secret) {
        if (KNOWN_INSECURE_SECRETS.has(secret.toLowerCase()) || secret.length < 32) {
            if (isProduction) {
                throw new Error('JWT_SECRET es inseguro (valor conocido o menor a 32 caracteres). ' +
                    'Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
            }
            console.warn('⚠️  JWT_SECRET es débil. Úsalo solo en desarrollo.');
        }
        return secret;
    }
    if (isProduction) {
        throw new Error('Falta JWT_SECRET. Defínelo en las variables de entorno de producción ' +
            '(mínimo 32 caracteres aleatorios).');
    }
    // Desarrollo: secreto aleatorio por arranque (las sesiones se cierran al reiniciar).
    console.warn('⚠️  JWT_SECRET no definido: se usa uno temporal aleatorio (solo desarrollo).');
    return crypto.randomBytes(48).toString('hex');
}
function parseIntEnv(name, fallback) {
    const raw = process.env[name];
    if (!raw)
        return fallback;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) {
        throw new Error(`La variable ${name} debe ser un número (valor recibido: "${raw}").`);
    }
    return n;
}
// Normaliza (espacios y mayúsculas) antes de validar, para que "MySQL " no falle.
const rawDbType = (process.env.DB_TYPE ||
    (process.env.DB_HOST && process.env.DB_USER ? 'mysql' : 'sqlite'))
    .trim()
    .toLowerCase();
if (rawDbType !== 'mysql' && rawDbType !== 'sqlite') {
    throw new Error(`DB_TYPE debe ser "mysql" o "sqlite" (valor recibido: "${rawDbType}").`);
}
const DB_TYPE = rawDbType;
if (DB_TYPE === 'mysql' && (!process.env.DB_USER || !process.env.DB_NAME)) {
    throw new Error('DB_TYPE=mysql requiere DB_USER y DB_NAME (y normalmente DB_PASSWORD y DB_HOST).');
}
// Zona horaria de la sesión MySQL: "Z", "+00:00", "-03:00", etc. Por defecto UTC.
const DB_TIMEZONE = (process.env.DB_TIMEZONE || '+00:00').trim();
if (!/^(Z|[+-](0\d|1[0-4]):[0-5]\d)$/.test(DB_TIMEZONE)) {
    throw new Error(`DB_TIMEZONE debe tener formato "+00:00" o "-03:00" (valor recibido: "${DB_TIMEZONE}").`);
}
// En producción, un CLIENT_URL por defecto (localhost) rompería el CORS sin avisar.
// Acepta varios orígenes separados por coma.
const CLIENT_URL = process.env.CLIENT_URL?.trim() || 'http://localhost:5173';
if (isProduction && !process.env.CLIENT_URL?.trim()) {
    throw new Error('Falta CLIENT_URL en producción (URL del frontend, ej. https://tudominio.com).');
}
if (isProduction && DB_TYPE === 'mysql' && !process.env.DB_PASSWORD) {
    console.warn('⚠️  DB_PASSWORD vacío en producción con MySQL. Verifica que sea intencional.');
}
export const env = {
    PORT: parseIntEnv('PORT', 4000),
    NODE_ENV,
    IS_PRODUCTION: isProduction,
    CLIENT_URL,
    CLIENT_URLS: CLIENT_URL.split(',')
        .map((u) => u.trim().replace(/\/+$/, ''))
        .filter(Boolean),
    DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'elite_pos.db'),
    JWT_SECRET: resolveJwtSecret(),
    // Configuración de Base de Datos para Producción / Hostinger (MySQL / MariaDB)
    DB_TYPE,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseIntEnv('DB_PORT', 3306),
    DB_USER: process.env.DB_USER || '',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || '',
    DB_TIMEZONE,
};
