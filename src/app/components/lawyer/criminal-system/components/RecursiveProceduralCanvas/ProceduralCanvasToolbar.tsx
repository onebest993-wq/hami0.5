import React from 'react';
import { CasePhaseSegmentedControl } from '../CasePhaseSegmentedControl';
import type { CasePhaseFilter } from '../../casePhaseFilterEngine';
import type { ProceduralSearchVisibility } from '../../proceduralContainersEngine';

export type ProceduralCanvasToolbarProps = {
    pathStats: { total: number; active: number; completed: number };
    hasTrialPhase: boolean;
    containersLength: number;
    pathsPhaseFilter: CasePhaseFilter;
    onPathsPhaseFilterChange: (v: CasePhaseFilter) => void;
    searchQuery: string;
    onSearchQueryChange: (v: string) => void;
    searchVisibility: ProceduralSearchVisibility;
    readOnly: boolean;
    onCreateRoot: () => void;
};

export function ProceduralCanvasToolbar({
    pathStats,
    hasTrialPhase,
    containersLength,
    pathsPhaseFilter,
    onPathsPhaseFilterChange,
    searchQuery,
    onSearchQueryChange,
    searchVisibility,
    readOnly,
    onCreateRoot,
}: ProceduralCanvasToolbarProps) {
    return (
        <>
            <div className="space-y-2 print:hidden">
                {pathStats.total > 0 ? (
                    <div className="text-[10px] font-black text-white/50">
                        {pathStats.active} نشط · {pathStats.completed} منتهٍ · {pathStats.total} مسار
                    </div>
                ) : null}
            </div>

            {hasTrialPhase && containersLength > 0 ? (
                <CasePhaseSegmentedControl
                    value={pathsPhaseFilter}
                    onChange={onPathsPhaseFilterChange}
                    className="print:hidden"
                    ariaLabel="فلتر مرحلة مسارات التتبع"
                    labelOverrides={{
                        investigation: 'مسارات التحقيق',
                        trial: 'مسارات المحاكمة',
                    }}
                />
            ) : null}

            {containersLength > 0 ? (
                <div className="flex flex-col gap-2 print:hidden">
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                        placeholder="بحث في المسارات والملاحظات والإجراءات…"
                        className="w-full rounded-xl border border-slate-600/55 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/45 placeholder:text-white/35"
                    />
                    {searchVisibility.active ? (
                        <div className="text-[10px] font-bold text-sky-200/80">
                            {searchVisibility.matchedItemIds.size > 0
                                ? `${searchVisibility.matchedItemIds.size} نتيجة مطابقة`
                                : 'لا نتائج — جرّب كلمة أخرى'}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {containersLength > 0 && !readOnly ? (
                <div className="flex flex-wrap gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={onCreateRoot}
                        className="flex-1 min-w-[9rem] rounded-xl bg-[#E6C673] text-[#0B1021] py-2.5 text-sm font-black hover:brightness-110 transition"
                    >
                        + مسار جديد
                    </button>
                </div>
            ) : null}
        </>
    );
}
