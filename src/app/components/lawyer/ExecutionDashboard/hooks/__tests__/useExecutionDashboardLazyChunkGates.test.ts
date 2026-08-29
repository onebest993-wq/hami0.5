import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardLazyChunkGates } from '../useExecutionDashboardLazyChunkGates';

const { prefetchExecutionFollowupOverlay, prefetchExecutionDashboardShellOverlays } = vi.hoisted(
    () => ({
        prefetchExecutionFollowupOverlay: vi.fn(),
        prefetchExecutionDashboardShellOverlays: vi.fn(),
    }),
);

vi.mock('../../executionDashboardOverlayPrefetch', () => ({
    prefetchExecutionFollowupOverlay,
}));

vi.mock('../../executionDashboardShellOverlaysLazy', () => ({
    prefetchExecutionDashboardShellOverlays,
}));

vi.mock('../../executionEvictionFollowupLazy', () => ({
    prefetchEvictionFollowupSurfaces: vi.fn(),
}));

describe('useExecutionDashboardLazyChunkGates', () => {
    it('enables phone body when chunk data is ready without mounting overlays', () => {
        prefetchExecutionFollowupOverlay.mockClear();
        prefetchExecutionDashboardShellOverlays.mockClear();
        const { result } = renderHook(() =>
            useExecutionDashboardLazyChunkGates(
                {
                    showUnifiedExecutionModal: false,
                    showDecisionsModal: false,
                },
                true,
            ),
        );

        expect(result.current.phoneBodyReady).toBe(true);
        expect(result.current.shellOverlaysReady).toBe(false);
        expect(prefetchExecutionFollowupOverlay).not.toHaveBeenCalled();
        expect(prefetchExecutionDashboardShellOverlays).not.toHaveBeenCalled();
    });

    it('forces both gates open when an urgent modal is visible', () => {
        prefetchExecutionFollowupOverlay.mockClear();
        prefetchExecutionDashboardShellOverlays.mockClear();
        const { result } = renderHook(() =>
            useExecutionDashboardLazyChunkGates(
                {
                    showNotesModal: true,
                },
                false,
            ),
        );

        expect(result.current.overlayUrgent).toBe(true);
        expect(result.current.phoneBodyReady).toBe(true);
        expect(result.current.shellOverlaysReady).toBe(true);
        expect(prefetchExecutionFollowupOverlay).not.toHaveBeenCalled();
        expect(prefetchExecutionDashboardShellOverlays).toHaveBeenCalledTimes(1);
    });

    it('opens the shell overlays barrel for eviction followup windows', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardLazyChunkGates(
                {
                    showEvictionExpenseModal: true,
                },
                false,
            ),
        );
        expect(result.current.shellOverlaysReady).toBe(true);
        expect(result.current.overlayUrgent).toBe(true);
    });

    it('prefetches followup overlay only when the followup modal is open', () => {
        prefetchExecutionFollowupOverlay.mockClear();
        prefetchExecutionDashboardShellOverlays.mockClear();
        const { result } = renderHook(() =>
            useExecutionDashboardLazyChunkGates(
                {
                    showUnifiedExecutionModal: true,
                },
                false,
            ),
        );

        expect(result.current.overlayUrgent).toBe(true);
        expect(result.current.phoneBodyReady).toBe(true);
        expect(result.current.shellOverlaysReady).toBe(false);
        expect(prefetchExecutionFollowupOverlay).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionDashboardShellOverlays).not.toHaveBeenCalled();
    });
});
