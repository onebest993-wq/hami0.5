import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardNotesTasksHandlers } from '../useExecutionDashboardNotesTasksHandlers';

function makeRefs() {
    const notes = [{ id: 'n1', title: 'قديم', body: 'نص', createdAt: '2026-01-01T00:00:00.000Z' }];
    const tasks: Array<{ id: string; title: string; body: string; dueDate?: string; createdAt: string }> = [];
    const timeline: Array<Record<string, unknown>> = [];
    return {
        caseNotesLogRef: { current: notes },
        caseTasksPendingRef: { current: tasks },
        timelineEventsRef: { current: timeline },
        notes,
        tasks,
        timeline,
    };
}

describe('useExecutionDashboardNotesTasksHandlers', () => {
    beforeEach(() => {
        vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-06-27T12:00:00.000Z');
    });

    it('commitDossierNote adds a new note and timeline entry', async () => {
        const refs = makeRefs();
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();
        const setCaseNotesLog = vi.fn();
        const setTimelineEvents = vi.fn();
        let seq = 0;
        const nextTimelineId = () => `tl-${++seq}`;

        const { result } = renderHook(() =>
            useExecutionDashboardNotesTasksHandlers({
                noteTitle: '',
                noteBody: '',
                isTask: false,
                taskDueDate: '',
                taskStatus: 'pending',
                editingTaskId: null,
                caseTasksPending: [],
                caseNotesLogRef: refs.caseNotesLogRef,
                caseTasksPendingRef: refs.caseTasksPendingRef,
                timelineEventsRef: refs.timelineEventsRef,
                currentFileId: 'exec-1',
                executionData: null,
                file: null,
                nextTimelineId,
                persistExecutionMerge,
                showToast,
                pushTimelineEvent: vi.fn(),
                moveCaseTaskToTrash: vi.fn(),
                setNoteTitle: vi.fn(),
                setNoteBody: vi.fn(),
                setIsTask: vi.fn(),
                setTaskDueDate: vi.fn(),
                setTaskStatus: vi.fn(),
                setEditingTaskId: vi.fn(),
                setEditingNoteId: vi.fn(),
                setCaseNotesLog,
                setCaseTasksPending: vi.fn(),
                setTimelineEvents,
                setShowNotesModal: vi.fn(),
                openFollowupModalPersisted: vi.fn(),
                closeUnifiedSeizureLog: vi.fn(),
            }),
        );

        await act(async () => {
            await result.current.commitDossierNote({ title: 'عنوان', bodyHtml: 'محتوى' });
        });

        expect(persistExecutionMerge).toHaveBeenCalledTimes(1);
        const patch = persistExecutionMerge.mock.calls[0][0];
        expect(patch.caseNotesLog).toHaveLength(2);
        expect(patch.timelineEvents).toHaveLength(1);
        expect(showToast).toHaveBeenCalledWith('تم حفظ الملاحظة بنجاح', 'success');
    });

    it('handleCompleteTask moves pending task to notes log', () => {
        const refs = makeRefs();
        refs.caseTasksPendingRef.current = [
            { id: 't1', title: 'مهمة', body: 'تفاصيل', createdAt: '2026-01-01T00:00:00.000Z' },
        ];
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();
        let seq = 0;
        const nextTimelineId = () => `tl-${++seq}`;

        const { result } = renderHook(() =>
            useExecutionDashboardNotesTasksHandlers({
                noteTitle: '',
                noteBody: '',
                isTask: false,
                taskDueDate: '',
                taskStatus: 'pending',
                editingTaskId: null,
                caseTasksPending: refs.caseTasksPendingRef.current,
                caseNotesLogRef: refs.caseNotesLogRef,
                caseTasksPendingRef: refs.caseTasksPendingRef,
                timelineEventsRef: refs.timelineEventsRef,
                currentFileId: 'exec-1',
                executionData: null,
                file: null,
                nextTimelineId,
                persistExecutionMerge,
                showToast,
                pushTimelineEvent: vi.fn(),
                moveCaseTaskToTrash: vi.fn(),
                setNoteTitle: vi.fn(),
                setNoteBody: vi.fn(),
                setIsTask: vi.fn(),
                setTaskDueDate: vi.fn(),
                setTaskStatus: vi.fn(),
                setEditingTaskId: vi.fn(),
                setEditingNoteId: vi.fn(),
                setCaseNotesLog: vi.fn((fn) => {
                    if (typeof fn === 'function') refs.caseNotesLogRef.current = fn(refs.caseNotesLogRef.current);
                }),
                setCaseTasksPending: vi.fn((fn) => {
                    if (typeof fn === 'function') refs.caseTasksPendingRef.current = fn(refs.caseTasksPendingRef.current);
                }),
                setTimelineEvents: vi.fn(),
                setShowNotesModal: vi.fn(),
                openFollowupModalPersisted: vi.fn(),
                closeUnifiedSeizureLog: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleCompleteTask('t1');
        });

        expect(persistExecutionMerge).toHaveBeenCalledTimes(1);
        const patch = persistExecutionMerge.mock.calls[0][0];
        expect(patch.caseTasksPending).toEqual([]);
        expect(patch.caseNotesLog).toHaveLength(2);
        expect(showToast).toHaveBeenCalledWith('تم تسجيل إنجاز المهمة', 'success');
    });
});
