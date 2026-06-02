import React from 'react';
import type { CasePhaseFilter } from '../casePhaseFilterEngine';

export type CasePhaseSegmentedControlProps = {
    value: CasePhaseFilter;
    onChange: (value: CasePhaseFilter) => void;
    className?: string;
    /** تسميات بديلة (مثلاً مسارات التتبع بدل الطلبات) */
    labelOverrides?: Partial<Record<CasePhaseFilter, string>>;
    ariaLabel?: string;
};

const DEFAULT_OPTIONS: { value: CasePhaseFilter; label: string }[] = [
    { value: 'all', label: 'الكل' },
    { value: 'investigation', label: 'قرارات التحقيق' },
    { value: 'trial', label: 'قرارات المحكمة المختصة' },
];

export const CasePhaseSegmentedControl = ({
    value,
    onChange,
    className,
    labelOverrides,
    ariaLabel = 'فلتر مرحلة القرارات',
}: CasePhaseSegmentedControlProps) => (
    <div
        className={`inline-flex flex-wrap rounded-xl border border-slate-600/55 bg-slate-950/60 p-1 gap-1 ${className ?? ''}`}
        role="tablist"
        aria-label={ariaLabel}
    >
        {DEFAULT_OPTIONS.map((opt) => {
            const active = value === opt.value;
            const label = labelOverrides?.[opt.value] ?? opt.label;
            return (
                <button
                    key={opt.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onChange(opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition whitespace-nowrap ${
                        active
                            ? 'bg-[#E6C673] text-[#0B1021] shadow-sm'
                            : 'text-white/60 hover:text-white hover:bg-slate-800/70'
                    }`}
                >
                    {label}
                </button>
            );
        })}
    </div>
);
