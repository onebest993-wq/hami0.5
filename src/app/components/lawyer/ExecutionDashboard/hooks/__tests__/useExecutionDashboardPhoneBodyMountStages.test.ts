import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExecutionDashboardPhoneBodyMountStages } from '../useExecutionDashboardPhoneBodyMountStages';

const {
    prefetchExecutionFinanceOverlay,
    prefetchMaritalFurnitureModule,
    prefetchVisitationScheduleModule,
} = vi.hoisted(() => ({
    prefetchExecutionFinanceOverlay: vi.fn(),
    prefetchMaritalFurnitureModule: vi.fn(),
    prefetchVisitationScheduleModule: vi.fn(),
}));

vi.mock('@/app/utils/scheduleIdleWork', () => ({
    scheduleIdleWork: (work: () => void) => {
        work();
        return () => {};
    },
}));

vi.mock('../../executionDashboardLazyRegistryShell', () => ({
    prefetchMaritalFurnitureModule,
    prefetchVisitationScheduleModule,
}));

vi.mock('../../executionDashboardOverlayPrefetch', () => ({
    prefetchExecutionFinanceOverlay,
}));

describe('useExecutionDashboardPhoneBodyMountStages', () => {
    it('enables staged sections through idle scheduling', async () => {
        const { result } = renderHook(() => useExecutionDashboardPhoneBodyMountStages({}));

        await waitFor(() => {
            expect(result.current.secondaryStageReady).toBe(true);
            expect(result.current.tertiaryStageReady).toBe(true);
        });

        expect(result.current.tertiaryStageUrgent).toBe(false);
        expect(prefetchExecutionFinanceOverlay).not.toHaveBeenCalled();
    });

    it('opens staged sections immediately for urgent financial hub and prefetches finance only', async () => {
        prefetchExecutionFinanceOverlay.mockClear();
        const { result } = renderHook(() =>
            useExecutionDashboardPhoneBodyMountStages({
                showExecutionFinancialHub: true,
            }),
        );

        expect(result.current.secondaryStageReady).toBe(true);
        expect(result.current.tertiaryStageReady).toBe(true);
        expect(result.current.tertiaryStageUrgent).toBe(true);
        await waitFor(() => {
            expect(prefetchExecutionFinanceOverlay).toHaveBeenCalledTimes(1);
        });
    });

    it('opens quaternary stage immediately for visitation claims and preloads module', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardPhoneBodyMountStages({
                isVisitationClaim: true,
            }),
        );

        expect(result.current.quaternaryStageReady).toBe(true);
        expect(result.current.quaternaryStageUrgent).toBe(true);
        expect(prefetchVisitationScheduleModule).toHaveBeenCalledTimes(1);
    });

    it('opens quaternary stage immediately for marital furniture claims and preloads module', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardPhoneBodyMountStages({
                isMaritalFurnitureClaim: true,
            }),
        );

        expect(result.current.quaternaryStageReady).toBe(true);
        expect(result.current.quaternaryStageUrgent).toBe(true);
        expect(prefetchMaritalFurnitureModule).toHaveBeenCalledTimes(1);
    });
});
