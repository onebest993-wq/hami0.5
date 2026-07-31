import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCriminalStore } from '../criminalStore';
import {
    CONTAINER_COLOR_PRESETS,
    createProceduralId,
    buildProceduralAttentionBoard,
    buildProceduralPlacementContext,
    buildProceduralSearchVisibility,
    findActionAnchorInTree,
    findContainerAnchorInTree,
    findContainerInTree,
    findSubItemAnchorInTree,
    type ProceduralPlacementContext,
    type ProceduralActionItem,
    type ProceduralContainer,
    type ProceduralNoteItem,
    type ProceduralNavTarget,
    type AddChildKind,
} from '../proceduralContainersEngine';
import { ProceduralContainerFormModal } from './modals/ProceduralContainerFormModal';
import { ProceduralAddChildModal } from './modals/ProceduralAddChildModal';
import { ProceduralNoteFormModal } from './modals/ProceduralNoteFormModal';
import { ProceduralActionFormModal } from './modals/ProceduralActionFormModal';
import { ProceduralAdvancePhaseModal } from './modals/ProceduralAdvancePhaseModal';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../criminalModalPortal';
import {
    formatProceduralLinkDisplay,
    isProceduralLinkBroken,
    normalizeProceduralContextValue,
    resolveLiveLinkLabel,
    type ProceduralItemLink,
} from '../proceduralItemLink';
import { CasePhaseSegmentedControl } from './CasePhaseSegmentedControl';
import {
    filterByCasePhase,
    resolveProceduralRootCasePhase,
    resolveTrialPhasePivotMs,
    type CasePhaseFilter,
} from '../casePhaseFilterEngine';
import { parseProceduralDrag, DRAG_MIME, type DragPayload } from './RecursiveProceduralCanvas/dragUtils';
import type {
    ActionModalMode,
    AdvanceModalMode,
    ContainerModalMode,
    NoteModalMode,
} from './RecursiveProceduralCanvas/types';
import { AttentionColumn } from './RecursiveProceduralCanvas/AttentionBoardColumns';
import {
    ProceduralContainerTreeNode,
    type ProceduralTreeContext,
} from './RecursiveProceduralCanvas/ProceduralContainerTreeNode';

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
    const [navExpandIds, setNavExpandIds] = useState<Set<string>>(() => new Set());
    const [focusActionId, setFocusActionId] = useState<string | null>(null);
    const [focusNoteId, setFocusNoteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

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

    const focusActionInCanvas = useCallback(
        (actionId: string) => {
            const anchor = findActionAnchorInTree(containers, actionId);
            if (!anchor) return;
            setNavExpandIds(new Set(anchor.expandContainerIds));
            setFocusActionId(actionId);
            window.setTimeout(() => {
                const el = document.getElementById(`procedural-action-${actionId}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
            window.setTimeout(() => setFocusActionId(null), 1000);
        },
        [containers],
    );

    const focusNoteInCanvas = useCallback(
        (noteId: string) => {
            const anchor = findSubItemAnchorInTree(containers, noteId);
            if (!anchor || anchor.itemType !== 'note') return;
            setNavExpandIds(new Set(anchor.expandContainerIds));
            setFocusNoteId(noteId);
            window.setTimeout(() => {
                document.getElementById(`procedural-note-${noteId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
            window.setTimeout(() => setFocusNoteId(null), 1000);
        },
        [containers],
    );

    const focusContainerInCanvas = useCallback(
        (containerId: string) => {
            const anchor = findContainerAnchorInTree(containers, containerId);
            if (!anchor) return;
            setNavExpandIds(new Set(anchor.expandContainerIds));
            window.setTimeout(() => {
                document.getElementById(`procedural-container-${containerId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        },
        [containers],
    );

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
    }, [searchVisibility.active, searchVisibility.expandContainerIds]);

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

    const proceduralContextDisplay = (
        item: ProceduralNoteItem | ProceduralActionItem,
    ): { line: string | null; link?: ProceduralItemLink; linkBroken?: boolean } => {
        const ctx = normalizeProceduralContextValue(item.link, item.contextRef, item.contextNote);
        const live =
            ctx.link != null ? resolveLiveLinkLabel(ctx.link, linkResolverInput) : undefined;
        const line = formatProceduralLinkDisplay(ctx, live);
        const linkBroken =
            ctx.link != null ? isProceduralLinkBroken(ctx.link, linkResolverInput) : false;
        return { line, link: ctx.link, linkBroken };
    };

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
        const walk = (list: ProceduralContainer[]): ProceduralContainer | null => {
            for (const c of list) {
                if (c.id === containerModal.containerId) return c;
                for (const item of c.subItems) {
                    if (item.type === 'container') {
                        const hit = walk([item.container]);
                        if (hit) return hit;
                    }
                }
            }
            return null;
        };
        return walk(containers);
    }, [containerModal, containers]);

    const parseDrag = (e: React.DragEvent): DragPayload | null => {
        try {
            const raw = e.dataTransfer.getData(DRAG_MIME);
            if (!raw) return null;
            const o = JSON.parse(raw) as DragPayload;
            if (!o?.id || !o?.kind) return null;
            return o;
        } catch {
            return null;
        }
    };

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

    return (
        <div
            id="procedural-canvas-root"
            className="flex flex-col p-4 sm:p-6 max-w-3xl mx-auto w-full gap-4"
            dir="rtl"
        >
            <div className="space-y-2 print:hidden">
                {pathStats.total > 0 ? (
                    <div className="text-[10px] font-black text-white/50">
                        {pathStats.active} نشط · {pathStats.completed} منتهٍ · {pathStats.total} مسار
                    </div>
                ) : null}
            </div>

            {hasTrialPhase && containers.length > 0 ? (
                <CasePhaseSegmentedControl
                    value={pathsPhaseFilter}
                    onChange={setPathsPhaseFilter}
                    className="print:hidden"
                    ariaLabel="فلتر مرحلة مسارات التتبع"
                    labelOverrides={{
                        investigation: 'مسارات التحقيق',
                        trial: 'مسارات المحاكمة',
                    }}
                />
            ) : null}

            {containers.length > 0 ? (
                <div className="flex flex-col gap-2 print:hidden">
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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

            {attentionBoard.total > 0 ? (
                <details
                    className="rounded-xl border border-slate-600/50 bg-slate-900/60 overflow-hidden print:hidden"
                    open={attentionOpen}
                    onToggle={(e) => setAttentionOpen(e.currentTarget.open)}
                >
                    <summary className="list-none cursor-pointer px-3 py-2.5 flex items-center justify-between gap-2 border-b border-slate-700/40 bg-slate-800/40 [&::-webkit-details-marker]:hidden">
                        <div className="text-[11px] font-black text-white/85">
                            🎯 مركز المتابعة والانتباه
                            <span className="text-white/45 font-bold ms-2">
                                ({attentionBoard.total} قيد المتابعة)
                            </span>
                        </div>
                        <span className="text-white/40 text-[10px] font-black">{attentionOpen ? '▾' : '▸'}</span>
                    </summary>
                    <div className="p-2 flex flex-col sm:flex-row gap-2">
                        <AttentionColumn
                            title={`🚨 متأخرة (${attentionBoard.overdue.length})`}
                            entries={attentionBoard.overdue}
                            tone="overdue"
                            emptyHint="—"
                            onFocus={focusActionInCanvas}
                        />
                        <AttentionColumn
                            title={`⏳ قادمة/اليوم (${attentionBoard.upcoming.length})`}
                            entries={attentionBoard.upcoming}
                            tone="upcoming"
                            emptyHint="—"
                            onFocus={focusActionInCanvas}
                        />
                        <AttentionColumn
                            title={`📌 بدون موعد (${attentionBoard.noDate.length})`}
                            entries={attentionBoard.noDate}
                            tone="neutral"
                            emptyHint="—"
                            onFocus={focusActionInCanvas}
                        />
                    </div>
                </details>
            ) : null}

            {containers.length > 0 && !readOnly ? (
                <div className="flex flex-wrap gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={() => setContainerModal({ kind: 'create-root' })}
                        className="flex-1 min-w-[9rem] rounded-xl bg-[#E6C673] text-[#0B1021] py-2.5 text-sm font-black hover:brightness-110 transition"
                    >
                        + مسار جديد
                    </button>
                </div>
            ) : null}

            {containers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-600/45 px-6 py-16 text-center gap-5">
                    <p className="text-white/55 text-sm font-bold max-w-xs">
                        اللوحة فارغة. ابدأ خطتك الإجرائية الآن.
                    </p>
                    {!readOnly ? (
                        <button
                            type="button"
                            onClick={() => setContainerModal({ kind: 'create-root' })}
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] px-8 py-3 text-sm font-black hover:brightness-110 transition shadow-lg shadow-[#E6C673]/15"
                        >
                            ➕ مسار جديد
                        </button>
                    ) : null}
                </div>
            ) : displayRoots.length === 0 && searchVisibility.active ? (
                <div className="rounded-xl border border-dashed border-slate-600/45 px-6 py-10 text-center text-white/45 text-sm font-bold">
                    لا مسارات تطابق البحث.
                </div>
            ) : displayRoots.length === 0 && pathsPhaseFilter !== 'all' ? (
                <div className="rounded-xl border border-dashed border-slate-600/45 px-6 py-10 text-center text-white/45 text-sm font-bold">
                    لا مسارات في{' '}
                    {pathsPhaseFilter === 'investigation' ? 'مرحلة التحقيق' : 'مرحلة المحاكمة'}.
                </div>
            ) : (
                <div className="flex flex-col gap-8 procedural-print-target">
                    {displayRoots.map((c, mapIdx) => {
                        const rootIdx = containers.indexOf(c);
                        const showDivider = mapIdx > 0;
                        return (
                        <div
                            key={c.id}
                            className={showDivider ? 'pt-6 border-t border-dashed border-slate-600/40' : ''}
                        >
                            {<ProceduralContainerTreeNode
                                ctx={treeCtx}
                                container={c}
                                depth={0}
                                isRoot={true}
                                pathLocked={false}
                                parentNumber={[rootIdx + 1]}
                            />}
                        </div>
                        );
                    })}
                </div>
            )}

            <ProceduralContainerFormModal
                open={containerModal !== null}
                title={
                    containerModal?.kind === 'edit'
                        ? 'تعديل'
                        : containerModal?.kind === 'create-nested'
                          ? containerModal.branchRole === 'primary'
                              ? 'مسار أساسي داخل المسار'
                              : 'مسار فرعي'
                          : 'مسار جديد'
                }
                initial={
                    containerModal?.kind === 'edit' && editingContainer
                        ? {
                              title: editingContainer.title,
                              color: editingContainer.color,
                              icon: editingContainer.icon,
                          }
                        : containerModal?.kind === 'create-nested'
                          ? {
                                title: '',
                                color: CONTAINER_COLOR_PRESETS[containerModal.branchRole === 'primary' ? 0 : 1],
                                icon: containerModal.branchRole === 'primary' ? '🛤️' : '📁',
                            }
                          : undefined
                }
                onClose={() => setContainerModal(null)}
                onSubmit={(payload) => {
                    if (containerModal?.kind === 'create-root') {
                        addRoot(caseId, payload);
                    } else if (containerModal?.kind === 'create-nested') {
                        const branchRole = containerModal.branchRole;
                        addSubItem(caseId, containerModal.parentId, {
                            type: 'container',
                            container: {
                                id: createProceduralId(),
                                title: payload.title,
                                color: payload.color,
                                icon: payload.icon,
                                parentId: containerModal.parentId,
                                branchRole,
                                subItems: [],
                            },
                        });
                    } else if (containerModal?.kind === 'edit') {
                        updateContainer(caseId, containerModal.containerId, payload);
                    }
                    setContainerModal(null);
                }}
            />

            <ProceduralAddChildModal
                open={addChildParentId !== null}
                onClose={() => setAddChildParentId(null)}
                onPick={(kind: AddChildKind) => {
                    const parentId = addChildParentId;
                    if (!parentId) return;
                    setAddChildParentId(null);
                    if (kind === 'note') setNoteModal({ parentId });
                    else if (kind === 'action') setActionModal({ parentId });
                }}
            />

            <ProceduralNoteFormModal
                caseId={caseId}
                open={noteModal !== null}
                placement={notePlacement}
                initial={noteModal?.note ?? null}
                onClose={() => setNoteModal(null)}
                onSubmit={(payload) => {
                    if (!noteModal) return;
                    if (noteModal.note?.id) {
                        updateSubItem(caseId, noteModal.parentId, noteModal.note.id, payload);
                    } else {
                        addSubItem(caseId, noteModal.parentId, {
                            type: 'note',
                            id: createProceduralId(),
                            title: payload.title,
                            body: payload.body,
                            link: payload.link,
                            contextNote: payload.contextNote,
                            tags: payload.tags,
                            isStarred: payload.isStarred,
                        });
                    }
                    setNoteModal(null);
                }}
            />

            <ProceduralActionFormModal
                caseId={caseId}
                open={actionModal !== null}
                placement={actionPlacement}
                initial={actionModal?.action ?? null}
                onClose={() => setActionModal(null)}
                onSubmit={(payload) => {
                    if (!actionModal) return;
                    if (actionModal.action?.id) {
                        updateSubItem(caseId, actionModal.parentId, actionModal.action.id, payload);
                    } else {
                        addSubItem(caseId, actionModal.parentId, {
                            type: 'action',
                            id: createProceduralId(),
                            title: payload.title,
                            date: payload.date,
                            status: payload.status,
                            followUpDate: payload.followUpDate,
                            tags: payload.tags,
                            isStarred: payload.isStarred,
                            link: payload.link,
                            contextNote: payload.contextNote,
                        });
                    }
                    setActionModal(null);
                }}
            />

            <ProceduralAdvancePhaseModal
                open={advanceModal !== null}
                actionTitle={advanceModal?.actionTitle ?? ''}
                onClose={() => setAdvanceModal(null)}
                onSubmit={(payload) => {
                    if (!advanceModal) return;
                    advanceAction(caseId, advanceModal.parentId, advanceModal.actionId, {
                        spawnChildTitle: payload.spawnChildTitle,
                    });
                    setAdvanceModal(null);
                }}
            />

            {confirmDeleteId ? (
                <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.proceduralConfirm}>
                    <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-3">
                        <div className="text-white font-black text-sm">نقل مسار التتبع للسلة؟</div>
                        <p className="text-white/70 text-xs font-bold">
                            سيتم إخفاء المسار بكل مراحله وإجراءاته — يمكن استرجاعه من سلة المهملات.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/75"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    deleteContainer(caseId, confirmDeleteId);
                                    setConfirmDeleteId(null);
                                }}
                                className="rounded-xl bg-red-600/80 px-4 py-2 text-sm font-black text-white"
                            >
                                نقل للسلة
                            </button>
                        </div>
                    </div>
                </CriminalModalPortal>
            ) : null}
        </div>
    );
};
