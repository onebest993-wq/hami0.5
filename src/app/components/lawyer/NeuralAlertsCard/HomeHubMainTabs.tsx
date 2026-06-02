import React from 'react';
import type { HomeHubPanel } from '@/app/stores/neuralAlertsStore';

const TAB_META: Record<
    HomeHubPanel,
    { label: string; activeClass: string; idleClass: string }
> = {
    alerts: {
        label: 'التنبيهات',
        activeClass: 'border-[#D4AF37]/45 bg-[#D4AF37]/15 text-[#E6C673]',
        idleClass: 'border-white/10 bg-white/5 text-white/55 hover:text-[#E6C673]/90',
    },
    linking: {
        label: 'الربط',
        activeClass: 'border-violet-500/40 bg-violet-500/15 text-violet-200',
        idleClass: 'border-white/10 bg-white/5 text-white/55 hover:text-violet-200/90',
    },
};

type HomeHubMainTabsProps = {
    activePanel: HomeHubPanel;
    linkingCount: number;
    onChange: (panel: HomeHubPanel) => void;
};

export const HomeHubMainTabs: React.FC<HomeHubMainTabsProps> = ({
    activePanel,
    linkingCount,
    onChange,
}) => (
    <div
        className="flex flex-wrap gap-1 justify-end shrink-0"
        role="tablist"
        aria-label="وضع البطاقة العامة"
    >
        {(Object.keys(TAB_META) as HomeHubPanel[]).map((key) => {
            const meta = TAB_META[key];
            const isActive = activePanel === key;
            const countLabel =
                key === 'linking' && linkingCount > 0 ? `${linkingCount} ` : '';
            return (
                <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onChange(key)}
                    className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border transition-colors ${
                        isActive ? meta.activeClass : meta.idleClass
                    }`}
                >
                    {countLabel}
                    {meta.label}
                </button>
            );
        })}
    </div>
);
