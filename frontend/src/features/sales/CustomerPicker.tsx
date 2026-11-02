import React, { useEffect, useRef, useState } from 'react';
import { Search, UserPlus, X, User } from 'lucide-react';
import { customersService } from '../../services/customers.service';
import { Customer } from '../../types';

interface Props {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * Selector de cliente con autocompletado. Sin cliente elegido, la venta es "Consumidor Final".
 * Crear un cliente con un teléfono que ya existe devuelve el existente (no se duplica).
 */
export const CustomerPicker: React.FC<Props> = ({ value, onChange, notify }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Búsqueda con pequeña espera para no consultar en cada tecla
  useEffect(() => {
    if (!open || creating) return;
    const handle = setTimeout(async () => {
      try {
        setResults(await customersService.search(term.trim()));
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [term, open, creating]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const pick = (c: Customer) => {
    onChange(c);
    setTerm('');
    setOpen(false);
    setCreating(false);
    setNewPhone('');
  };

  const handleCreate = async () => {
    const name = term.trim();
    if (name.length < 2) {
      notify('Escribí el nombre del cliente.', 'error');
      return;
    }
    try {
      setBusy(true);
      const { customer, created } = await customersService.create({ full_name: name, phone: newPhone.trim() || undefined });
      if (!created) notify(`Ya existía: se usó "${customer.full_name}".`, 'info');
      pick(customer);
    } catch (err: any) {
      notify(err.message || 'No se pudo crear el cliente', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <div className="mb-5 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{value.full_name}</div>
            {value.phone && <div className="text-slate-500 dark:text-slate-400">{value.phone}</div>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
          title="Quitar cliente (Consumidor Final)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="mb-5 relative text-xs">
      <label className="block mb-1 font-semibold text-slate-700 dark:text-slate-300">
        Cliente <span className="font-normal text-slate-400">(opcional — sin elegir = Consumidor Final)</span>
      </label>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={term}
          placeholder="Buscar por nombre o teléfono..."
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
            setCreating(false);
          }}
          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {!creating && results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 cursor-pointer"
            >
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{c.full_name}</span>
              <span className="text-slate-500 dark:text-slate-400 shrink-0">{c.phone || 'sin teléfono'}</span>
            </button>
          ))}

          {!creating && term.trim().length >= 2 && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full text-left px-3 py-2 border-t border-slate-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Crear cliente "{term.trim()}"
            </button>
          )}

          {creating && (
            <div className="p-3 space-y-2">
              <div className="font-semibold text-slate-800 dark:text-slate-200">Nuevo cliente: {term.trim()}</div>
              <input
                type="tel"
                value={newPhone}
                placeholder="Teléfono (WhatsApp) — recomendado"
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCreating(false)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleCreate}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-60 cursor-pointer"
                >
                  Guardar y usar
                </button>
              </div>
            </div>
          )}

          {!creating && results.length === 0 && term.trim().length < 2 && (
            <div className="px-3 py-2 text-slate-400">Escribí al menos 2 letras para buscar.</div>
          )}
        </div>
      )}
    </div>
  );
};
