import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardTasksOverlayEscape } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTasksOverlayEscape';

const nativeHandlers: Array<() => boolean> = [];

vi.mock('@/app/components/lawyer/dashboard/fieldTasks/tasksEscapeCoordinator', () => ({
    isTasksOverlayEscapeBlocked: () => false,
}));

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: (handler: () => boolean) => {
        nativeHandlers.push(handler);
        return () => {
            const i = nativeHandlers.indexOf(handler);
            if (i >= 0) nativeHandlers.splice(i, 1);
        };
    },
}));

describe('useLawyerDashboardTasksOverlayEscape', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        nativeHandlers.length = 0;
    });

    it('closes field tasks sheet on Escape', () => {
        const onCloseFieldTasksSheet = vi.fn();
        const onCloseTasksManager = vi.fn();

        renderHook(() =>
            useLawyerDashboardTasksOverlayEscape({
                fieldTasksSheetOpen: true,
                showTasksManager: false,
                onCloseFieldTasksSheet,
                onCloseTasksManager,
            }),
        );

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });

        expect(onCloseFieldTasksSheet).toHaveBeenCalledTimes(1);
        expect(onCloseTasksManager).not.toHaveBeenCalled();
    });

    it('closes tasks manager on Escape when curtain is closed', () => {
        const onCloseFieldTasksSheet = vi.fn();
        const onCloseTasksManager = vi.fn();

        renderHook(() =>
            useLawyerDashboardTasksOverlayEscape({
                fieldTasksSheetOpen: false,
                showTasksManager: true,
                onCloseFieldTasksSheet,
                onCloseTasksManager,
            }),
        );

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });

        expect(onCloseTasksManager).toHaveBeenCalledTimes(1);
        expect(onCloseFieldTasksSheet).not.toHaveBeenCalled();
    });

    it('Cap back يغلق الستارة أولاً ثم المدير', () => {
        const onCloseFieldTasksSheet = vi.fn();
        const onCloseTasksManager = vi.fn();
        const { rerender } = renderHook(
            (props: { sheet: boolean; manager: boolean }) =>
                useLawyerDashboardTasksOverlayEscape({
                    fieldTasksSheetOpen: props.sheet,
                    showTasksManager: props.manager,
                    onCloseFieldTasksSheet,
                    onCloseTasksManager,
                }),
            { initialProps: { sheet: true, manager: false } },
        );

        expect(nativeHandlers[0]?.()).toBe(true);
        expect(onCloseFieldTasksSheet).toHaveBeenCalledTimes(1);

        rerender({ sheet: false, manager: true });
        expect(nativeHandlers[0]?.()).toBe(true);
        expect(onCloseTasksManager).toHaveBeenCalledTimes(1);
    });
});
