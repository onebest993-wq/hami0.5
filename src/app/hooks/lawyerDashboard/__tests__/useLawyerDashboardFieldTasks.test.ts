import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardFieldTasks } from '@/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/runtime/fieldTasksHubLoader', () => ({
    loadFieldTasksHubModule: vi.fn(() => Promise.resolve([])),
    prefetchFieldTasksHubModule: vi.fn(),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: vi.fn(() => () => undefined),
}));

describe('useLawyerDashboardFieldTasks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفتح ستارة الميدان', async () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardFieldTasks({ userId: 'lawyer-1', setActiveTab }),
        );

        act(() => {
            result.current.openFieldTasksSheet();
        });

        expect(result.current.fieldTasksSheetOpen).toBe(true);
        expect(result.current.showTasksManager).toBe(false);
        expect(setActiveTab).toHaveBeenCalledWith('home');
    });

    it('لا يعيد remount عند إعادة فتح ستارة المهام', async () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardFieldTasks({ userId: 'lawyer-1', setActiveTab }),
        );

        act(() => {
            result.current.openFieldTasksSheet();
        });
        expect(result.current.fieldTasksSheetOpen).toBe(true);
        const sessionKey = result.current.fieldTasksSheetSessionKey;

        act(() => {
            result.current.closeFieldTasksSheet();
        });

        act(() => {
            result.current.openFieldTasksSheet();
        });
        expect(result.current.fieldTasksSheetOpen).toBe(true);

        expect(result.current.fieldTasksSheetSessionKey).toBe(sessionKey);
    });

    it('يرفض الفتح بدون تسجيل دخول', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardFieldTasks({ userId: null, setActiveTab: vi.fn() }),
        );

        act(() => {
            result.current.openFieldTasksSheet();
        });

        expect(result.current.fieldTasksSheetOpen).toBe(false);
    });

    it('openTasksManager يفتح مدير المهام مع تركيز اختياري', async () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardFieldTasks({ userId: 'lawyer-1', setActiveTab }),
        );

        act(() => {
            result.current.openTasksManager('task-42');
        });

        expect(result.current.showTasksManager).toBe(true);
        expect(result.current.tasksManagerFocusTaskId).toBe('task-42');
        expect(result.current.fieldTasksSheetOpen).toBe(false);
        expect(setActiveTab).toHaveBeenCalledWith('home');
    });

    it('switchToTasksManager ينتقل من الستارة دون إعادة auth', async () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardFieldTasks({ userId: 'lawyer-1', setActiveTab }),
        );

        act(() => {
            result.current.openFieldTasksSheet();
        });
        expect(result.current.fieldTasksSheetOpen).toBe(true);

        act(() => {
            result.current.switchToTasksManager();
        });

        expect(result.current.showTasksManager).toBe(true);
        expect(result.current.fieldTasksSheetOpen).toBe(false);
    });

    it('يغلق عند dismiss-transient-overlays', async () => {
        const { result } = renderHook(() =>
            useLawyerDashboardFieldTasks({ userId: 'lawyer-1', setActiveTab: vi.fn() }),
        );

        act(() => {
            result.current.openFieldTasksSheet();
        });

        expect(result.current.fieldTasksSheetOpen).toBe(true);

        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'vault' } }));
        });

        expect(result.current.fieldTasksSheetOpen).toBe(false);
    });
});
