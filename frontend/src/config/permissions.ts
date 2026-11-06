/**
 * Permisos del sistema (espejo de backend/src/config/permissions.ts).
 * Cada clave es también el id de la pestaña del menú que habilita.
 */
export type PermissionKey =
  | 'pos'
  | 'sales'
  | 'register'
  | 'inventory'
  | 'stylists'
  | 'margins'
  | 'reports'
  | 'settings';

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  description: string;
}

// El orden de esta lista es el orden del menú lateral
export const PERMISSIONS: PermissionDef[] = [
  { key: 'pos', label: 'Punto de Venta', description: 'Cobrar servicios y productos y generar tickets' },
  { key: 'sales', label: 'Historial de Tickets', description: 'Ver las ventas realizadas y anularlas' },
  { key: 'register', label: 'Control de Caja', description: 'Abrir y cerrar caja, registrar ingresos y egresos' },
  { key: 'inventory', label: 'Servicios & Stock', description: 'Crear y editar servicios, productos y stock' },
  { key: 'stylists', label: 'Estilistas & Pagos', description: 'Gestionar estilistas y pagar comisiones' },
  { key: 'margins', label: 'Márgenes de ganancia', description: 'Ver y modificar los porcentajes de ganancia' },
  { key: 'reports', label: 'Reportes & Métricas', description: 'Ver reportes financieros y rendimiento' },
  { key: 'settings', label: 'Configuración', description: 'Administrar usuarios, permisos y respaldos' },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

export const ROLE_DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  admin: [...ALL_PERMISSION_KEYS],
  cashier: ['pos', 'sales'],
  stylist: [],
};

/** Permisos efectivos de un usuario (si el servidor no los envía, se usan los de su rol). */
export function permissionsOf(user?: { role: string; permissions?: PermissionKey[] } | null): PermissionKey[] {
  if (!user) return [];
  return user.permissions ?? ROLE_DEFAULT_PERMISSIONS[user.role] ?? [];
}

export function userCan(
  user: { role: string; permissions?: PermissionKey[] } | null | undefined,
  key: PermissionKey
): boolean {
  return permissionsOf(user).includes(key);
}

/** Primera pestaña a la que el usuario puede entrar (o null si no tiene ninguna). */
export function firstAllowedTab(
  user: { role: string; permissions?: PermissionKey[] } | null | undefined
): PermissionKey | null {
  const granted = permissionsOf(user);
  return ALL_PERMISSION_KEYS.find((key) => granted.includes(key)) ?? null;
}
