import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    EXEC_OVERLAY_PHONE_BACKDROP,
    EXEC_OVERLAY_PHONE_SHEET,
    execModalKeyboardPadStyle,
} from '../executionModalMobileShell';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { DossierFastNoteComposer } from '@/app/components/lawyer/dossier-notes/DossierFastNoteComposer';
import { plainTextFromPossiblyHtml } from '@/app/components/lawyer/SmartRepository/legalRichTextEditorUtils';
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
    toggleCaseTaskPin: _toggleCaseTaskPin,
    decisionsStorageExecutionId,
    showToast,
    noteTitle,
    noteBody,
    isTask: _isTask,
    editingTaskId: _editingTaskId,
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
    caseTasksPending: _caseTasksPending,
    handleSaveTask: _handleSaveTask,
    handleUpdateTask: _handleUpdateTask,
    handleDeleteTask: _handleDeleteTask,
    handleCompleteTask: _handleCompleteTask,
    handleAddTimelineEvent: _handleAddTimelineEvent,
}) => {
    /** داخل المودال: كتابة أو سجل محفوظ */
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

    /** تعديل ملاحظة من المخزن → تعبئة المحرّر والانتقال لوضع الكتابة */
    const handleEditNote = useCallback(
        (note: { id: string; title: string; body: string }) => {
            setEditingNoteId?.(note.id);
            setNoteTitle(note.title);
            setNoteBody(note.body);
            setIsTask(false);
            setEditingTaskId(null);
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
            if (typeof commitDossierNote !== 'function') {
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
            {showNotesModal && (
                <div
                    className={`${EXEC_OVERLAY_PHONE_BACKDROP} z-[60]`}
                    style={execModalKeyboardPadStyle(notesKeyboardInset)}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeNotesModal();
                    }}
                >
                    <div
                        className={EXEC_OVERLAY_PHONE_SHEET}
                        data-testid="execution-notes-modal"
                    >
                        <ExecutionNotesModalHeader
                            onClose={closeNotesModal}
                            notesCount={savedNotesSplit.notes.length}
                            notesPane={notesPane}
                            onNotesPaneChange={setNotesPane}
                        />

                        {notesPane === 'compose' ? (
                            <div
                                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-2"
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

                        {notesPane === 'vault' ? (
                            <ExecutionNotesHistoryPane
                                pinnedNotes={pinnedNotes}
                                pinnedTasks={[]}
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
