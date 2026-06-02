import React, { memo } from 'react';
import type { DecisionsScopeFilter, DecisionsScopeOption } from '../casePhaseFilterEngine';

export type DecisionsScopeFilterBarProps = {
    value: DecisionsScopeFilter;
    onChange: (value: DecisionsScopeFilter) => void;
    options: DecisionsScopeOption[];
    className?: string;
};

const chipClass = (active: boolean): string =>
    [
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap transition-colors',
        active
            ? 'border-white/20 bg-white/10 text-white shadow-[0_0_10px_rgba(212,175,55,0.04)]'
            : 'border-transparent bg-transparent text-white/55 hover:bg-white/[0.06] hover:text-white/80',
    ].join(' ');

const countClass = (active: boolean): string =>
    `tabular-nums text-[9px] ${active ? 'text-white/75' : 'text-white/40'}`;

export const DecisionsScopeFilterBar = memo(function DecisionsScopeFilterBar({
    value,
    onChange,
    options,
    className,
}: DecisionsScopeFilterBarProps) {
    if (!options.length) return null;

    return (
        <div
            className={`w-full max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden print:hidden ${className ?? ''}`}
            dir="rtl"
        >
            <div
                className="inline-flex flex-row flex-wrap justify-center items-center gap-0.5 w-fit mx-auto bg-[#ffffff05] backdrop-blur-md border border-white/10 p-0.5 rounded-xl whitespace-nowrap"
                role="tablist"
                aria-label="فلتر مرحلة القرارات"
            >
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(opt.value)}
                        title={opt.label}
                        className={chipClass(active)}
                    >
                        <span>{opt.label}</span>
                        {opt.count > 0 ? (
                            <span className={countClass(active)} aria-hidden>
                                {opt.count}
                            </span>
                        ) : null}
                    </button>
                );
            })}
            </div>
        </div>
    );
});
