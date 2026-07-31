import React from 'react';
import type { JourneyNode } from '@/app/types/criminal';
import type { CriminalStoreState } from '../../criminalStoreState.types';
import {
    childProceduralNumber,
    pathStatusLabel,
    type ProceduralActionItem,
    type ProceduralContainer,
    type ProceduralNoteItem,
    type ProceduralParentNumber,
    type ProceduralSearchVisibility,
} from '../../proceduralContainersEngine';
import { type ProceduralItemLink } from '../../proceduralItemLink';
import {
    caseRecordPhaseShortLabel,
    isInvestigationClosedProceduralRoot,
    resolveProceduralRootCasePhase,
    type CasePhaseFilter,
} from '../../casePhaseFilterEngine';
import { DRAG_MIME } from './dragUtils';
import {
    BranchKindBadge,
    InPathStepConnector,
    PathFoldToggle,
    RootKindBadge,
    RowMenu,
    StructuralIndexPill,
    SubItemsAriadneThread,
    SubItemThreadNode,
    buildStructuralLaneCaption,
    containerSurfaceClass,
} from './primitives';
import { ActionRow, NoteRow } from './ProceduralItemRows';
import type { ActionModalMode, AdvanceModalMode, ContainerModalMode, NoteModalMode, StructuralTone } from './types';

export type ProceduralContextDisplay = (
    item: ProceduralNoteItem | ProceduralActionItem,
) => { line: string | null; link?: ProceduralItemLink; linkBroken?: boolean };

export type ProceduralTreeContext = {
    caseId: string;
    readOnly: boolean;
    hasTrialPhase: boolean;
    stageJourney: JourneyNode[];
    pathsPhaseFilter: CasePhaseFilter;
    searchVisibility: ProceduralSearchVisibility;
    navExpandIds: Set<string>;
    dragRootId: string | null;
    setDragRootId: (id: string | null) => void;
    focusActionId: string | null;
    focusNoteId: string | null;
    onOpenLinkedRecord?: (link: ProceduralItemLink) => void;
    proceduralContextDisplay: ProceduralContextDisplay;
    toggleContainerFold: (containerId: string, currentlyCollapsed: boolean) => void;
    handleRootDrop: (targetId: string) => (e: React.DragEvent) => void;
    handleDropOnContainer: (parentId: string) => (e: React.DragEvent) => void;
    handleDropOnSubList: (parentId: string, toIndex: number) => (e: React.DragEvent) => void;
    updateContainer: CriminalStoreState['updateProceduralContainer'];
    duplicateContainer: CriminalStoreState['duplicateProceduralContainer'];
    duplicateSubItem: CriminalStoreState['duplicateProceduralSubItem'];
    updateSubItem: CriminalStoreState['updateProceduralSubItem'];
    deleteSubItem: CriminalStoreState['deleteProceduralSubItem'];
    setContainerModal: (mode: ContainerModalMode) => void;
    setConfirmDeleteId: (id: string | null) => void;
    setAddChildParentId: (id: string | null) => void;
    setNoteModal: (mode: NoteModalMode) => void;
    setActionModal: (mode: ActionModalMode) => void;
    setAdvanceModal: (mode: AdvanceModalMode) => void;
};

export const ProceduralContainerTreeNode = ({
    ctx,
    container,
    depth,
    isRoot,
    pathLocked = false,
    parentNumber = [1],
}: {
    ctx: ProceduralTreeContext;
    container: ProceduralContainer;
    depth: number;
    isRoot: boolean;
    pathLocked?: boolean;
    parentNumber?: ProceduralParentNumber;
}) => {
    const {
        caseId,
        readOnly,
        hasTrialPhase,
        stageJourney,
        pathsPhaseFilter,
        searchVisibility,
        navExpandIds,
        dragRootId,
        setDragRootId,
        focusActionId,
        focusNoteId,
        onOpenLinkedRecord,
        proceduralContextDisplay,
        toggleContainerFold,
        handleRootDrop,
        handleDropOnContainer,
        handleDropOnSubList,
        updateContainer,
        duplicateContainer,
        duplicateSubItem,
        updateSubItem,
        deleteSubItem,
        setContainerModal,
        setConfirmDeleteId,
        setAddChildParentId,
        setNoteModal,
        setActionModal,
        setAdvanceModal,
    } = ctx;

    if (searchVisibility.active && !searchVisibility.visibleContainerIds.has(container.id)) {
        return null;
    }
    const collapsed = container.collapsed === true && !navExpandIds.has(container.id);
    const pathDone = isRoot && container.pathStatus === 'completed';
    const pathActive = isRoot && container.pathStatus !== 'completed';
    const locked = pathLocked || pathDone;
    const insideReadOnly = readOnly || locked;
    const prevent = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const isPrimaryBranch = !isRoot && container.branchRole === 'primary';
    const laneCaption = buildStructuralLaneCaption({
        isRoot,
        pathDone,
        parentNumber,
        isPrimaryBranch,
        subItemCount: container.subItems.length,
    });
    const indexTone: StructuralTone = isRoot ? 'root' : isPrimaryBranch ? 'primary' : 'sub';
    const canEditInside = !readOnly && !locked;
    const itemSurfaceDepth = depth + 1;
    const shellDepth = isRoot ? 0 : depth;
    const rootPhase =
        isRoot && hasTrialPhase ? resolveProceduralRootCasePhase(container, stageJourney) : null;
    /**
     * عند عرض المحاكمة بمُرشّح «الكل»: نُبهّت بصرياً مسارات التحقيق المُغلقة
     * كي يَبقى التمييز واضحاً وإن ظَهرت في القائمة.
     */
    const dimAsInvestigationLegacy =
        isRoot &&
        hasTrialPhase &&
        pathsPhaseFilter === 'all' &&
        isInvestigationClosedProceduralRoot(container, stageJourney);

    return (
        <div
            key={container.id}
            id={`procedural-container-${container.id}`}
            draggable={isRoot && !readOnly && pathActive && !locked}
            onDragStart={(e) => {
                if (!isRoot || readOnly || !pathActive || locked) return;
                e.dataTransfer.setData(
                    DRAG_MIME,
                    JSON.stringify({ kind: 'root', id: container.id, fromParentId: null }),
                );
                setDragRootId(container.id);
            }}
            onDragOver={
                isRoot
                    ? (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                      }
                    : prevent
            }
            onDrop={isRoot ? handleRootDrop(container.id) : undefined}
            className={`rounded-xl transition overflow-hidden ${
                isRoot
                    ? `border border-slate-600/40 border-e-4 shadow-lg shadow-black/25 ${containerSurfaceClass(shellDepth)} ${
                          pathDone ? 'opacity-90' : ''
                      }`
                    : `border pe-4 sm:pe-6 ms-1 ${containerSurfaceClass(shellDepth, isPrimaryBranch)} ${
                          isPrimaryBranch
                              ? 'border-slate-600/45 border-e-[3px] border-e-[#E6C673]/55'
                              : 'border-slate-600/45 border-e border-dashed border-slate-600/55'
                      }`
            } ${isRoot && dragRootId === container.id ? 'opacity-50' : ''} ${
                isRoot && pathActive && !readOnly ? 'cursor-grab active:cursor-grabbing' : ''
            } ${dimAsInvestigationLegacy ? 'opacity-60' : ''}`}
            style={isRoot ? { borderInlineEndColor: container.color } : { borderInlineEndColor: `${container.color}55` }}
            onDragOverCapture={!isRoot ? prevent : undefined}
            onDropCapture={!isRoot ? handleDropOnContainer(container.id) : undefined}
        >
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

            {!collapsed ? (
                <div
                    className={`px-3 py-3 ${!isRoot ? `bg-slate-950/${Math.max(12, 24 - depth * 3)}` : ''}`}
                >
                    {isRoot ? (
                        <div className="text-[10px] font-black text-[#E6C673]/75 mb-2 flex items-center gap-1">
                            <span>●</span> بداية المسار — وسّع لبناء المراحل والإجراءات بالداخل
                        </div>
                    ) : null}
                    {container.subItems.length === 0 ? (
                        <div
                            className="rounded-lg border border-dashed border-slate-600/45 px-3 py-4 text-center text-white/40 text-[11px] font-bold"
                            onDragOver={insideReadOnly ? undefined : prevent}
                            onDrop={insideReadOnly ? undefined : handleDropOnSubList(container.id, 0)}
                        >
                            {locked
                                ? 'لا عناصر — المسار مغلق للمراجعة فقط'
                                : isRoot
                                  ? 'المسار فارغ — أضف مراحل وإجراءات داخله (الترتيب من الأعلى للأسفل)'
                                  : 'فارغ — أضف إجراءً أو ملاحظة'}
                        </div>
                    ) : (
                        <SubItemsAriadneThread depth={itemSurfaceDepth}>
                            {container.subItems.map((item, idx) => {
                                const childNumber = childProceduralNumber(parentNumber, idx);
                                const ctxDisplay =
                                    item.type === 'note' || item.type === 'action'
                                        ? proceduralContextDisplay(item)
                                        : null;
                                return (
                                <SubItemThreadNode key={item.type === 'container' ? item.container.id : item.id}>
                                    {idx > 0 ? <InPathStepConnector /> : null}
                                    {item.type === 'note' ? (
                                        <NoteRow
                                            note={item}
                                            parentNumber={childNumber}
                                            surfaceDepth={itemSurfaceDepth}
                                            contextLine={ctxDisplay?.line ?? undefined}
                                            contextLink={ctxDisplay?.link}
                                            contextLinkBroken={ctxDisplay?.linkBroken}
                                            searchHighlight={searchVisibility.matchedItemIds.has(item.id)}
                                            focusPulse={focusNoteId === item.id}
                                            onOpenLinkedRecord={onOpenLinkedRecord}
                                            parentId={container.id}
                                            readOnly={insideReadOnly}
                                            onEdit={() => setNoteModal({ parentId: container.id, note: item })}
                                            onClone={
                                                insideReadOnly
                                                    ? undefined
                                                    : () => duplicateSubItem(caseId, container.id, item.id)
                                            }
                                            onToggleStar={
                                                insideReadOnly
                                                    ? undefined
                                                    : () =>
                                                          updateSubItem(caseId, container.id, item.id, {
                                                              isStarred: item.isStarred !== true,
                                                          })
                                            }
                                            onDelete={() => deleteSubItem(caseId, container.id, item.id)}
                                            onDragOver={insideReadOnly ? undefined : prevent}
                                            onDrop={
                                                insideReadOnly
                                                    ? undefined
                                                    : handleDropOnSubList(container.id, idx)
                                            }
                                        />
                                    ) : null}
                                    {item.type === 'action' ? (
                                        <ActionRow
                                            action={item}
                                            parentNumber={childNumber}
                                            surfaceDepth={itemSurfaceDepth}
                                            focusPulse={focusActionId === item.id}
                                            contextLine={ctxDisplay?.line ?? undefined}
                                            contextLink={ctxDisplay?.link}
                                            contextLinkBroken={ctxDisplay?.linkBroken}
                                            searchHighlight={searchVisibility.matchedItemIds.has(item.id)}
                                            onOpenLinkedRecord={onOpenLinkedRecord}
                                            parentId={container.id}
                                            readOnly={insideReadOnly}
                                            onEdit={() =>
                                                setActionModal({ parentId: container.id, action: item })
                                            }
                                            onClone={
                                                insideReadOnly
                                                    ? undefined
                                                    : () => duplicateSubItem(caseId, container.id, item.id)
                                            }
                                            onToggleStar={
                                                insideReadOnly
                                                    ? undefined
                                                    : () =>
                                                          updateSubItem(caseId, container.id, item.id, {
                                                              isStarred: item.isStarred !== true,
                                                          })
                                            }
                                            onDelete={() => deleteSubItem(caseId, container.id, item.id)}
                                            onAdvance={() =>
                                                setAdvanceModal({
                                                    parentId: container.id,
                                                    actionId: item.id,
                                                    actionTitle: item.title,
                                                })
                                            }
                                            onDragOver={insideReadOnly ? undefined : prevent}
                                            onDrop={
                                                insideReadOnly
                                                    ? undefined
                                                    : handleDropOnSubList(container.id, idx)
                                            }
                                        />
                                    ) : null}
                                    {item.type === 'container' ? (
                                        <div
                                            draggable={!insideReadOnly}
                                            onDragStart={(e) => {
                                                if (insideReadOnly) return;
                                                e.dataTransfer.setData(
                                                    DRAG_MIME,
                                                    JSON.stringify({
                                                        kind: 'container',
                                                        id: item.container.id,
                                                        fromParentId: container.id,
                                                    }),
                                                );
                                                e.stopPropagation();
                                            }}
                                            onDragOver={insideReadOnly ? undefined : prevent}
                                            onDrop={
                                                insideReadOnly
                                                    ? undefined
                                                    : handleDropOnSubList(container.id, idx)
                                            }
                                            className={`relative mt-1 pe-1 ${
                                                item.container.branchRole === 'primary'
                                                    ? 'border-e-[3px] border-e-[#E6C673]/50'
                                                    : 'border-e border-dashed border-slate-600/40'
                                            }`}
                                        >
                                            <ProceduralContainerTreeNode
                                                ctx={ctx}
                                                container={item.container}
                                                depth={depth + 1}
                                                isRoot={false}
                                                pathLocked={locked}
                                                parentNumber={childNumber}
                                            />
                                        </div>
                                    ) : null}
                                </SubItemThreadNode>
                                );
                            })}
                        </SubItemsAriadneThread>
                    )}

                    {canEditInside ? (
                        <div className="mt-3 space-y-2">
                            {isRoot ? (
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setContainerModal({
                                                kind: 'create-nested',
                                                parentId: container.id,
                                                branchRole: 'primary',
                                            })
                                        }
                                        className="flex-1 min-w-[7.5rem] rounded-lg border border-[#E6C673]/45 bg-[#E6C673]/10 py-2 text-[11px] font-black text-[#E6C673] hover:bg-[#E6C673]/20 transition"
                                    >
                                        + مسار أساسي
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setContainerModal({
                                                kind: 'create-nested',
                                                parentId: container.id,
                                                branchRole: 'sub',
                                            })
                                        }
                                        className="flex-1 min-w-[7.5rem] rounded-lg border border-slate-600/55 py-2 text-[11px] font-black text-white/70 hover:text-white hover:border-slate-500 transition"
                                    >
                                        + مسار فرعي
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setContainerModal({
                                            kind: 'create-nested',
                                            parentId: container.id,
                                            branchRole: 'sub',
                                        })
                                    }
                                    className="w-full rounded-lg border border-slate-600/55 py-2 text-[11px] font-black text-white/70 hover:text-white hover:border-slate-500 transition"
                                >
                                    + مسار فرعي
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setAddChildParentId(container.id)}
                                className="w-full rounded-lg border border-dashed border-slate-600/50 py-2 text-[11px] font-black text-white/55 hover:text-[#E6C673] hover:border-[#E6C673]/40 transition"
                            >
                                + ملاحظة أو إجراء
                            </button>
                        </div>
                    ) : null}
                    {locked && isRoot ? (
                        <div className="mt-2 text-center text-[10px] font-bold text-white/35">
                            مسار منتهٍ — للمراجعة فقط (أعد فتحه من الأعلى للتعديل)
                        </div>
                    ) : null}
                    {isRoot && pathDone ? (
                        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/25 px-3 py-2.5 text-center">
                            <div className="text-[11px] font-black text-emerald-200">● نهاية المسار</div>
                            {container.pathEndedAt ? (
                                <div className="text-[10px] text-white/45 font-bold mt-0.5" dir="ltr">
                                    {container.pathEndedAt}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};
