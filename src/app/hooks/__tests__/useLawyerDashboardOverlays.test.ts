import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardOverlays } from '../useLawyerDashboardOverlays';

describe('useLawyerDashboardOverlays — مهام الميدان', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفتح ستارة الميدان وليس مدير المهام الكامل', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn(), userId: 'lawyer-1' }),
        );

        act(() => {
            result.current.openFieldTasksSheet();
        });

        expect(result.current.fieldTasksSheetOpen).toBe(true);
        expect(result.current.showTasksManager).toBe(false);
    });

    it('openTasksManager يفتح مدير المهام مع تركيز اختياري', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn(), userId: 'lawyer-1' }),
        );

        act(() => {
            result.current.openTasksManager('task-42');
        });

        expect(result.current.showTasksManager).toBe(true);
        expect(result.current.tasksManagerFocusTaskId).toBe('task-42');
        expect(result.current.fieldTasksSheetOpen).toBe(false);
    });
});
