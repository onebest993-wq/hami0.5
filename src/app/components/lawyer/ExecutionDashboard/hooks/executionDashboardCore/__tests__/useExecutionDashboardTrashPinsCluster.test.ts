import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardTrashPinsCluster } from '../useExecutionDashboardTrashPinsCluster';

const useExecutionTrashAndPinsMock = vi.fn();

vi.mock('../../useExecutionTrashAndPins', () => ({
    useExecutionTrashAndPins: (...args: unknown[]) => useExecutionTrashAndPinsMock(...args),
}));

describe('useExecutionDashboardTrashPinsCluster', () => {
    it('re-exports trash and pins handlers and surfaced fields', () => {
        const handlers = {
            timelineEditDraft: { id: 't-1' },
            setTimelineEditDraft: vi.fn(),
            moveTimelineEventToTrash: vi.fn(),
            toggleTimelineEventPin: vi.fn(),
            requestEditTimelineEvent: vi.fn(),
            restoreTimelineEventFromTrash: vi.fn(),
            permanentlyDeleteTimelineEvent: vi.fn(),
            moveCaseNoteToTrash: vi.fn(),
            moveCaseTaskToTrash: vi.fn(),
            toggleCaseNotePin: vi.fn(),
            toggleCaseTaskPin: vi.fn(),
            saveTimelineEditDraft: vi.fn(),
            restoreCaseNoteFromTrash: vi.fn(),
            permanentlyDeleteCaseNote: vi.fn(),
            restoreCaseTaskFromTrash: vi.fn(),
            permanentlyDeleteCaseTask: vi.fn(),
        };
        useExecutionTrashAndPinsMock.mockReturnValue(handlers);

        const timelineEventsRef = { current: [] };
        const caseNotesLogRef = { current: [] };
        const caseTasksPendingRef = { current: [] };
        const setTimelineEvents = vi.fn();
        const setCaseNotesLog = vi.fn();
        const setCaseTasksPending = vi.fn();
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();
        const setPermanentDeleteTimelineId = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardTrashPinsCluster({
                showExecutionTrashModal: false,
                setShowExecutionTrashModal: vi.fn(),
                timelineEventsRef: timelineEventsRef as never,
                caseNotesLogRef: caseNotesLogRef as never,
                caseTasksPendingRef: caseTasksPendingRef as never,
                setTimelineEvents: setTimelineEvents as never,
                setCaseNotesLog: setCaseNotesLog as never,
                setCaseTasksPending: setCaseTasksPending as never,
                persistExecutionMerge,
                showToast,
                currentFileId: 'ex-1',
                setPermanentDeleteTimelineId: setPermanentDeleteTimelineId as never,
            }),
        );

        expect(useExecutionTrashAndPinsMock).toHaveBeenCalled();
        expect(result.current.trashAndPinsHandlers).toBe(handlers);
        expect(result.current.timelineEditDraft).toEqual({ id: 't-1' });
        expect(result.current.saveTimelineEditDraft).toBe(handlers.saveTimelineEditDraft);
    });
});
