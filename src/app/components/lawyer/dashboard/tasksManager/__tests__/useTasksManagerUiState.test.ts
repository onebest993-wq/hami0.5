import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTasksManagerUiState } from '../useTasksManagerUiState';

describe('useTasksManagerUiState', () => {
    it('starts with closed panels and empty edit drafts', () => {
        const { result } = renderHook(() => useTasksManagerUiState());

        expect(result.current.weekAdd).toBeNull();
        expect(result.current.detailPanel).toBeNull();
        expect(result.current.snoozePanelOpen).toBe(false);
        expect(result.current.reminderModalTaskId).toBeNull();
        expect(result.current.editOpen).toBe(false);
        expect(result.current.editSubTasks).toEqual([]);
        expect(result.current.deleteConfirmId).toBeNull();
        expect(result.current.showCompletedArchive).toBe(false);
        expect(result.current.helpInboxOpen).toBe(false);
        expect(result.current.postponeTaskId).toBeNull();
    });

    it('setDetailPanel stores a brief panel for a task id', () => {
        const { result } = renderHook(() => useTasksManagerUiState());

        act(() => {
            result.current.setDetailPanel({ taskId: 't1', kind: 'brief' });
        });

        expect(result.current.detailPanel).toEqual({ taskId: 't1', kind: 'brief' });
    });
});
