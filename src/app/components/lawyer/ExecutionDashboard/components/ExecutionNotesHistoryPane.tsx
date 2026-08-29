import React from 'react';
import { ExecutionPinnedNotesTray } from './ExecutionPinnedNotesTray';
import {
    findApprovedBreakInventoryNeedingLedger,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    LazyDossierNotesVault as DossierNotesVault,
    LazyExecutionTasksSection as ExecutionTasksSection,
} from '../executionNotesInnerLazy';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';

const NOTES_INNER_FALLBACK = (
    <div className="h-24 min-h-[44px] rounded-xl border border-white/8 bg-white/[0.04]" aria-hidden />
);

export function ExecutionNotesHistoryPane(p: {
    notesModalTab: 'notes' | 'tasks';
    caseTasksPending: unknown[];
    handleSaveTask: (...args: never[]) => unknown;
    handleUpdateTask: (...args: never[]) => unknown;
    handleDeleteTask: (...args: never[]) => unknown;
    handleCompleteTask: (...args: never[]) => unknown;
    handleAddTimelineEvent: (...args: never[]) => unknown;
    toggleCaseTaskPin: (...args: never[]) => unknown;
    savedNotesSplit: { doneTasks: unknown[] };
    showDoneTasksPanel: boolean;
    setShowDoneTasksPanel: (v: boolean) => void;
    pinnedNotes: unknown[];
    pinnedTasks: unknown[];
    toggleCaseNotePin: (...args: never[]) => unknown;
    moveCaseNoteToTrash: (...args: never[]) => unknown;
    unpinnedNotes: Array<{ id: string; title: string; body?: string; createdAt: string; pinned?: boolean }>;
    handleEditNote: (note: { id: string; title: string; body: string }) => void;
    decisionsStorageExecutionId: string;
    showToast: (
        message: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        options?: unknown,
    ) => void;
}) {
    return (
        <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#0A0F1C] px-4 py-3"
            dir="rtl"
            data-testid="execution-notes-modal-scroll"
        >
            {p.notesModalTab === 'tasks' ? (
                <PreloadableOverlayGate
                    lazy={ExecutionTasksSection}
                    fallback={NOTES_INNER_FALLBACK}
                    lazyProps={{
                        tasks: p.caseTasksPending as never,
                        onSaveTask: p.handleSaveTask as never,
                        onUpdateTask: p.handleUpdateTask as never,
                        onDeleteTask: p.handleDeleteTask as never,
                        onCompleteTask: p.handleCompleteTask as never,
                        onAddTimelineEvent: p.handleAddTimelineEvent as never,
                        onToggleTaskPin: p.toggleCaseTaskPin as never,
                        doneTasks: p.savedNotesSplit.doneTasks as never,
                        showDoneTasksPanel: p.showDoneTasksPanel,
                        setShowDoneTasksPanel: p.setShowDoneTasksPanel,
                    }}
                />
            ) : (
                <div className="space-y-3">
                    <ExecutionPinnedNotesTray
                        variant="modal"
                        pinnedNotes={p.pinnedNotes as never}
                        pinnedTasks={p.pinnedTasks as never}
                        onToggleNotePin={p.toggleCaseNotePin as never}
                        onToggleTaskPin={p.toggleCaseTaskPin as never}
                        onTrashNote={p.moveCaseNoteToTrash as never}
                    />
                    <PreloadableOverlayGate
                        lazy={DossierNotesVault}
                        fallback={NOTES_INNER_FALLBACK}
                        lazyProps={{
                            notes: p.unpinnedNotes.map((n) => ({
                                id: n.id,
                                title: n.title,
                                body: n.body ?? '',
                                date: n.createdAt,
                                pinned: n.pinned,
                            })),
                            onEdit: p.handleEditNote,
                            onTogglePin: p.toggleCaseNotePin as never,
                            onDelete: p.moveCaseNoteToTrash as never,
                            variant: 'execution' as const,
                            heading: 'سجل الملاحظات المحفوظة',
                            emptyLabel:
                                'لا توجد ملاحظات محفوظة بعد — انتقل إلى «كتابة ملاحظة» أعلاه.',
                            lawContext: { kind: 'execution' as const },
                            flowContent: true,
                            renderNoteExtra: (n: { title?: string }) => {
                                const isInventoryNote =
                                    String(n.title || '').trim() ===
                                    'جرد الأثاث — كسر الأقفال والجرد';
                                if (!isInventoryNote) return null;
                                const hit = findApprovedBreakInventoryNeedingLedger(
                                    p.decisionsStorageExecutionId,
                                );
                                if (!hit) return null;
                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const ts = new Date().toISOString();
                                            patchExecutorDecisionRow(
                                                p.decisionsStorageExecutionId,
                                                hit.decisionId,
                                                {
                                                    breakInventoryFurnitureFinalizedAt: ts,
                                                },
                                            );
                                            p.showToast('تم إنهاء الجرد وإغلاق الطلب', 'success');
                                        }}
                                        className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-900/25 px-2 py-1 text-[10px] font-bold text-emerald-100 hover:bg-emerald-900/35"
                                        title="إنهاء الجرد"
                                    >
                                        تم الإنهاء
                                    </button>
                                );
                            },
                        }}
                    />
                </div>
            )}
        </div>
    );
}
