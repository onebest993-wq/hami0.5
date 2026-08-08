import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { Dispatch, SetStateAction } from 'react';
import { CalendarDays, ChevronDown, ListChecks, Pencil, StickyNote, Trash2, X } from '@/app/components/ui/lucideIcons';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_NOTES_SHELL_MAX,
} from '../executionModalMobileShell';
import { ExecutionPinnedNotesTray } from './ExecutionPinnedNotesTray';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    findApprovedBreakInventoryNeedingLedger,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { ExecutionTasksSection } from './ExecutionTasksSection';
import { ntm } from './notesTasksModalUi';
import { DossierFastNoteComposer } from '@/app/components/lawyer/dossier-notes/DossierFastNoteComposer';
import { DossierNotesVault } from '@/app/components/lawyer/dossier-notes/DossierNotesVault';
import { plainTextFromPossiblyHtml } from '@/app/components/lawyer/SmartRepository/legalRichTextEditorUtils';
import { isExecutionHandlerStubLeaf } from '../hooks/executionHandlerClusterStubs';

type CaseNoteLogRow = NonNullable<ExecutionFile['caseNotesLog']>[number];

export interface ExecutionNotesAndAppointmentModalsProps {
    showNotesModal: boolean;
    onCloseNotesModal: () => void;
    setNoteTitle: Dispatch<SetStateAction<string>>;
    setNoteBody: Dispatch<SetStateAction<string>>;
    setIsTask: Dispatch<SetStateAction<boolean>>;
    setTaskDueDate: Dispatch<SetStateAction<string>>;
    setTaskStatus: Dispatch<SetStateAction<'pending' | 'done'>>;
    setEditingTaskId: Dispatch<SetStateAction<string | null>>;
    setSavedNotesView: Dispatch<SetStateAction<'notes' | 'tasks_done'>>;
    moveCaseNoteToTrash: (id: string) => void;
    savedNotesSplit: { notes: CaseNoteLogRow[]; doneTasks: CaseNoteLogRow[] };
    savedNotesView: 'notes' | 'tasks_done';
    toggleCaseNotePin: (id: string) => void;
    toggleCaseTaskPin: (id: string) => void;

    decisionsStorageExecutionId: string;

    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info'
    ) => void;

    noteTitle: string;
    noteBody: string;
    isTask: boolean;
    editingTaskId: string | null;
    commitDossierNote: (payload: { title: string; bodyHtml: string; noteId?: string }) => void | Promise<void>;
    voiceUserId?: string;
    editingNoteId?: string | null;
    setEditingNoteId?: Dispatch<SetStateAction<string | null>>;

    showAppointmentModal: boolean;
    onCloseAppointmentModal: () => void;
    setEditingAppointmentId: Dispatch<SetStateAction<string | null>>;
    setAppointmentPurpose: Dispatch<SetStateAction<string>>;
    setAppointmentDateOnly: Dispatch<SetStateAction<string>>;
    setAppointmentTimeOptional: Dispatch<SetStateAction<string>>;
    editingAppointmentId: string | null;
    appointmentPurpose: string;
    appointmentDateOnly: string;
    handleSaveAppointment: () => void;
    timelineEvents: TimelineEvent[];
    todayYmd: string;
    moveTimelineEventToTrash: (ev: TimelineEvent) => void;

    /** Task Management */
    caseTasksPending: NonNullable<ExecutionFile['caseTasksPending']>;
    handleSaveTask: (taskData: { title: string; body: string; dueDate: string; steps?: any[] }) => void;
    handleUpdateTask: (taskId: string, updates: Partial<any>) => void;
    handleDeleteTask: (taskId: string) => void;
    handleCompleteTask: (taskId: string) => void;
    handleAddTimelineEvent: (event: { title: string; body?: string }) => void;
}

function ymdOfAppointment(ev: TimelineEvent): string {
    const raw = String(ev?.date || '').trim();
    const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
    return m ? m[0] : '';
}

function titleOfAppointment(ev: TimelineEvent): string {
    const t = String(ev?.title || '').trim();
    return t.replace(/^📅\s*/, '').trim() || 'موعد';
}

export const ExecutionNotesAndAppointmentModals: React.FC<
    ExecutionNotesAndAppointmentModalsProps
> = ({
    showNotesModal,
    onCloseNotesModal,
    setNoteTitle,
    setNoteBody,
    setEditingNoteId,
    setIsTask,
    setTaskDueDate,
    setTaskStatus,
    setEditingTaskId,
    setSavedNotesView,
    moveCaseNoteToTrash,
    savedNotesSplit,
    savedNotesView: _savedNotesView,
    toggleCaseNotePin,
    toggleCaseTaskPin,
    decisionsStorageExecutionId,
    showToast,
    noteTitle,
    noteBody,
    isTask,
    editingTaskId,
    editingNoteId = null,
    commitDossierNote,
    voiceUserId,
    showAppointmentModal,
    onCloseAppointmentModal,
    setEditingAppointmentId,
    setAppointmentPurpose,
    setAppointmentDateOnly,
    setAppointmentTimeOptional,
    editingAppointmentId,
    appointmentPurpose,
    appointmentDateOnly,
    handleSaveAppointment,
    timelineEvents,
    todayYmd,
    moveTimelineEventToTrash,
    caseTasksPending,
    handleSaveTask,
    handleUpdateTask,
    handleDeleteTask,
    handleCompleteTask,
    handleAddTimelineEvent,
}) => {
    const [showDoneTasksPanel, setShowDoneTasksPanel] = useState(false);
    /** عزل تام بين الملاحظات والمهام — تبويبان متنافيان (صفر CLS بين المحرّرين) */
    const [notesModalTab, setNotesModalTab] = useState<'notes' | 'tasks'>('notes');
    /** داخل تبويب الملاحظات: كتابة أو سجل محفوظ */
    const [notesPane, setNotesPane] = useState<'compose' | 'vault'>('compose');
    const closeNotesModal = useCallback(() => {
        onCloseNotesModal();
        setNoteTitle('');
        setNoteBody('');
        setIsTask(false);
        setTaskDueDate('');
        setTaskStatus('pending');
        setEditingTaskId(null);
        setEditingNoteId?.(null);
        setSavedNotesView('notes');
        setShowDoneTasksPanel(false);
        setNotesModalTab('notes');
        setNotesPane('compose');
    }, [
        onCloseNotesModal,
        setEditingNoteId,
        setEditingTaskId,
        setIsTask,
        setNoteBody,
        setNoteTitle,
        setSavedNotesView,
        setTaskDueDate,
        setTaskStatus,
    ]);
    const closeAppointmentModal = useCallback(() => {
        onCloseAppointmentModal();
        setEditingAppointmentId(null);
        setAppointmentPurpose('');
        setAppointmentDateOnly('');
        setAppointmentTimeOptional('');
    }, [
        onCloseAppointmentModal,
        setAppointmentDateOnly,
        setAppointmentPurpose,
        setAppointmentTimeOptional,
        setEditingAppointmentId,
    ]);

    const pinnedNotes = useMemo(
        () => savedNotesSplit.notes.filter((n) => Boolean(n.pinned)),
        [savedNotesSplit.notes]
    );
    const unpinnedNotes = useMemo(
        () => savedNotesSplit.notes.filter((n) => !n.pinned),
        [savedNotesSplit.notes]
    );
    const pinnedTasks = useMemo(
        () => caseTasksPending.filter((t) => !t.trashedAt && Boolean(t.pinned)),
        [caseTasksPending]
    );
    const activeTasksCount = useMemo(
        () => caseTasksPending.filter((t) => !t.trashedAt).length,
        [caseTasksPending]
    );

    /** تعديل ملاحظة من المخزن → تعبئة المحرّر العلوي والانتقال لتبويب الملاحظات */
    const handleEditNote = useCallback(
        (note: { id: string; title: string; body: string }) => {
            setEditingNoteId?.(note.id);
            setNoteTitle(note.title);
            setNoteBody(note.body);
            setIsTask(false);
            setEditingTaskId(null);
            setNotesModalTab('notes');
            setNotesPane('compose');
        },
        [setEditingNoteId, setEditingTaskId, setIsTask, setNoteBody, setNoteTitle]
    );

    const pendingVaultAfterSaveRef = useRef(false);
    const notesCountBeforeSaveRef = useRef(0);

    const handleCommitNote = useCallback(
        async (payload: { title: string; bodyHtml: string }) => {
            const titleTrim = String(payload.title || '').trim();
            const bodyTrim = plainTextFromPossiblyHtml(payload.bodyHtml);
            if (!titleTrim || !bodyTrim) return;
            if (typeof commitDossierNote !== 'function' || isExecutionHandlerStubLeaf(commitDossierNote)) {
                return;
            }
            const isEdit = Boolean(editingNoteId);
            if (!isEdit) {
                notesCountBeforeSaveRef.current = savedNotesSplit.notes.length;
                pendingVaultAfterSaveRef.current = true;
            }
            await commitDossierNote({
                ...payload,
                title: titleTrim,
                noteId: editingNoteId ?? undefined,
            });
            if (isEdit) {
                setNotesPane('vault');
            }
        },
        [commitDossierNote, editingNoteId, savedNotesSplit.notes.length],
    );

    useEffect(() => {
        if (!pendingVaultAfterSaveRef.current) return;
        if (savedNotesSplit.notes.length > notesCountBeforeSaveRef.current) {
            pendingVaultAfterSaveRef.current = false;
            setNotesPane('vault');
        }
    }, [savedNotesSplit.notes.length]);

    useBodyScrollLock(showNotesModal || showAppointmentModal);

    return (
        <>
            {/* 🆕 V18: SEGMENTED NOTES/TASKS SHELL — المحرّر أولاً ثم المخزن (صفر CLS) */}
            {showNotesModal && (
                <div
                    className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`flex h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-amber-500/30 bg-[#0A0F1C] shadow-2xl shadow-black/50 md:h-[600px] ${EXEC_MODAL_NOTES_SHELL_MAX}`}
                        data-testid="execution-notes-modal"
                    >
                        {/* HEADER — shrink-0: العنوان + الإغلاق + مبدّل الملاحظات/المهام */}
                        <div
                            className={`shrink-0 border-b border-amber-500/20 bg-[#0B1120] px-4 pb-3 pt-4 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                                    سجل الملاحظات والمهام
                                </h3>
                                <button
                                    type="button"
                                    onClick={closeNotesModal}
                                    className={`${EXEC_MODAL_CLOSE_BTN_CLASS} text-gray-400 hover:text-white hover:bg-white/5`}
                                    aria-label="إغلاق"
                                >
                                    <X size={22} />
                                </button>
                            </div>
                            <div
                                className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.08] bg-slate-950/80 p-1"
                                role="tablist"
                                aria-label="الملاحظات أو المهام"
                                dir="rtl"
                            >
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={notesModalTab === 'notes'}
                                    onClick={() => setNotesModalTab('notes')}
                                    className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-bold transition-all touch-manipulation ${
                                        notesModalTab === 'notes'
                                            ? 'bg-amber-500/15 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-amber-400/25'
                                            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                                    }`}
                                    data-testid="execution-notes-tab-notes"
                                >
                                    <StickyNote size={14} />
                                    الملاحظات
                                    {savedNotesSplit.notes.length > 0 ? (
                                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] tabular-nums">
                                            {savedNotesSplit.notes.length}
                                        </span>
                                    ) : null}
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={notesModalTab === 'tasks'}
                                    onClick={() => setNotesModalTab('tasks')}
                                    className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-bold transition-all touch-manipulation ${
                                        notesModalTab === 'tasks'
                                            ? 'bg-amber-500/15 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-amber-400/25'
                                            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                                    }`}
                                    data-testid="execution-notes-tab-tasks"
                                >
                                    <ListChecks size={14} />
                                    المهام
                                    {activeTasksCount > 0 ? (
                                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] tabular-nums">
                                            {activeTasksCount}
                                        </span>
                                    ) : null}
                                </button>
                            </div>
                            {notesModalTab === 'notes' ? (
                                <div
                                    className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-amber-500/15 bg-slate-950/60 p-1"
                                    role="tablist"
                                    aria-label="كتابة أو سجل الملاحظات"
                                    dir="rtl"
                                    data-testid="execution-notes-pane-switch"
                                >
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={notesPane === 'compose'}
                                        onClick={() => setNotesPane('compose')}
                                        className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition-all touch-manipulation ${
                                            notesPane === 'compose'
                                                ? 'bg-orange-500/20 text-orange-100 ring-1 ring-orange-400/30'
                                                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                                        }`}
                                        data-testid="execution-notes-pane-compose"
                                    >
                                        <Pencil size={13} />
                                        كتابة ملاحظة
                                    </button>
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={notesPane === 'vault'}
                                        onClick={() => setNotesPane('vault')}
                                        className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition-all touch-manipulation ${
                                            notesPane === 'vault'
                                                ? 'bg-orange-500/20 text-orange-100 ring-1 ring-orange-400/30'
                                                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                                        }`}
                                        data-testid="execution-notes-pane-vault"
                                    >
                                        <StickyNote size={13} />
                                        سجل الملاحظات
                                        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] tabular-nums text-amber-100/90">
                                            {savedNotesSplit.notes.length}
                                        </span>
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        {/* EDITOR — تبويب الملاحظات + وضع الكتابة فقط */}
                        {notesModalTab === 'notes' && notesPane === 'compose' ? (
                            <div
                                className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-b border-slate-800/50 bg-[#0B1120] px-4 pb-3 pt-2.5"
                                dir="rtl"
                                data-testid="execution-notes-modal-composer"
                            >
                                <DossierFastNoteComposer
                                    title={noteTitle}
                                    onTitleChange={setNoteTitle}
                                    bodyHtml={noteBody}
                                    onBodyChange={setNoteBody}
                                    context={{ kind: 'execution' }}
                                    onSave={handleCommitNote}
                                    voiceUserId={voiceUserId}
                                    onVoiceNote={(voicePayload) => {
                                        handleCommitNote({
                                            title: voicePayload.title,
                                            bodyHtml: voicePayload.body,
                                        });
                                    }}
                                    saveLabel={editingNoteId ? 'حفظ التعديل' : 'حفظ الملاحظة'}
                                    compact
                                />
                            </div>
                        ) : null}

                        {/* HISTORY — مهام أو سجل الملاحظات */}
                        {notesModalTab === 'tasks' || notesPane === 'vault' ? (
                        <div
                            className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#0A0F1C] px-4 py-3"
                            dir="rtl"
                            data-testid="execution-notes-modal-scroll"
                        >
                            {notesModalTab === 'tasks' ? (
                                <ExecutionTasksSection
                                    tasks={caseTasksPending as any[]}
                                    onSaveTask={handleSaveTask as any}
                                    onUpdateTask={handleUpdateTask as any}
                                    onDeleteTask={handleDeleteTask as any}
                                    onCompleteTask={handleCompleteTask as any}
                                    onAddTimelineEvent={handleAddTimelineEvent as any}
                                    onToggleTaskPin={toggleCaseTaskPin}
                                    doneTasks={savedNotesSplit.doneTasks}
                                    showDoneTasksPanel={showDoneTasksPanel}
                                    setShowDoneTasksPanel={setShowDoneTasksPanel}
                                />
                            ) : (
                                <div className="space-y-3">
                                    <ExecutionPinnedNotesTray
                                        variant="modal"
                                        pinnedNotes={pinnedNotes}
                                        pinnedTasks={pinnedTasks}
                                        onToggleNotePin={toggleCaseNotePin}
                                        onToggleTaskPin={toggleCaseTaskPin}
                                        onTrashNote={moveCaseNoteToTrash}
                                    />
                                    <DossierNotesVault
                                        notes={unpinnedNotes.map((n) => ({
                                            id: n.id,
                                            title: n.title,
                                            body: n.body ?? '',
                                            date: n.createdAt,
                                            pinned: n.pinned,
                                        }))}
                                        onEdit={handleEditNote}
                                        onTogglePin={toggleCaseNotePin}
                                        onDelete={moveCaseNoteToTrash}
                                        variant="execution"
                                        heading="سجل الملاحظات المحفوظة"
                                        emptyLabel="لا توجد ملاحظات محفوظة بعد — انتقل إلى «كتابة ملاحظة» أعلاه."
                                        lawContext={{ kind: 'execution' }}
                                        flowContent
                                        renderNoteExtra={(n) => {
                                            const isInventoryNote =
                                                String(n.title || '').trim() ===
                                                'جرد الأثاث — كسر الأقفال والجرد';
                                            if (!isInventoryNote) return null;
                                            const hit = findApprovedBreakInventoryNeedingLedger(
                                                decisionsStorageExecutionId
                                            );
                                            if (!hit) return null;
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const ts = new Date().toISOString();
                                                        patchExecutorDecisionRow(
                                                            decisionsStorageExecutionId,
                                                            hit.decisionId,
                                                            {
                                                                breakInventoryFurnitureFinalizedAt: ts,
                                                            }
                                                        );
                                                        showToast('تم إنهاء الجرد وإغلاق الطلب', 'success');
                                                    }}
                                                    className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-900/25 px-2 py-1 text-[10px] font-bold text-emerald-100 hover:bg-emerald-900/35"
                                                    title="إنهاء الجرد"
                                                >
                                                    تم الإنهاء
                                                </button>
                                            );
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        ) : null}

                    </motion.div>
                </div>
            )}

            {showAppointmentModal && (
                <div
                    className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeAppointmentModal();
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`w-[95%] md:w-[480px] overflow-y-auto overscroll-contain rounded-3xl border border-amber-500/30 bg-[#0A0F1C] p-5 md:p-6 shadow-2xl shadow-black/50 ${EXEC_MODAL_NOTES_SHELL_MAX}`}
                        dir="rtl"
                        data-testid="execution-appointment-modal"
                    >
                        <div
                            className={`mb-4 flex items-center justify-between ${EXEC_MODAL_HEADER_SAFE_TOP}`}
                        >
                            <h3 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                                {editingAppointmentId ? 'تعديل موعد' : 'إضافة موعد'}
                            </h3>
                            <button
                                type="button"
                                onClick={closeAppointmentModal}
                                className={EXEC_MODAL_CLOSE_BTN_CLASS}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-3.5">
                            <div>
                                <label className={ntm.label}>الغرض من الموعد</label>
                                <input
                                    type="text"
                                    value={appointmentPurpose}
                                    onChange={(e) => setAppointmentPurpose(e.target.value)}
                                    placeholder="مثال: جلسة متابعة"
                                    className={`${ntm.field} min-h-[44px] touch-manipulation`}
                                />
                            </div>
                            <div>
                                <label className={ntm.label}>
                                    التاريخ <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={appointmentDateOnly}
                                    onChange={(e) => setAppointmentDateOnly(e.target.value)}
                                    className={`${ntm.field} min-h-[44px] touch-manipulation`}
                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                />
                            </div>
                        </div>
                        {/* زر مضغوط بمقاس النموذج — لا full-width */}
                        <button
                            type="button"
                            onClick={handleSaveAppointment}
                            className={`${ntm.btnPrimary} mt-4 min-h-[44px] touch-manipulation px-6 text-xs`}
                        >
                            {editingAppointmentId ? 'حفظ التعديل' : 'حفظ الموعد'}
                        </button>

                        {(() => {
                            const today = todayYmd;
                            const appts = (timelineEvents || []).filter(
                                (ev) =>
                                    String(ev.type || '') === 'appointment' && !Boolean(ev.trashedAt)
                            );
                            const active = appts.filter((ev) => {
                                const y = ymdOfAppointment(ev);
                                return y && y >= today;
                            });
                            const ended = appts.filter((ev) => {
                                const y = ymdOfAppointment(ev);
                                return y && y < today;
                            });

                            const renderEmpty = (label: string) => (
                                <div className="flex flex-col items-center justify-center gap-1.5 py-5 text-center">
                                    <CalendarDays size={20} className="text-slate-600" aria-hidden />
                                    <p className="text-[10px] text-slate-500">{label}</p>
                                </div>
                            );

                            const renderList = (items: TimelineEvent[], allowEdit: boolean) => (
                                <div className="space-y-2 max-h-44 overflow-y-auto overscroll-contain pb-2 pr-1">
                                    {items.slice(0, 50).map((ev) => {
                                        const y = ymdOfAppointment(ev) || '—';
                                        return (
                                            <div
                                                key={String(ev.id)}
                                                className="rounded-xl border border-amber-500/12 bg-[#0A0F1C]/35 p-2.5"
                                                dir="rtl"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-white text-xs font-bold break-words">
                                                            {titleOfAppointment(ev)}
                                                        </p>
                                                        <p className="mt-1 text-[10px] text-slate-400 font-mono tabular-nums">
                                                            {y}
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        {allowEdit ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingAppointmentId(String(ev.id));
                                                                    setAppointmentPurpose(titleOfAppointment(ev));
                                                                    setAppointmentDateOnly(ymdOfAppointment(ev));
                                                                    setAppointmentTimeOptional('');
                                                                }}
                                                                className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg border border-amber-400/30 text-amber-100 transition hover:bg-amber-900/30"
                                                                title="تعديل الموعد"
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={() => moveTimelineEventToTrash(ev)}
                                                            className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg border border-rose-500/35 text-rose-300 transition hover:bg-rose-950/45"
                                                            title="حذف الموعد"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );

                            const renderAccordion = (
                                label: string,
                                emptyLabel: string,
                                items: TimelineEvent[],
                                allowEdit: boolean,
                                defaultOpen: boolean,
                            ) => (
                                <details className="group border-t border-slate-700/50" open={defaultOpen}>
                                    <summary className="flex min-h-[44px] cursor-pointer touch-manipulation select-none list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                                        <span className="text-xs font-black text-amber-100/90">{label}</span>
                                        <span className="flex items-center gap-2">
                                            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-100/80">
                                                {items.length}
                                            </span>
                                            <ChevronDown
                                                size={14}
                                                className="text-slate-400 transition-transform group-open:rotate-180"
                                                aria-hidden
                                            />
                                        </span>
                                    </summary>
                                    {items.length ? renderList(items, allowEdit) : renderEmpty(emptyLabel)}
                                </details>
                            );

                            return (
                                <div className="mt-4" dir="rtl">
                                    {renderAccordion(
                                        'سجل المواعيد النشطة',
                                        'لا توجد مواعيد نشطة',
                                        active,
                                        true,
                                        active.length > 0,
                                    )}
                                    {renderAccordion(
                                        'سجل المواعيد المنتهية',
                                        'لا توجد مواعيد منتهية',
                                        ended,
                                        false,
                                        false,
                                    )}
                                </div>
                            );
                        })()}
                    </motion.div>
                </div>
            )}
        </>
    );
};
