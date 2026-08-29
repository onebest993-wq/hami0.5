import React from 'react';
import {
    pathStatusLabel,
    type ProceduralContainer,
    type ProceduralParentNumber,
} from '../../proceduralContainersEngine';
import { caseRecordPhaseShortLabel } from '../../casePhaseFilterEngine';
import {
    BranchKindBadge,
    PathFoldToggle,
    RootKindBadge,
    RowMenu,
    StructuralIndexPill,
} from './primitives';
import type { StructuralTone } from './types';
import type { ProceduralTreeContext } from './ProceduralContainerTreeNode';

export type ProceduralContainerTreeHeaderProps = {
    ctx: ProceduralTreeContext;
    container: ProceduralContainer;
    isRoot: boolean;
    locked: boolean;
    pathDone: boolean;
    pathActive: boolean;
    collapsed: boolean;
    isPrimaryBranch: boolean;
    indexTone: StructuralTone;
    parentNumber: ProceduralParentNumber;
    laneCaption: string;
    rootPhase: 'investigation' | 'trial' | null;
};

/**
 * صف ترويسة حاوية المسار الإجرائي — مستخرَج حرفياً من ProceduralContainerTreeNode.
 */
export function ProceduralContainerTreeHeader({
    ctx,
    container,
    isRoot,
    locked,
    pathDone,
    pathActive,
    collapsed,
    isPrimaryBranch,
    indexTone,
    parentNumber,
    laneCaption,
    rootPhase,
}: ProceduralContainerTreeHeaderProps) {
    const {
        caseId,
        readOnly,
        toggleContainerFold,
        updateContainer,
        duplicateContainer,
        setContainerModal,
        setConfirmDeleteId,
    } = ctx;

    return (
        <div className="relative z-10 px-3 py-2.5 border-b border-slate-700/35 flex items-start gap-2 overflow-visible">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
                <StructuralIndexPill chain={parentNumber} tone={indexTone} />
                <PathFoldToggle
                    collapsed={collapsed}
                    onToggle={() => toggleContainerFold(container.id, collapsed)}
                />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    {isRoot ? <RootKindBadge /> : <BranchKindBadge role={isPrimaryBranch ? 'primary' : 'sub'} />}
                    <div className="text-sm font-black text-white whitespace-normal break-words">
                        {container.title}
                    </div>
                    {isRoot ? (
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                pathDone
                                    ? 'bg-slate-600/30 text-slate-300'
                                    : 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/25'
                            }`}
                        >
                            {pathStatusLabel(pathDone ? 'completed' : 'active')}
                        </span>
                    ) : null}
                    {rootPhase ? (
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black border ${
                                rootPhase === 'investigation'
                                    ? 'bg-amber-500/10 text-amber-100 border-amber-500/30'
                                    : 'bg-violet-500/10 text-violet-100 border-violet-500/30'
                            }`}
                            title={`مسار في ${caseRecordPhaseShortLabel(rootPhase)}`}
                        >
                            {caseRecordPhaseShortLabel(rootPhase)}
                        </span>
                    ) : null}
                    {!isRoot && container.icon ? (
                        <span className="text-base opacity-45" aria-hidden title="أيقونة المرحلة">
                            {container.icon}
                        </span>
                    ) : null}
                </div>
                <div className="text-[10px] font-bold text-white/55 mt-1 leading-relaxed whitespace-normal break-words">
                    {laneCaption}
                    {collapsed ? (
                        <span className="text-sky-200/80 font-black"> · مطوي — اضغط «توسيع» لعرض المحتوى</span>
                    ) : null}
                </div>
            </div>
            {isRoot && !readOnly ? (
                <div className="flex flex-wrap items-center gap-1 shrink-0 max-w-[42%] justify-end">
                    {pathActive ? (
                        <button
                            type="button"
                            onClick={() => {
                                updateContainer(caseId, container.id, {
                                    pathStatus: 'completed',
                                    pathEndedAt: new Date().toISOString().slice(0, 10),
                                });
                            }}
                            className="rounded-lg border border-emerald-500/35 px-2 py-0.5 text-[9px] font-black text-emerald-200 hover:bg-emerald-950/35 whitespace-nowrap"
                        >
                            إنهاء
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                updateContainer(caseId, container.id, {
                                    pathStatus: 'active',
                                    pathEndedAt: undefined,
                                });
                            }}
                            className="rounded-lg border border-sky-500/35 px-2 py-0.5 text-[9px] font-black text-sky-200 hover:bg-slate-800 whitespace-nowrap"
                        >
                            إعادة فتح
                        </button>
                    )}
                    {pathActive ? (
                        <button
                            type="button"
                            onClick={() => duplicateContainer(caseId, container.id)}
                            className="rounded-lg border border-slate-600/50 px-2 py-0.5 text-[9px] font-black text-white/70 hover:bg-slate-800 whitespace-nowrap"
                        >
                            نسخ
                        </button>
                    ) : null}
                </div>
            ) : null}
            {!readOnly && !locked ? (
                <RowMenu
                    onEdit={() => setContainerModal({ kind: 'edit', containerId: container.id })}
                    onDelete={() => setConfirmDeleteId(container.id)}
                />
            ) : null}
        </div>
    );
}
