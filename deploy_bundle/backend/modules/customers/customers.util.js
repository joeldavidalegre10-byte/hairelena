/**
 * Utilidades de clientes: normalización de nombres y teléfonos (Paraguay).
 * Se usan para buscar y para evitar clientes duplicados.
 */
/** Nombre "limpio" para mostrar: sin espacios repetidos ni en los bordes. */
export function cleanName(raw) {
    return String(raw ?? '').replace(/\s+/g, ' ').trim();
}
/** Nombre para comparar: minúsculas, sin tildes, sin espacios repetidos. */
export function normalizeName(raw) {
    return cleanName(raw)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
/**
 * Teléfono para comparar: solo dígitos, con prefijo de país 595.
 *   0981 123 456   -> 595981123456
 *   +595 981 123456 -> 595981123456
 *   981123456       -> 595981123456
 * Devuelve null si no hay un número utilizable (menos de 7 dígitos).
 */
export function normalizePhone(raw) {
    let digits = String(raw ?? '').replace(/\D/g, '');
    if (!digits)
        return null;
    if (digits.startsWith('00'))
        digits = digits.slice(2);
    if (digits.startsWith('595')) {
        // ya tiene prefijo de país
    }
    else if (digits.startsWith('0')) {
        digits = `595${digits.slice(1)}`;
    }
    else if (digits.length === 9 && digits.startsWith('9')) {
        digits = `595${digits}`;
    }
    return digits.length >= 7 && digits.length <= 15 ? digits : null;
}
export const CONSUMIDOR_FINAL = 'consumidor final';
export const isConsumidorFinal = (raw) => normalizeName(raw) === CONSUMIDOR_FINAL;
