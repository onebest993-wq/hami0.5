import React, { useCallback, useRef } from 'react';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';

/** تبويبات البطاقة — عاجل (اليوم+غدا) · قادم (3 أيام بعد غد) */
export const HOME_HUB_ALERT_HORIZONS: AlertTimeHorizon[] = ['urgent', 'upcoming'];

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
        label: 'قادم',
        activeClass: 'border-sky-500/35 bg-sky-500/15 text-sky-200',
        idleClass: 'border-white/10 bg-white/5 text-white/50 hover:text-sky-300/90',
    },
};

type HorizonFilterTabsProps = {
    counts: Record<AlertTimeHorizon, number>;
    activeFilter: AlertTimeHorizon;
    onChange: (filter: AlertTimeHorizon) => void;
    horizons?: AlertTimeHorizon[];
    hideCounts?: boolean;
    compact?: boolean;
    /** يربط التبويب بلوحة التغذية عند وجودها — اختياري حتى لا تُفرَض معرفات الهاب على كل مستورد */
    feedId?: string;
    idPrefix?: string;
};

function adjacentHorizon(
    horizons: AlertTimeHorizon[],
    current: AlertTimeHorizon,
    delta: 1 | -1,
): AlertTimeHorizon {
    const idx = horizons.indexOf(current);
    if (idx < 0) return horizons[0] ?? current;
    return horizons[(idx + delta + horizons.length) % horizons.length] ?? current;
}

export const HorizonFilterTabs: React.FC<HorizonFilterTabsProps> = ({
    counts,
    activeFilter,
    onChange,
    horizons = HOME_HUB_ALERT_HORIZONS,
    hideCounts = false,
    compact = false,
    feedId,
    idPrefix = 'horizon',
}) => {
    const tabRefs = useRef<Partial<Record<AlertTimeHorizon, HTMLButtonElement | null>>>({});

    const selectAndFocus = useCallback(
        (key: AlertTimeHorizon) => {
            onChange(key);
            requestAnimationFrame(() => {
                tabRefs.current[key]?.focus();
            });
        },
        [onChange],
    );

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, key: AlertTimeHorizon) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            selectAndFocus(adjacentHorizon(horizons, key, event.key === 'ArrowLeft' ? 1 : -1));
            return;
        }
        if (event.key === 'Home') {
            event.preventDefault();
            const first = horizons[0];
            if (first) selectAndFocus(first);
            return;
        }
        if (event.key === 'End') {
            event.preventDefault();
            const last = horizons[horizons.length - 1];
            if (last) selectAndFocus(last);
        }
    };

    return (
        <div
            className={`flex flex-wrap gap-1 justify-end shrink-0 ${compact ? 'hami-hub-horizon-tabs--compact' : ''}`}
            role="tablist"
            aria-label="تصفية التنبيهات الزمنية"
        >
            {horizons.map((key) => {
                const meta = TAB_META[key];
                const count = counts[key];
                const isActive = activeFilter === key;
                const sizeClass = compact
                    ? 'text-[8px] font-extrabold min-h-[44px] px-2.5 py-0.5'
                    : 'text-[9px] font-bold min-h-[44px] px-3 py-1';
                return (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        id={`${idPrefix}-${key}`}
                        ref={(node) => {
                            tabRefs.current[key] = node;
                        }}
                        aria-selected={isActive}
                        aria-controls={feedId}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => onChange(key)}
                        onKeyDown={(event) => handleKeyDown(event, key)}
                        className={`${sizeClass} rounded-full border transition-colors touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40 ${
                            isActive ? meta.activeClass : meta.idleClass
                        } ${count === 0 && !hideCounts ? 'opacity-45' : ''}`}
                    >
                        {hideCounts ? meta.label : count > 0 ? `${count} ${meta.label}` : meta.label}
                    </button>
                );
            })}
        </div>
    );
};
