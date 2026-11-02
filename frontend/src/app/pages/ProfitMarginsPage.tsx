import React, { useState } from 'react';
import { TrendingUp, HandCoins } from 'lucide-react';
import { ProfitSettingsView } from '../../features/settings/ProfitSettingsView';
import { UtilitySettingsView } from '../../features/settings/UtilitySettingsView';

type MarginsTab = 'margins' | 'utility';

const TABS: Array<{ id: MarginsTab; label: string; icon: React.ElementType }> = [
  { id: 'margins', label: 'Márgenes y ganancias', icon: TrendingUp },
  { id: 'utility', label: 'Utilidad', icon: HandCoins },
];

export const ProfitMarginsPage: React.FC = () => {
  const [tab, setTab] = useState<MarginsTab>('margins');

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="shrink-0 px-6 pt-4 border-b border-slate-200 dark:border-slate-800 flex gap-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition cursor-pointer ${
              tab === t.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'margins' ? <ProfitSettingsView /> : <UtilitySettingsView />}
      </div>
    </div>
  );
};
