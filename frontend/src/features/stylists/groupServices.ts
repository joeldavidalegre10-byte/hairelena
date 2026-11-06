/**
 * Agrupa los servicios de un estilista: el mismo servicio (mismo nombre y mismo precio unitario)
 * aparece UNA sola vez con la cantidad, el precio unitario y el total.
 *   3 cortes de 50.000 en distintas ventas  ->  "Corte  × 3 · 50.000 c/u · 150.000"
 */
export interface ServiceLine {
  service_name: string;
  customer_name: string | null;
  service_date: string | null;
  service_price: number; // total cobrado de la línea (unitario × cantidad)
  quantity?: number;
  unit_price?: number | null;
  commission_rate: number | null;
  invoice_number?: string | null;
}

export interface ServiceGroup<T extends ServiceLine> {
  key: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  total_charged: number;
  total_amount: number;
  items: T[];
}

export const lineQuantity = (l: ServiceLine): number => Math.max(1, Number(l.quantity) || 1);

export const lineUnitPrice = (l: ServiceLine): number => {
  const unit = Number(l.unit_price);
  if (l.unit_price !== null && l.unit_price !== undefined && Number.isFinite(unit) && unit > 0) return unit;
  return lineQuantity(l) > 0 ? Number(l.service_price) / lineQuantity(l) : Number(l.service_price);
};

export function groupServices<T extends ServiceLine>(items: T[], amountOf: (item: T) => number): ServiceGroup<T>[] {
  const map = new Map<string, ServiceGroup<T>>();
  for (const item of items) {
    const unit = Math.round(lineUnitPrice(item));
    const key = `${item.service_name.trim().toLowerCase()}|${unit}`;
    let g = map.get(key);
    if (!g) {
      g = { key, service_name: item.service_name.trim(), quantity: 0, unit_price: unit, total_charged: 0, total_amount: 0, items: [] };
      map.set(key, g);
    }
    g.quantity += lineQuantity(item);
    g.total_charged += Number(item.service_price) || 0;
    g.total_amount += amountOf(item) || 0;
    g.items.push(item);
  }
  // Los que más se hicieron primero
  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity || b.total_charged - a.total_charged);
}
