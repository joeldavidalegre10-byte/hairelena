// Formateador estándar de moneda para Paraguay (Guaraníes)
export const formatCurrency = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) return '₲ 0';
  return `₲ ${new Intl.NumberFormat('es-PY').format(Math.round(amount))}`;
};

// Formatea números con separador de miles habitual de Paraguay (puntos)
export const formatParaguayThousands = (value: string | number): string => {
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-PY').format(Number(digits));
};

// Convierte texto formateado a número entero limpio
export const parseParaguayNumber = (value: string): number => {
  const digits = String(value).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatTimeOnly = (dateString?: string): string => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};
