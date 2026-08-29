import React, { type ReactNode } from 'react';
import {
    childProceduralNumber,
    type ProceduralContainer,
    type ProceduralParentNumber,
} from '../../proceduralContainersEngine';
import { DRAG_MIME } from './dragUtils';
import {
    InPathStepConnector,
    SubItemsAriadneThread,
    SubItemThreadNode,
} from './primitives';
import { ActionRow, NoteRow } from './ProceduralItemRows';
import type { ProceduralTreeContext } from './ProceduralContainerTreeNode';

export type ProceduralContainerTreeChildrenProps = {
    ctx: ProceduralTreeContext;
    container: ProceduralContainer;
    depth: number;
    isRoot: boolean;
    locked: boolean;
    insideReadOnly: boolean;
    canEditInside: boolean;
    pathDone: boolean;
    parentNumber: ProceduralParentNumber;
    itemSurfaceDepth: number;
    prevent: (e: React.DragEvent) => void;
    renderNestedContainer: (args: {
        nested: ProceduralContainer;
        childNumber: ProceduralParentNumber;
        depth: number;
        pathLocked: boolean;
    }) => ReactNode;
};

/**
 * قائمة أبناء حاوية المسار + أزرار الإضافة ونهاية المسار — مستخرَج حرفياً من ProceduralContainerTreeNode.
 * الاستدعاء التكراري يبقى في المضيف عبر renderNestedContainer.
 */
export function ProceduralContainerTreeChildren({
    ctx,
    container,
    depth,
    isRoot,
    locked,
    insideReadOnly,
    canEditInside,
    pathDone,
    parentNumber,
    itemSurfaceDepth,
    prevent,
    renderNestedContainer,
}: ProceduralContainerTreeChildrenProps) {
    const {
        caseId,
        searchVisibility,
        focusActionId,
        focusNoteId,
        onOpenLinkedRecord,
        proceduralContextDisplay,
        handleDropOnSubList,
        duplicateSubItem,
        updateSubItem,
        deleteSubItem,
        setContainerModal,
        setAddChildParentId,
        setNoteModal,
        setActionModal,
        setAdvanceModal,
    } = ctx;

    return (
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
                                    {renderNestedContainer({
                                        nested: item.container,
                                        childNumber,
                                        depth: depth + 1,
                                        pathLocked: locked,
                                    })}
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
    );
}
