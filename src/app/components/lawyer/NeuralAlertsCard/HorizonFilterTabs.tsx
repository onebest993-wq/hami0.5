import React from 'react';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';

const TAB_META: Record<
    AlertTimeHorizon,
    { label: string; activeClass: string; idleClass: string }
> = {
    urgent: {
        label: 'عاجل',
        activeClass: 'border-red-500/45 bg-red-500/20 text-red-200',
        idleClass: 'border-white/10 bg-white/5 text-white/50 hover:text-red-200/90',
    },
    near: {
        label: '3–4 أيام',
        activeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
        idleClass: 'border-white/10 bg-white/5 text-white/50 hover:text-amber-200/90',
    },
    upcoming: {
        label: 'قادمة',
        activeClass: 'border-sky-500/35 bg-sky-500/15 text-sky-200',
        idleClass: 'border-white/10 bg-white/5 text-white/50 hover:text-sky-300/90',
    },
};

type HorizonFilterTabsProps = {
    counts: Record<AlertTimeHorizon, number>;
    activeFilter: AlertTimeHorizon;
    onChange: (filter: AlertTimeHorizon) => void;
};

export const HorizonFilterTabs: React.FC<HorizonFilterTabsProps> = ({
    counts,
    activeFilter,
    onChange,
}) => (
    <div className="flex flex-wrap gap-1 justify-end shrink-0" role="tablist" aria-label="تصفية التنبيهات الزمنية">
        {(Object.keys(TAB_META) as AlertTimeHorizon[]).map((key) => {
            const meta = TAB_META[key];
            const count = counts[key];
            const isActive = activeFilter === key;
            return (
                <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onChange(key)}
                    className={`text-[9px] font-bold min-h-[44px] px-3 py-1 rounded-full border transition-colors touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40 ${
                        isActive ? meta.activeClass : meta.idleClass
                    } ${count === 0 ? 'opacity-45' : ''}`}
                >
                    {count > 0 ? `${count} ${meta.label}` : meta.label}
                </button>
            );
        })}
    </div>
);
