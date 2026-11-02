import React from 'react';
import { Check } from 'lucide-react';
import {
  PERMISSIONS,
  ALL_PERMISSION_KEYS,
  ROLE_DEFAULT_PERMISSIONS,
  PermissionKey,
} from '../../config/permissions';

interface PermissionsPickerProps {
  value: PermissionKey[];
  onChange: (next: PermissionKey[]) => void;
  /** Rol elegido: se usa para el botón «Según el rol» */
  role: string;
  /** Permisos que no se pueden quitar (p. ej. «Configuración» en tu propia cuenta) */
  lockedKeys?: PermissionKey[];
}

export const PermissionsPicker: React.FC<PermissionsPickerProps> = ({
  value,
  onChange,
  role,
  lockedKeys = [],
}) => {
  const toggle = (key: PermissionKey) => {
    if (lockedKeys.includes(key)) return;
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  };

  // Se conserva siempre el orden oficial de los módulos y los bloqueados no se pierden
  const normalize = (keys: PermissionKey[]) =>
    ALL_PERMISSION_KEYS.filter((k) => keys.includes(k) || lockedKeys.includes(k));

  const quickBtn =
    'px-2 py-1 rounded-lg border border-slate-200 dark:border-[#1f2128] text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:border-[#5b63f6] hover:text-[#5b63f6] transition cursor-pointer';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Permisos del sistema{' '}
          <span className="font-medium text-slate-400">
            ({value.length} de {ALL_PERMISSION_KEYS.length})
          </span>
        </label>
        <div className="flex items-center gap-1.5">
          <button type="button" className={quickBtn} onClick={() => onChange(normalize(ALL_PERMISSION_KEYS))}>
            Todos
          </button>
          <button type="button" className={quickBtn} onClick={() => onChange(normalize([]))}>
            Ninguno
          </button>
          <button
            type="button"
            className={quickBtn}
            onClick={() => onChange(normalize(ROLE_DEFAULT_PERMISSIONS[role] ?? []))}
            title="Vuelve a los permisos que trae el rol por defecto"
          >
            Según el rol
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PERMISSIONS.map((perm) => {
          const checked = value.includes(perm.key);
          const locked = lockedKeys.includes(perm.key);
          return (
            <button
              key={perm.key}
              type="button"
              onClick={() => toggle(perm.key)}
              aria-pressed={checked}
              disabled={locked}
              title={locked ? 'No puedes quitarte este permiso a ti mismo' : undefined}
              className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                locked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
              } ${
                checked
                  ? 'border-[#5b63f6] bg-indigo-50/60 dark:bg-[#1a1b2e] ring-1 ring-[#5b63f6]/30'
                  : 'border-slate-200 dark:border-[#1f2128] bg-white dark:bg-[#121318] hover:border-slate-300'
              }`}
            >
              <span
                className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                  checked
                    ? 'bg-[#5b63f6] border-[#5b63f6] text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#161720]'
                }`}
              >
                {checked && <Check className="w-3 h-3" strokeWidth={3} />}
              </span>
              <span>
                <span className="block text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {perm.label}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5 leading-snug">{perm.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
