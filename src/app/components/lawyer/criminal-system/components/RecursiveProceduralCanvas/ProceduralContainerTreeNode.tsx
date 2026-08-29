import React from 'react';
import type { JourneyNode } from '@/app/types/criminal';
import type { CriminalStoreState } from '../../criminalStoreState.types';
import {
    type ProceduralActionItem,
    type ProceduralContainer,
    type ProceduralNoteItem,
    type ProceduralParentNumber,
    type ProceduralSearchVisibility,
} from '../../proceduralContainersEngine';
import { type ProceduralItemLink } from '../../proceduralItemLink';
import {
    isInvestigationClosedProceduralRoot,
    resolveProceduralRootCasePhase,
    type CasePhaseFilter,
} from '../../casePhaseFilterEngine';
import {
    buildStructuralLaneCaption,
} from './primitives';
import type { ActionModalMode, AdvanceModalMode, ContainerModalMode, NoteModalMode, StructuralTone } from './types';
import { ProceduralContainerTreeDragShell } from './ProceduralContainerTreeDragShell';
import { ProceduralContainerTreeHeader } from './ProceduralContainerTreeHeader';
import { ProceduralContainerTreeChildren } from './ProceduralContainerTreeChildren';

type ProceduralContextDisplay = (
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
        readOnly,
        hasTrialPhase,
        stageJourney,
        pathsPhaseFilter,
        searchVisibility,
        navExpandIds,
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
        <ProceduralContainerTreeDragShell
            ctx={ctx}
            container={container}
            isRoot={isRoot}
            isPrimaryBranch={isPrimaryBranch}
            pathDone={pathDone}
            pathActive={pathActive}
            locked={locked}
            dimAsInvestigationLegacy={dimAsInvestigationLegacy}
            shellDepth={shellDepth}
            prevent={prevent}
        >
            <ProceduralContainerTreeHeader
                ctx={ctx}
                container={container}
                isRoot={isRoot}
                locked={locked}
                pathDone={pathDone}
                pathActive={pathActive}
                collapsed={collapsed}
                isPrimaryBranch={isPrimaryBranch}
                indexTone={indexTone}
                parentNumber={parentNumber}
                laneCaption={laneCaption}
                rootPhase={rootPhase}
            />

            {!collapsed ? (
                <ProceduralContainerTreeChildren
                    ctx={ctx}
                    container={container}
                    depth={depth}
                    isRoot={isRoot}
                    locked={locked}
                    insideReadOnly={insideReadOnly}
                    canEditInside={canEditInside}
                    pathDone={pathDone}
                    parentNumber={parentNumber}
                    itemSurfaceDepth={itemSurfaceDepth}
                    prevent={prevent}
                    renderNestedContainer={({ nested, childNumber, depth: nestedDepth, pathLocked }) => (
                        <ProceduralContainerTreeNode
                            ctx={ctx}
                            container={nested}
                            depth={nestedDepth}
                            isRoot={false}
                            pathLocked={pathLocked}
                            parentNumber={childNumber}
                        />
                    )}
                />
            ) : null}
        </ProceduralContainerTreeDragShell>
    );
};
