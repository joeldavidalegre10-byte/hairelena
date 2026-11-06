import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Trash2, User } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ServiceGroup, ServiceLine, lineQuantity } from './groupServices';

interface Props<T extends ServiceLine> {
  group: ServiceGroup<T>;
  /** 'pending' = por pagar (ámbar) · 'paid' = ya abonado (verde) */
  variant: 'pending' | 'paid';
  /** Excluir una línea de la liquidación (solo en pendientes). */
  onDeleteOne?: (item: T) => void;
}

/** Una tarjeta por servicio: nombre, cantidad (× 3), precio unitario, total cobrado y total a pagar. */
export function ServiceGroupCard<T extends ServiceLine>({ group, variant, onDeleteOne }: Props<T>) {
  const [open, setOpen] = useState(false);
  const isPending = variant === 'pending';
  const single = group.items.length === 1;
  const amountLabel = isPending ? 'A pagar' : 'Importe abonado';
  const amountClass = isPending
    ? 'text-amber-700 dark:text-amber-300'
    : 'text-emerald-700 dark:text-emerald-300';
  const amountLabelClass = isPending
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';

  const Meta: React.FC<{ item: T }> = ({ item }) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
      <span className="flex items-center gap-1">
        <User className="w-3 h-3 text-slate-400" />
        {item.customer_name || 'Consumidor Final'}
      </span>
      {item.service_date && (
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-400" />
          {formatDate(item.service_date)}
        </span>
      )}
      {item.invoice_number && <span className="font-mono text-slate-400">#{item.invoice_number}</span>}
      {item.commission_rate !== null && item.commission_rate !== undefined && (
        <span className="text-indigo-600 dark:text-indigo-400 font-medium">Comisión: {item.commission_rate}%</span>
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-2xs">
      <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs text-slate-900 dark:text-white">{group.service_name}</span>
            {group.quantity > 1 && (
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-extrabold">
                × {group.quantity}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Precio unitario: <span className="font-mono font-semibold">{formatCurrency(group.unit_price)}</span>
          </div>
          {single && <Meta item={group.items[0]} />}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 block">Total cobrado</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">
              {formatCurrency(group.total_charged)}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
          <div className="text-right">
            <span className={`text-[10px] font-bold block ${amountLabelClass}`}>{amountLabel}</span>
            <span className={`text-xs font-bold font-mono ${amountClass}`}>{formatCurrency(group.total_amount)}</span>
          </div>
          {single && isPending && onDeleteOne && (
            <button
              type="button"
              onClick={() => onDeleteOne(group.items[0])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
              title="Excluir este servicio de la liquidación del profesional"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {!single && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-center gap-1 py-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 cursor-pointer"
          >
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {open ? 'Ocultar detalle' : `Ver detalle de ${group.items.length} ventas`}
          </button>
          {open && (
            <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/60 dark:bg-slate-950/40 rounded-b-xl">
              {group.items.map((item, i) => (
                <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <Meta item={item} />
                    {lineQuantity(item) > 1 && (
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">× {lineQuantity(item)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {formatCurrency(item.service_price)}
                    </span>
                    {isPending && onDeleteOne && (
                      <button
                        type="button"
                        onClick={() => onDeleteOne(item)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                        title="Excluir este servicio de la liquidación del profesional"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
