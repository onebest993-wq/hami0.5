import React, { type ReactNode } from 'react';
import type { ProceduralContainer } from '../../proceduralContainersEngine';
import { DRAG_MIME } from './dragUtils';
import { containerSurfaceClass } from './primitives';
import type { ProceduralTreeContext } from './ProceduralContainerTreeNode';

export type ProceduralContainerTreeDragShellProps = {
    ctx: ProceduralTreeContext;
    container: ProceduralContainer;
    isRoot: boolean;
    isPrimaryBranch: boolean;
    pathDone: boolean;
    pathActive: boolean;
    locked: boolean;
    dimAsInvestigationLegacy: boolean;
    shellDepth: number;
    prevent: (e: React.DragEvent) => void;
    children: ReactNode;
};

/**
 * غلاف السحب/الإفلات لحاوية المسار — مستخرَج حرفياً من ProceduralContainerTreeNode.
 */
export function ProceduralContainerTreeDragShell({
    ctx,
    container,
    isRoot,
    isPrimaryBranch,
    pathDone,
    pathActive,
    locked,
    dimAsInvestigationLegacy,
    shellDepth,
    prevent,
    children,
}: ProceduralContainerTreeDragShellProps) {
    const { readOnly, dragRootId, setDragRootId, handleRootDrop, handleDropOnContainer } = ctx;

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
            {children}
        </div>
    );
}
