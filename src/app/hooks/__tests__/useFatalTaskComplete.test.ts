import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { useFatalTaskComplete } from '../useFatalTaskComplete';

function fatalTask(id: string): LegalTask {
    return {
        id,
        rawText: 'تمييز',
        title: 'تمييز',
        location: null,
        parsedDate: null,
        reminderAt: null,
        isFatalDeadline: true,
        linkedCaseId: null,
        status: 'pending',
        pinnedToFieldCurtain: false,
        subTasks: [],
        documentRequirements: [],
        expenses: [],
    };
}

function normalTask(id: string): LegalTask {
    return { ...fatalTask(id), isFatalDeadline: false, title: 'عادي' };
}

describe('useFatalTaskComplete', () => {
    it('completes non-fatal task immediately', () => {
        const completeTask = vi.fn();
        const { result } = renderHook(() => useFatalTaskComplete(completeTask));

        act(() => {
            result.current.requestComplete(normalTask('n1'));
        });

        expect(completeTask).toHaveBeenCalledWith('n1');
        expect(result.current.fatalOpen).toBe(false);
    });

    it('opens confirm dialog for fatal task then confirms', () => {
        const completeTask = vi.fn();
        const { result } = renderHook(() => useFatalTaskComplete(completeTask));

        act(() => {
            result.current.requestComplete(fatalTask('f1'));
        });

        expect(completeTask).not.toHaveBeenCalled();
        expect(result.current.fatalOpen).toBe(true);
        expect(result.current.fatalConfirmId).toBe('f1');

        act(() => {
            result.current.confirmFatalComplete();
        });

        expect(completeTask).toHaveBeenCalledWith('f1');
        expect(result.current.fatalOpen).toBe(false);
    });

    it('cancelFatalComplete clears pending confirm', () => {
        const completeTask = vi.fn();
        const { result } = renderHook(() => useFatalTaskComplete(completeTask));

        act(() => {
            result.current.requestComplete(fatalTask('f2'));
        });
        act(() => {
            result.current.cancelFatalComplete();
        });

        expect(completeTask).not.toHaveBeenCalled();
        expect(result.current.fatalOpen).toBe(false);
    });
});
