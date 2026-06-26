import React from 'react';
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
    const activeCount = filterCounts[activeTimelineFilter] ?? 0;

    return (
        <div className="space-y-2 pb-3" dir="rtl">
            <p className="text-center text-[10px] text-slate-500">
                <span className="font-semibold text-slate-300">{activeTimelineFilter}</span>
                <span className="mx-1.5 text-slate-600">·</span>
                <span className="tabular-nums text-amber-200/80">{activeCount}</span>
                <span className="text-slate-600"> حدث</span>
            </p>

            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {timelineFilterOptions.map((label) => {
                    const count = filterCounts[label] ?? 0;
                    const active = activeTimelineFilter === label;
                    const short = executionTimelineFilterShortLabel(label);
                    return (
                        <button
                            key={label}
                            type="button"
                            title={label}
                            ref={
                                filterChipRefs
                                    ? (el) => {
                                          filterChipRefs.current[label] = el;
                                      }
                                    : undefined
                            }
                            onClick={() => setActiveTimelineFilter(label)}
                            className={`relative flex min-h-[2.35rem] flex-col items-center justify-center rounded-lg px-1.5 py-1.5 text-center transition-all ${
                                active
                                    ? 'border border-[#E6C673]/35 bg-[#E6C673]/12 text-amber-100 shadow-[0_0_12px_-4px_rgba(230,198,115,0.35)]'
                                    : 'border border-transparent bg-slate-800/30 text-slate-400 hover:border-slate-600/40 hover:bg-slate-800/55 hover:text-slate-200'
                            }`}
                        >
                            <span className="text-[10px] font-bold leading-tight">{short}</span>
                            {count > 0 && label !== 'الكل' ? (
                                <span
                                    className={`mt-0.5 text-[9px] font-semibold tabular-nums leading-none ${
                                        active ? 'text-amber-200/75' : 'text-slate-500'
                                    }`}
                                >
                                    {count}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>

            {hasSubFiles && setShowOnlyActiveFileTimeline ? (
                <button
                    type="button"
                    onClick={() => setShowOnlyActiveFileTimeline((v) => !v)}
                    className={`w-full rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-all ${
                        showOnlyActiveFileTimeline
                            ? 'border-indigo-500/35 bg-indigo-500/10 text-indigo-200'
                            : 'border-slate-700/35 bg-slate-800/20 text-slate-400 hover:bg-slate-800/40'
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
