import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_NOTES_SHELL_MAX,
    execModalKeyboardPadStyle,
} from '../executionModalMobileShell';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { ExecutionPinnedNotesTray } from './ExecutionPinnedNotesTray';
import {
    findApprovedBreakInventoryNeedingLedger,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { DossierFastNoteComposer } from '@/app/components/lawyer/dossier-notes/DossierFastNoteComposer';
import { plainTextFromPossiblyHtml } from '@/app/components/lawyer/SmartRepository/legalRichTextEditorUtils';
import { isExecutionHandlerStubLeaf } from '../hooks/executionHandlerClusterStubs';
import { ExecutionAppointmentModal } from './ExecutionAppointmentModal';
import { ExecutionNotesModalHeader } from './ExecutionNotesModalHeader';
import { ExecutionNotesHistoryPane } from './ExecutionNotesHistoryPane';

export type { ExecutionNotesAndAppointmentModalsProps } from './ExecutionNotesAndAppointmentModals.types';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type {
    CaseNoteLogRow,
    CaseTaskPending,
    CaseTaskStep,
    ExecutionNotesAndAppointmentModalsProps,
} from './ExecutionNotesAndAppointmentModals.types';

// Type-surface honesty: keep CaseTask*/ExecutionFile/TimelineEvent reachable from this module.
export type NotesModalTypeSurface = ExecutionFile | TimelineEvent | CaseNoteLogRow | CaseTaskPending | CaseTaskStep;

export const ExecutionNotesAndAppointmentModalsReady: React.FC<
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
    const notesKeyboardInset = useMobileKeyboardInset(showNotesModal, true);

    return (
        <>
            {/* 🆕 V18: SEGMENTED NOTES/TASKS SHELL — المحرّر أولاً ثم المخزن (صفر CLS) */}
            {showNotesModal && (
                <div
                    className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
                    style={execModalKeyboardPadStyle(notesKeyboardInset)}
                >
                    <div
                        className={`flex h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-amber-500/30 bg-[#0A0F1C] shadow-md md:h-[600px] ${EXEC_MODAL_NOTES_SHELL_MAX}`}
                        data-testid="execution-notes-modal"
                    >
                        <ExecutionNotesModalHeader
                            onClose={closeNotesModal}
                            notesModalTab={notesModalTab}
                            onNotesModalTabChange={setNotesModalTab}
                            notesCount={savedNotesSplit.notes.length}
                            activeTasksCount={activeTasksCount}
                            notesPane={notesPane}
                            onNotesPaneChange={setNotesPane}
                        />

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
                        <ExecutionNotesHistoryPane
                            notesModalTab={notesModalTab}
                            caseTasksPending={caseTasksPending}
                            handleSaveTask={handleSaveTask}
                            handleUpdateTask={handleUpdateTask}
                            handleDeleteTask={handleDeleteTask}
                            handleCompleteTask={handleCompleteTask}
                            handleAddTimelineEvent={handleAddTimelineEvent}
                            toggleCaseTaskPin={toggleCaseTaskPin}
                            savedNotesSplit={savedNotesSplit}
                            showDoneTasksPanel={showDoneTasksPanel}
                            setShowDoneTasksPanel={setShowDoneTasksPanel}
                            pinnedNotes={pinnedNotes}
                            pinnedTasks={pinnedTasks}
                            toggleCaseNotePin={toggleCaseNotePin}
                            moveCaseNoteToTrash={moveCaseNoteToTrash}
                            unpinnedNotes={unpinnedNotes}
                            handleEditNote={handleEditNote}
                            decisionsStorageExecutionId={decisionsStorageExecutionId}
                            showToast={showToast}
                        />
                        ) : null}

                    </div>
                </div>
            )}

            <ExecutionAppointmentModal
                showAppointmentModal={showAppointmentModal}
                onCloseAppointmentModal={onCloseAppointmentModal}
                setEditingAppointmentId={setEditingAppointmentId}
                setAppointmentPurpose={setAppointmentPurpose}
                setAppointmentDateOnly={setAppointmentDateOnly}
                setAppointmentTimeOptional={setAppointmentTimeOptional}
                editingAppointmentId={editingAppointmentId}
                appointmentPurpose={appointmentPurpose}
                appointmentDateOnly={appointmentDateOnly}
                handleSaveAppointment={handleSaveAppointment}
                timelineEvents={timelineEvents}
                todayYmd={todayYmd}
                moveTimelineEventToTrash={moveTimelineEventToTrash}
            />
        </>
    );
};
