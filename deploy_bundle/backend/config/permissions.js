/**
 * Permisos del sistema.
 * Cada clave corresponde a un módulo del menú (y a las acciones de ese módulo en la API).
 * El rol (admin / cashier) solo define los permisos iniciales; lo que manda es la lista
 * de permisos guardada en cada usuario (columna `users.permissions`, JSON).
 */
export const PERMISSION_KEYS = [
    'pos', // Punto de Venta: cobrar y generar tickets
    'sales', // Historial de tickets (ver y anular)
    'register', // Control de caja: abrir, cerrar, ingresos y egresos
    'inventory', // Servicios & Stock: crear y editar servicios y productos
    'stylists', // Estilistas & Pagos: gestionar estilistas y pagar comisiones
    'margins', // Márgenes de ganancia
    'reports', // Reportes & Métricas
    'settings', // Configuración: usuarios, permisos y respaldos
];
export const ROLE_DEFAULT_PERMISSIONS = {
    admin: [...PERMISSION_KEYS],
    cashier: ['pos', 'sales', 'register'],
    stylist: [],
};
const isPermissionKey = (value) => typeof value === 'string' && PERMISSION_KEYS.includes(value);
/** Deja solo claves válidas, sin repetidos y en el orden canónico del sistema. */
export function sanitizePermissions(input) {
    if (!Array.isArray(input))
        return [];
    const wanted = new Set(input.filter(isPermissionKey));
    return PERMISSION_KEYS.filter((key) => wanted.has(key));
}
/** Lee lo guardado en la BD. Devuelve null si el usuario aún no tiene permisos propios. */
export function parseStoredPermissions(raw) {
    if (raw === null || raw === undefined || raw === '')
        return null;
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? sanitizePermissions(parsed) : null;
    }
    catch {
        return null;
    }
}
/**
 * Permisos efectivos de un usuario.
 * Si no tiene permisos propios guardados (usuarios anteriores a este cambio),
 * se usan los del rol: así nadie pierde acceso al actualizar.
 */
export function resolvePermissions(role, raw) {
    const stored = parseStoredPermissions(raw);
    if (stored)
        return stored;
    return [...(ROLE_DEFAULT_PERMISSIONS[role] ?? [])];
}
