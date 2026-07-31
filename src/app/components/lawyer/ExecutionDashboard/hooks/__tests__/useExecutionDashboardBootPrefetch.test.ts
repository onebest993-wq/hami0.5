import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useExecutionDashboardBootPrefetch } from '../useExecutionDashboardBootPrefetch';

const {
    prefetchExecutionDashboardShellMock,
    prefetchExecutionFollowupOverlayMock,
    prefetchExecutionDashboardPhoneBodyMock,
    prefetchExecutionModalContainersMock,
    prefetchExecutionOverlayModalsMock,
    scheduleIdleWorkMock,
} = vi.hoisted(() => ({
    prefetchExecutionDashboardShellMock: vi.fn(() => undefined),
    prefetchExecutionFollowupOverlayMock: vi.fn(() => undefined),
    prefetchExecutionDashboardPhoneBodyMock: vi.fn(() => undefined),
    prefetchExecutionModalContainersMock: vi.fn(() => undefined),
    prefetchExecutionOverlayModalsMock: vi.fn(() => undefined),
    scheduleIdleWorkMock: vi.fn((fn: () => void) => {
        fn();
        return () => undefined;
    }),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => false,
}));

vi.mock('@/app/utils/scheduleIdleWork', () => ({
    scheduleIdleWork: (fn: () => void, _delay?: number) => scheduleIdleWorkMock(fn),
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistry', () => ({
    prefetchExecutionDashboardShell: () => prefetchExecutionDashboardShellMock(),
    prefetchExecutionModalContainers: () => prefetchExecutionModalContainersMock(),
    prefetchExecutionOverlayModals: () => prefetchExecutionOverlayModalsMock(),
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionDashboardOverlayPrefetch', () => ({
    prefetchExecutionFollowupOverlay: () => prefetchExecutionFollowupOverlayMock(),
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionDashboardPhoneBodyLazy', () => ({
    prefetchExecutionDashboardPhoneBody: () => prefetchExecutionDashboardPhoneBodyMock(),
}));

describe('useExecutionDashboardBootPrefetch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('prefetches followup critical path immediately on mount', () => {
        renderHook((_: void) => useExecutionDashboardBootPrefetch());

        expect(prefetchExecutionFollowupOverlayMock).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionDashboardShellMock).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionDashboardPhoneBodyMock).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionModalContainersMock).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionOverlayModalsMock).toHaveBeenCalledTimes(1);
    });

    it('still prefetches on remount', () => {
        const { unmount } = renderHook((_: void) => useExecutionDashboardBootPrefetch());
        unmount();
        renderHook((_: void) => useExecutionDashboardBootPrefetch());

        expect(prefetchExecutionFollowupOverlayMock).toHaveBeenCalledTimes(2);
    });
});
