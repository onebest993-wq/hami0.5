import React from 'react';
import type { ProceduralContainer, ProceduralSearchVisibility } from '../../proceduralContainersEngine';
import type { CasePhaseFilter } from '../../casePhaseFilterEngine';
import {
    ProceduralContainerTreeNode,
    type ProceduralTreeContext,
} from './ProceduralContainerTreeNode';

export type ProceduralCanvasTreePanelProps = {
    containersLength: number;
    readOnly: boolean;
    displayRoots: ProceduralContainer[];
    allContainers: ProceduralContainer[];
    searchVisibility: ProceduralSearchVisibility;
    pathsPhaseFilter: CasePhaseFilter;
    treeCtx: ProceduralTreeContext;
    onCreateRoot: () => void;
};

export function ProceduralCanvasTreePanel({
    containersLength,
    readOnly,
    displayRoots,
    allContainers,
    searchVisibility,
    pathsPhaseFilter,
    treeCtx,
    onCreateRoot,
}: ProceduralCanvasTreePanelProps) {
    if (containersLength === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-600/45 px-6 py-16 text-center gap-5">
                <p className="text-white/55 text-sm font-bold max-w-xs">
                    اللوحة فارغة. ابدأ خطتك الإجرائية الآن.
                </p>
                {!readOnly ? (
                    <button
                        type="button"
                        onClick={onCreateRoot}
                        className="rounded-xl bg-[#E6C673] text-[#0B1021] px-8 py-3 text-sm font-black hover:brightness-110 transition shadow-lg shadow-[#E6C673]/15"
                    >
                        ➕ مسار جديد
                    </button>
                ) : null}
            </div>
        );
    }

    if (displayRoots.length === 0 && searchVisibility.active) {
        return (
            <div className="rounded-xl border border-dashed border-slate-600/45 px-6 py-10 text-center text-white/45 text-sm font-bold">
                لا مسارات تطابق البحث.
            </div>
        );
    }

    if (displayRoots.length === 0 && pathsPhaseFilter !== 'all') {
        return (
            <div className="rounded-xl border border-dashed border-slate-600/45 px-6 py-10 text-center text-white/45 text-sm font-bold">
                لا مسارات في{' '}
                {pathsPhaseFilter === 'investigation' ? 'مرحلة التحقيق' : 'مرحلة المحاكمة'}.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 procedural-print-target">
            {displayRoots.map((c, mapIdx) => {
                const rootIdx = allContainers.indexOf(c);
                const showDivider = mapIdx > 0;
                return (
                    <div
                        key={c.id}
                        className={showDivider ? 'pt-6 border-t border-dashed border-slate-600/40' : ''}
                    >
                        <ProceduralContainerTreeNode
                            ctx={treeCtx}
                            container={c}
                            depth={0}
                            isRoot={true}
                            pathLocked={false}
                            parentNumber={[rootIdx + 1]}
                        />
                    </div>
                );
            })}
        </div>
    );
}
