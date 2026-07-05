import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExecutionDashboardPhoneBodyMountStages } from '../useExecutionDashboardPhoneBodyMountStages';

const { prefetchExecutionOverlayModals } = vi.hoisted(() => ({
    prefetchExecutionOverlayModals: vi.fn(),
}));

vi.mock('@/app/utils/scheduleIdleWork', () => ({
    scheduleIdleWork: (work: () => void) => {
        work();
        return () => {};
    },
}));

vi.mock('../../executionDashboardLazyRegistry', () => ({
    prefetchExecutionOverlayModals,
}));

describe('useExecutionDashboardPhoneBodyMountStages', () => {
    it('enables staged sections through idle scheduling', async () => {
        const { result } = renderHook(() => useExecutionDashboardPhoneBodyMountStages({}));

        await waitFor(() => {
            expect(result.current.secondaryStageReady).toBe(true);
            expect(result.current.tertiaryStageReady).toBe(true);
        });

        expect(result.current.tertiaryStageUrgent).toBe(false);
        expect(prefetchExecutionOverlayModals).not.toHaveBeenCalled();
    });

    it('opens staged sections immediately for urgent financial and seizure overlays', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardPhoneBodyMountStages({
                showExecutionFinancialHub: true,
            }),
        );

        expect(result.current.secondaryStageReady).toBe(true);
        expect(result.current.tertiaryStageReady).toBe(true);
        expect(result.current.tertiaryStageUrgent).toBe(true);
        expect(prefetchExecutionOverlayModals).toHaveBeenCalledTimes(1);
    });
});
