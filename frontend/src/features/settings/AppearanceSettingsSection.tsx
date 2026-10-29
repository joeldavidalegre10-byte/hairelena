import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ThemeMode } from '../../types';
import {
  Palette,
  CheckCircle2,
  Sun,
  Moon,
  Sparkles,
  Check,
  Eye,
  Scissors,
  Package,
  Plus,
  ChevronRight,
  ShieldCheck,
  Tag,
  Clock,
  UserCheck,
} from 'lucide-react';

export const AppearanceSettingsSection: React.FC = () => {
  const { theme, setTheme, notify } = useApp();
  const [demoSelectedId, setDemoSelectedId] = useState<string>('srv-1');

  const handleSelectColorMode = (mode: ThemeMode) => {
    if (theme === mode) return;
    setTheme(mode);
    notify(`Modo cambiado a «Modo ${mode === 'dark' ? 'Oscuro (Negro Neutro)' : 'Claro (Gris Perla)'}»`, 'info');
  };

  return (
    <div className="space-y-8">
      {/* CABECERA PRINCIPAL */}
      <div className="bg-white dark:bg-[#121318] border border-slate-200 dark:border-[#1f2128] rounded-2xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#5b63f6]" />
              Personalización Visual y Apariencia
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Sistema de diseño profesional <strong>HAIR ELENA</strong> con cuadros rectangulares compactos, bordes nítidos de 1px, acentos violetas y modo oscuro en negro neutro puro (sin tonos azul marino).
            </p>
          </div>

          {/* INDICADOR DE MODO ACTIVO EN TIEMPO REAL */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#161720] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1f2128] shrink-0">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Tema y Modo Activos
              </span>
              <span className="text-xs font-bold text-[#5b63f6] dark:text-[#818cf8]">
                HAIR ELENA • {theme === 'dark' ? 'Modo Oscuro (Negro Puro)' : 'Modo Claro (Gris Perla)'}
              </span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECCIÓN: SELECTOR DE MODO DE COLOR (CLARO U OSCURO)                   */}
      {/* ===================================================================== */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            1. Seleccionar Modo de Color
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Alterna entre Modo Oscuro (negro neutro puro inspirado en la captura de referencia) y Modo Claro (gris perla minimalista).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tarjeta Modo Oscuro */}
          <div
            onClick={() => handleSelectColorMode('dark')}
            className={`group relative flex flex-col justify-between p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left select-none ${
              theme === 'dark'
                ? 'border-[#5b63f6] bg-[#121318] shadow-lg shadow-[#5b63f6]/10 ring-2 ring-[#5b63f6]/20'
                : 'border-slate-200 dark:border-[#1f2128] bg-white/70 dark:bg-[#121318]/50 hover:border-[#5b63f6]/60 hover:bg-white dark:hover:bg-[#121318]'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-[#818cf8]" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Modo Oscuro (Referencia POS)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148]">
                    Negro Puro
                  </span>
                </div>

                {theme === 'dark' ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#5b63f6] text-white shadow-xs shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Activo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-[#1a1b22] text-slate-500 group-hover:text-[#5b63f6] transition shrink-0">
                    Seleccionar
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                Fondo negro neutro profundo (<code className="text-[#818cf8] font-mono">#0a0b0e</code>), barras y carrito (<code className="text-[#818cf8] font-mono">#0d0e12</code>), tarjetas (<code className="text-[#818cf8] font-mono">#121318</code>) y acentos violetas (<code className="text-[#818cf8] font-mono">#5b63f6</code>). Cero tonos azul marino.
              </p>

              {/* Muestra visual oscura */}
              <div className="p-3 rounded-xl bg-[#0a0b0e] border border-[#1f2128] text-white space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Lienzo Negro Neutro</span>
                  <span className="text-[#818cf8]">Acento Violeta</span>
                </div>
                <div className="p-2.5 bg-[#121318] border border-[#1f2128] rounded-lg shadow-xs flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Balayage & Corte</span>
                  <span className="font-bold text-[#5b63f6] font-mono">₲ 350.000</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-3">
              <button
                type="button"
                onClick={() => handleSelectColorMode('dark')}
                className={`w-full py-2 px-3 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  theme === 'dark'
                    ? 'bg-[#5b63f6] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#1a1b22] hover:bg-slate-200 dark:hover:bg-[#222430] text-slate-700 dark:text-slate-300'
                }`}
              >
                {theme === 'dark' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Modo Oscuro Activo
                  </>
                ) : (
                  <>Activar Modo Oscuro</>
                )}
              </button>
            </div>
          </div>

          {/* Tarjeta Modo Claro */}
          <div
            onClick={() => handleSelectColorMode('light')}
            className={`group relative flex flex-col justify-between p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left select-none ${
              theme === 'light'
                ? 'border-[#5b63f6] bg-white shadow-lg shadow-[#5b63f6]/10 ring-2 ring-[#5b63f6]/20'
                : 'border-slate-200 dark:border-[#1f2128] bg-white/70 dark:bg-[#121318]/50 hover:border-[#5b63f6]/60 hover:bg-white dark:hover:bg-[#121318]'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Modo Claro</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Gris Perla
                  </span>
                </div>

                {theme === 'light' ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#5b63f6] text-white shadow-xs shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Activo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-[#1a1b22] text-slate-500 group-hover:text-[#5b63f6] transition shrink-0">
                    Seleccionar
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                Lienzo gris suave (<code className="text-[#5b63f6] font-mono">#f6f8fb</code>), barras y paneles en blanco puro (<code className="text-[#5b63f6] font-mono">#ffffff</code>), bordes sutiles (<code className="text-[#5b63f6] font-mono">#e8edf4</code>) y tipografía de máxima legibilidad.
              </p>

              {/* Muestra visual clara */}
              <div className="p-3 rounded-xl bg-[#f6f8fb] border border-[#e8edf4] text-slate-900 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Lienzo Luminoso</span>
                  <span className="text-[#5b63f6]">Acento Violeta</span>
                </div>
                <div className="p-2.5 bg-white border border-[#e8edf4] rounded-lg shadow-xs flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Balayage & Corte</span>
                  <span className="font-bold text-[#5b63f6] font-mono">₲ 350.000</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-3">
              <button
                type="button"
                onClick={() => handleSelectColorMode('light')}
                className={`w-full py-2 px-3 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  theme === 'light'
                    ? 'bg-[#5b63f6] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#1a1b22] hover:bg-slate-200 dark:hover:bg-[#222430] text-slate-700 dark:text-slate-300'
                }`}
              >
                {theme === 'light' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Modo Claro Activo
                  </>
                ) : (
                  <>Activar Modo Claro</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECCIÓN 2: DEMOSTRACIÓN DEL EFECTO HOVER Y RESALTADO DE CUADROS       */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-[#121318] border border-slate-200 dark:border-[#1f2128] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#5b63f6]" />
              Demostración interactiva: Resaltado de Cuadro (Hover y Selección)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pasa el cursor sobre los cuadros inferiores para experimentar el efecto de alto contraste (borde violeta, halo perimetral 2px, sombra brillante, elevación física y botón activo).
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148] self-start sm:self-auto">
            Hover Unificado POS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Servicio con selección de precio */}
          <div
            onClick={() => setDemoSelectedId('srv-1')}
            className={`modal-selectable-item group relative p-4 rounded-xl border transition-colors duration-150 flex flex-col justify-between cursor-pointer ${
              demoSelectedId === 'srv-1'
                ? 'is-selected border-[#5b63f6] dark:border-[#5b63f6] bg-indigo-50/50 dark:bg-[#161826]'
                : 'border-slate-200 dark:border-[#1f2128] bg-white dark:bg-[#121318] hover:border-[#5b63f6] dark:hover:border-[#5b63f6] hover:bg-slate-50/70 dark:hover:bg-[#161720]'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-1 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-[#1a1b2e] border border-indigo-200 dark:border-[#2d3148] flex items-center justify-center text-[#5b63f6] dark:text-[#818cf8] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-colors">
                  <Scissors className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-colors">
                  4 precios
                </span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-[#5b63f6] dark:group-hover:text-[#818cf8] transition-colors block mb-1">
                Balayage Profesional
              </span>
              <p className="text-[11px] text-slate-400 leading-tight">
                Técnica francesa con degradado e iluminación natural
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-[#1f2128] flex items-center justify-between">
              <div>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono group-hover:text-[#5b63f6] dark:group-hover:text-white transition-colors">
                  ₲ 350.000
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">SER001</span>
              </div>
              <span className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-colors flex items-center gap-1">
                <span>Elegir</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 2: Modalidad / Precio de Servicio */}
          <div
            onClick={() => setDemoSelectedId('srv-2')}
            className={`modal-selectable-item group relative p-4 rounded-xl border transition-colors duration-150 flex flex-col justify-between cursor-pointer ${
              demoSelectedId === 'srv-2'
                ? 'is-selected border-[#5b63f6] dark:border-[#5b63f6] bg-indigo-50/50 dark:bg-[#161826]'
                : 'border-slate-200 dark:border-[#1f2128] bg-white dark:bg-[#121318] hover:border-[#5b63f6] dark:hover:border-[#5b63f6] hover:bg-slate-50/70 dark:hover:bg-[#161720]'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-1 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-[#1a1b2e] border border-indigo-200 dark:border-[#2d3148] flex items-center justify-center text-[#5b63f6] dark:text-[#818cf8] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-colors">
                  <Tag className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <Clock className="w-3 h-3 text-[#5b63f6]" />
                  <span>120 min</span>
                </div>
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-[#5b63f6] dark:group-hover:text-[#818cf8] transition-colors block mb-1">
                Cabello Extra Largo
              </span>
              <p className="text-[11px] text-slate-400 leading-tight">
                Modalidad para melenas que superan la línea de hombros
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-[#1f2128] flex items-center justify-between">
              <div>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono group-hover:text-[#5b63f6] dark:group-hover:text-white transition-colors">
                  ₲ 420.000
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">VAR003</span>
              </div>
              <span className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-colors flex items-center gap-1">
                <span>Seleccionar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 3: Estilista / Profesional */}
          <div
            onClick={() => setDemoSelectedId('srv-3')}
            className={`modal-selectable-item group relative p-4 rounded-xl border transition-colors duration-150 flex flex-col justify-between cursor-pointer ${
              demoSelectedId === 'srv-3'
                ? 'is-selected border-[#5b63f6] dark:border-[#5b63f6] bg-indigo-50/50 dark:bg-[#161826]'
                : 'border-slate-200 dark:border-[#1f2128] bg-white dark:bg-[#121318] hover:border-[#5b63f6] dark:hover:border-[#5b63f6] hover:bg-slate-50/70 dark:hover:bg-[#161720]'
            }`}
          >
            <div>
              <div className="flex items-center gap-3 mb-2.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  demoSelectedId === 'srv-3'
                    ? 'bg-[#5b63f6] text-white shadow-xs'
                    : 'bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6]'
                }`}>
                  VA
                </div>
                <div>
                  <span className={`font-bold text-sm block transition-colors ${
                    demoSelectedId === 'srv-3'
                      ? 'text-slate-900 dark:text-white font-extrabold'
                      : 'text-slate-900 dark:text-white group-hover:text-[#5b63f6] dark:group-hover:text-[#818cf8]'
                  }`}>
                    Valeria Ayala
                  </span>
                  <span className="text-[10px] text-slate-400">Colorista Senior • 40% com.</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Especialista en mechas balayage, babylights y rubios nórdicos
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-[#1f2128] flex items-center justify-between">
              <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Disponible
              </span>
              {demoSelectedId === 'srv-3' ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#5b63f6] text-white shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                  Seleccionado
                </span>
              ) : (
                <span className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-colors flex items-center gap-1">
                  <span>Elegir</span>
                  <UserCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
