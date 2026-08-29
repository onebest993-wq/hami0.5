import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCriminalStore } from '../criminalStore';
import {
    buildProceduralAttentionBoard,
    buildProceduralPlacementContext,
    buildProceduralSearchVisibility,
    findContainerInTree,
    type ProceduralPlacementContext,
    type ProceduralContainer,
    type ProceduralNavTarget,
} from '../proceduralContainersEngine';
import {
    filterByCasePhase,
    resolveProceduralRootCasePhase,
    resolveTrialPhasePivotMs,
    type CasePhaseFilter,
} from '../casePhaseFilterEngine';
import { parseProceduralDrag } from './RecursiveProceduralCanvas/dragUtils';
import type {
    ActionModalMode,
    AdvanceModalMode,
    ContainerModalMode,
    NoteModalMode,
} from './RecursiveProceduralCanvas/types';
import type { ProceduralTreeContext } from './RecursiveProceduralCanvas/ProceduralContainerTreeNode';
import { useProceduralCanvasOverlayEscape } from '../useProceduralCanvasOverlayEscape';
import { useProceduralCanvasFocus } from './RecursiveProceduralCanvas/useProceduralCanvasFocus';
import {
    buildProceduralContextDisplay,
    findEditingContainerInTree,
} from './RecursiveProceduralCanvas/canvasHelpers';
import { ProceduralCanvasToolbar } from './RecursiveProceduralCanvas/ProceduralCanvasToolbar';
import { ProceduralCanvasAttentionBoard } from './RecursiveProceduralCanvas/ProceduralCanvasAttentionBoard';
import { ProceduralCanvasTreePanel } from './RecursiveProceduralCanvas/ProceduralCanvasTreePanel';
import { ProceduralCanvasModalsHost } from './RecursiveProceduralCanvas/ProceduralCanvasModalsHost';
import type { ProceduralItemLink } from '../proceduralItemLink';

export type RecursiveProceduralCanvasProps = {
    caseId: string;
    readOnly?: boolean;
    onOpenLinkedRecord?: (link: ProceduralItemLink) => void;
    /** انتقال من تبويب آخر (طلب/تايم لاين) */
    navTarget?: ProceduralNavTarget | null;
    onNavTargetHandled?: () => void;
};

/**
 * لوحة مسارات التتبع الإجرائي — نصوص وإجراءات حرة يدوياً.
 * دورة حياة جلسات المحاكمة والأحكام الفورية تُدار حصرياً من تبويب «المحاكمات» (trials[]).
 */

export const RecursiveProceduralCanvas = ({
    caseId,
    readOnly = false,
    onOpenLinkedRecord,
    navTarget,
    onNavTargetHandled,
}: RecursiveProceduralCanvasProps) => {
    const caseRow = useCriminalStore((s) => s.casesById[caseId]);
    const containers = Array.isArray(caseRow?.proceduralContainers) ? caseRow.proceduralContainers : [];
    const addRoot = useCriminalStore((s) => s.addRootProceduralContainer);
    const updateContainer = useCriminalStore((s) => s.updateProceduralContainer);
    const deleteContainer = useCriminalStore((s) => s.deleteProceduralContainer);
    const reorderRoot = useCriminalStore((s) => s.reorderRootProceduralContainers);
    const addSubItem = useCriminalStore((s) => s.addProceduralSubItem);
    const updateSubItem = useCriminalStore((s) => s.updateProceduralSubItem);
    const deleteSubItem = useCriminalStore((s) => s.deleteProceduralSubItem);
    const duplicateSubItem = useCriminalStore((s) => s.duplicateProceduralSubItem);
    const moveSubItem = useCriminalStore((s) => s.moveProceduralSubItem);
    const moveContainer = useCriminalStore((s) => s.moveProceduralContainer);
    const advanceAction = useCriminalStore((s) => s.advanceProceduralActionPhase);
    const duplicateContainer = useCriminalStore((s) => s.duplicateProceduralContainer);

    const [containerModal, setContainerModal] = useState<ContainerModalMode>(null);
    const [addChildParentId, setAddChildParentId] = useState<string | null>(null);
    const [noteModal, setNoteModal] = useState<NoteModalMode>(null);
    const [actionModal, setActionModal] = useState<ActionModalMode>(null);
    const [advanceModal, setAdvanceModal] = useState<AdvanceModalMode>(null);
    const [dragRootId, setDragRootId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [attentionOpen, setAttentionOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const {
        navExpandIds,
        setNavExpandIds,
        focusActionId,
        focusNoteId,
        focusActionInCanvas,
        focusNoteInCanvas,
        focusContainerInCanvas,
    } = useProceduralCanvasFocus(containers);

    const closeConfirmDelete = useCallback(() => setConfirmDeleteId(null), []);
    const closeAdvanceModal = useCallback(() => setAdvanceModal(null), []);
    const closeAddChild = useCallback(() => setAddChildParentId(null), []);
    const closeNoteModal = useCallback(() => setNoteModal(null), []);
    const closeActionModal = useCallback(() => setActionModal(null), []);
    const closeContainerModal = useCallback(() => setContainerModal(null), []);
    useProceduralCanvasOverlayEscape({
        confirmDeleteOpen: confirmDeleteId !== null,
        advanceModalOpen: advanceModal !== null,
        addChildOpen: addChildParentId !== null,
        noteModalOpen: noteModal !== null,
        actionModalOpen: actionModal !== null,
        containerModalOpen: containerModal !== null,
        onCloseConfirmDelete: closeConfirmDelete,
        onCloseAdvanceModal: closeAdvanceModal,
        onCloseAddChild: closeAddChild,
        onCloseNoteModal: closeNoteModal,
        onCloseActionModal: closeActionModal,
        onCloseContainerModal: closeContainerModal,
    });

    const stageJourney = Array.isArray(caseRow?.stageJourney) ? caseRow.stageJourney : [];
    const hasTrialPhase = resolveTrialPhasePivotMs(stageJourney) != null;

    /**
     * مرشّح المرحلة للمسارات الإجرائية:
     *   • قبل وجود مرحلة محاكمة ⇒ `'all'` (لا قائمة اختيار حيث لا يوجد فصل بعد).
     *   • مع وجود مرحلة محاكمة ⇒ يَبدأ افتراضياً عند `'trial'` لإخفاء مسارات التحقيق المُغلقة،
     *     ويُمكن للمستخدم التَوسعة يدوياً عبر شريط الترشيح.
     */
    const [pathsPhaseFilter, setPathsPhaseFilter] = useState<CasePhaseFilter>(
        () => (hasTrialPhase ? 'trial' : 'all'),
    );
    const prevHasTrialPhaseRef = useRef(hasTrialPhase);
    useEffect(() => {
        const wasTrial = prevHasTrialPhaseRef.current;
        prevHasTrialPhaseRef.current = hasTrialPhase;
        if (!hasTrialPhase) {
            setPathsPhaseFilter('all');
            return;
        }
        if (!wasTrial) setPathsPhaseFilter('trial');
    }, [hasTrialPhase]);

    const searchVisibility = useMemo(
        () => buildProceduralSearchVisibility(containers, searchQuery),
        [containers, searchQuery],
    );

    const attentionBoard = useMemo(() => buildProceduralAttentionBoard(containers), [containers]);

    const notePlacement = useMemo((): ProceduralPlacementContext | null => {
        if (!noteModal?.parentId) return null;
        return buildProceduralPlacementContext(containers, noteModal.parentId);
    }, [containers, noteModal?.parentId]);

    const actionPlacement = useMemo((): ProceduralPlacementContext | null => {
        if (!actionModal?.parentId) return null;
        return buildProceduralPlacementContext(containers, actionModal.parentId);
    }, [containers, actionModal?.parentId]);

    useEffect(() => {
        if (!navTarget) return;
        if (navTarget.kind === 'action') focusActionInCanvas(navTarget.id);
        else if (navTarget.kind === 'note') focusNoteInCanvas(navTarget.id);
        else focusContainerInCanvas(navTarget.id);
        onNavTargetHandled?.();
    }, [navTarget, focusActionInCanvas, focusNoteInCanvas, focusContainerInCanvas, onNavTargetHandled]);

    useEffect(() => {
        if (!searchVisibility.active) return;
        setNavExpandIds((prev) => {
            const next = new Set(prev);
            searchVisibility.expandContainerIds.forEach((id) => next.add(id));
            return next;
        });
    }, [searchVisibility.active, searchVisibility.expandContainerIds, setNavExpandIds]);

    const toggleContainerFold = (containerId: string, currentlyCollapsed: boolean) => {
        updateContainer(caseId, containerId, { collapsed: !currentlyCollapsed });
        setNavExpandIds((prev) => {
            const next = new Set(prev);
            if (currentlyCollapsed) next.add(containerId);
            else next.delete(containerId);
            return next;
        });
    };

    const linkResolverInput = useMemo(
        () => ({
            timelineEvents: caseRow?.timelineEvents,
            lawyerRequests: caseRow?.lawyerRequests,
        }),
        [caseRow?.lawyerRequests, caseRow?.timelineEvents],
    );

    const proceduralContextDisplay = useCallback(
        (item: Parameters<typeof buildProceduralContextDisplay>[0]) =>
            buildProceduralContextDisplay(item, linkResolverInput),
        [linkResolverInput],
    );

    const phaseFilteredRoots = useMemo(() => {
        if (!hasTrialPhase || pathsPhaseFilter === 'all') return containers;
        return filterByCasePhase(containers, pathsPhaseFilter, (root) =>
            resolveProceduralRootCasePhase(root as ProceduralContainer, stageJourney),
        );
    }, [containers, hasTrialPhase, pathsPhaseFilter, stageJourney]);

    const pathStats = useMemo(() => {
        const completed = phaseFilteredRoots.filter((c) => c.pathStatus === 'completed').length;
        return {
            total: phaseFilteredRoots.length,
            active: phaseFilteredRoots.length - completed,
            completed,
        };
    }, [phaseFilteredRoots]);

    const editingContainer = useMemo(() => {
        if (containerModal?.kind !== 'edit') return null;
        return findEditingContainerInTree(containers, containerModal.containerId);
    }, [containerModal, containers]);

    const handleRootDrop = (targetId: string) => (e: React.DragEvent) => {
        e.preventDefault();
        const drag = parseProceduralDrag(e);
        if (!drag) return;
        if (drag.kind === 'root' && drag.id !== targetId) {
            reorderRoot(caseId, drag.id, targetId);
        } else if (drag.kind === 'container') {
            moveContainer(caseId, drag.id, null, containers.findIndex((c) => c.id === targetId));
        } else if (drag.kind === 'subitem' && drag.fromParentId) {
            const hit = findContainerInTree(containers, targetId);
            const toIndex = hit?.container.subItems.length ?? 0;
            moveSubItem(caseId, drag.fromParentId, targetId, drag.id, toIndex);
        }
        setDragRootId(null);
    };

    const handleDropOnSubList = (parentId: string, toIndex: number) => (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const drag = parseProceduralDrag(e);
        if (!drag) return;
        if (drag.kind === 'subitem' && drag.fromParentId) {
            moveSubItem(caseId, drag.fromParentId, parentId, drag.id, toIndex);
        } else if (drag.kind === 'container') {
            moveContainer(caseId, drag.id, parentId, toIndex);
        }
    };

    const handleDropOnContainer = (parentId: string) => (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const drag = parseProceduralDrag(e);
        if (!drag) return;
        const hit = findContainerInTree(containers, parentId);
        const len = hit?.container.subItems.length ?? 0;
        if (drag.kind === 'container') {
            moveContainer(caseId, drag.id, parentId, len);
        } else if (drag.kind === 'subitem' && drag.fromParentId) {
            moveSubItem(caseId, drag.fromParentId, parentId, drag.id, len);
        }
    };

    const treeCtx: ProceduralTreeContext = {
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
    };

    const displayRoots = useMemo(() => {
        if (!searchVisibility.active) return phaseFilteredRoots;
        return phaseFilteredRoots.filter((c) => searchVisibility.visibleContainerIds.has(c.id));
    }, [phaseFilteredRoots, searchVisibility.active, searchVisibility.visibleContainerIds]);

    const openCreateRoot = () => setContainerModal({ kind: 'create-root' });

    return (
        <div
            id="procedural-canvas-root"
            className="flex flex-col p-4 sm:p-6 max-w-3xl mx-auto w-full gap-4"
            dir="rtl"
        >
            <ProceduralCanvasToolbar
                pathStats={pathStats}
                hasTrialPhase={hasTrialPhase}
                containersLength={containers.length}
                pathsPhaseFilter={pathsPhaseFilter}
                onPathsPhaseFilterChange={setPathsPhaseFilter}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchVisibility={searchVisibility}
                readOnly={readOnly}
                onCreateRoot={openCreateRoot}
            />

            <ProceduralCanvasAttentionBoard
                attentionBoard={attentionBoard}
                attentionOpen={attentionOpen}
                onAttentionOpenChange={setAttentionOpen}
                onFocusAction={focusActionInCanvas}
            />

            <ProceduralCanvasTreePanel
                containersLength={containers.length}
                readOnly={readOnly}
                displayRoots={displayRoots}
                allContainers={containers}
                searchVisibility={searchVisibility}
                pathsPhaseFilter={pathsPhaseFilter}
                treeCtx={treeCtx}
                onCreateRoot={openCreateRoot}
            />

            <ProceduralCanvasModalsHost
                caseId={caseId}
                containerModal={containerModal}
                editingContainer={editingContainer}
                closeContainerModal={closeContainerModal}
                addRoot={addRoot}
                addSubItem={addSubItem}
                updateContainer={updateContainer}
                addChildParentId={addChildParentId}
                closeAddChild={closeAddChild}
                setNoteModal={setNoteModal}
                setActionModal={setActionModal}
                noteModal={noteModal}
                notePlacement={notePlacement}
                closeNoteModal={closeNoteModal}
                updateSubItem={updateSubItem}
                actionModal={actionModal}
                actionPlacement={actionPlacement}
                closeActionModal={closeActionModal}
                advanceModal={advanceModal}
                closeAdvanceModal={closeAdvanceModal}
                advanceAction={advanceAction}
                confirmDeleteId={confirmDeleteId}
                closeConfirmDelete={closeConfirmDelete}
                deleteContainer={deleteContainer}
            />
        </div>
    );
};
