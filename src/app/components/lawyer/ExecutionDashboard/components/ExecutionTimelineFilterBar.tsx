import React, { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    executionTimelineFilterShortLabel,
    type ExecutionTimelineFilterLabel,
} from '@/app/utils/timelineCategoryFilter';

export type ExecutionTimelineFilterBarProps = {
    activeTimelineFilter: string;
    setActiveTimelineFilter: Dispatch<SetStateAction<string>>;
    timelineFilterOptions: readonly ExecutionTimelineFilterLabel[];
    filterCounts: Record<string, number>;
    filterChipRefs?: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
    hasSubFiles?: boolean;
    showOnlyActiveFileTimeline?: boolean;
    setShowOnlyActiveFileTimeline?: Dispatch<SetStateAction<boolean>>;
};

function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const ExecutionTimelineFilterBar: React.FC<ExecutionTimelineFilterBarProps> = ({
    activeTimelineFilter,
    setActiveTimelineFilter,
    timelineFilterOptions,
    filterCounts,
    filterChipRefs,
    hasSubFiles = false,
    showOnlyActiveFileTimeline,
    setShowOnlyActiveFileTimeline,
}) => {
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const localChipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const activeCount = filterCounts[activeTimelineFilter] ?? 0;

    const bindChipRef = useCallback(
        (label: string, el: HTMLButtonElement | null) => {
            localChipRefs.current[label] = el;
            if (filterChipRefs) filterChipRefs.current[label] = el;
        },
        [filterChipRefs],
    );

    useEffect(() => {
        const el = localChipRefs.current[activeTimelineFilter];
        if (!el) return;
        el.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'nearest',
            inline: 'center',
        });
    }, [activeTimelineFilter]);

    return (
        <div className="space-y-2.5 pb-3" dir="rtl">
            <div className="flex items-center justify-between gap-2 px-0.5">
                <p className="text-[11px] font-semibold text-slate-400">تصفية السجل</p>
                <p className="text-[10px] tabular-nums text-amber-200/70">
                    <span className="font-bold text-amber-100/90">{activeCount}</span>
                    <span className="text-slate-500"> حدث</span>
                    {activeTimelineFilter !== 'الكل' ? (
                        <span className="text-slate-600"> · {executionTimelineFilterShortLabel(activeTimelineFilter)}</span>
                    ) : null}
                </p>
            </div>

            <div className="relative">
                <div
                    ref={scrollerRef}
                    role="tablist"
                    aria-label="تصفية أحداث السجل الزمني"
                    className="flex gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory pb-0.5"
                >
                    {timelineFilterOptions.map((label) => {
                        const count = filterCounts[label] ?? 0;
                        const active = activeTimelineFilter === label;
                        const short = executionTimelineFilterShortLabel(label);
                        const showCount = label === 'الكل' ? count > 0 : count > 0;

                        return (
                            <button
                                key={label}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                title={label}
                                ref={(el) => bindChipRef(label, el)}
                                onClick={() => setActiveTimelineFilter(label)}
                                className={`snap-start inline-flex min-h-[44px] shrink-0 touch-manipulation items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors ${
                                    active
                                        ? 'border-[#E6C673]/45 bg-[#E6C673]/15 text-[#F4E4B0] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                                        : 'border-white/[0.08] bg-[#0B1120]/80 text-slate-400 hover:border-white/15 hover:text-slate-200'
                                }`}
                            >
                                <span className="whitespace-nowrap">{short}</span>
                                {showCount ? (
                                    <span
                                        className={`inline-flex min-w-[1.15rem] items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-bold tabular-nums leading-none ${
                                            active
                                                ? 'bg-[#E6C673]/25 text-[#E6C673]'
                                                : 'bg-white/[0.06] text-slate-500'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                </div>
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-[#0A0F1C]/90 to-transparent"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-[#0A0F1C]/90 to-transparent"
                />
            </div>

            {hasSubFiles && setShowOnlyActiveFileTimeline ? (
                <button
                    type="button"
                    onClick={() => setShowOnlyActiveFileTimeline((v) => !v)}
                    className={`inline-flex min-h-[44px] w-full touch-manipulation items-center justify-center rounded-xl border px-3 text-[10px] font-semibold transition-colors ${
                        showOnlyActiveFileTimeline
                            ? 'border-indigo-400/35 bg-indigo-500/10 text-indigo-100'
                            : 'border-white/[0.08] bg-[#0B1120]/60 text-slate-400 hover:text-slate-200'
                    }`}
                >
                    {showOnlyActiveFileTimeline
                        ? 'عرض أحداث الإضبارتين'
                        : 'أحداث الإضبارة المحددة فقط'}
                </button>
            ) : null}
        </div>
    );
};
