import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { releaseBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useLawyerDashboardTasksOverlayEscape } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTasksOverlayEscape';

vi.mock('@/app/utils/bodyScrollLock', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/utils/bodyScrollLock')>();
    return {
        ...actual,
        releaseBodyScrollLock: vi.fn(),
    };
});

describe('useLawyerDashboardTasksOverlayEscape', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
        expect(releaseBodyScrollLock).toHaveBeenCalledTimes(1);
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
        expect(releaseBodyScrollLock).toHaveBeenCalledTimes(1);
        expect(onCloseFieldTasksSheet).not.toHaveBeenCalled();
    });
});
