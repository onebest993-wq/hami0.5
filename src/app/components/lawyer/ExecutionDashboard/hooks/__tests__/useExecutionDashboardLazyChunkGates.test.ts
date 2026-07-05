import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExecutionDashboardLazyChunkGates } from '../useExecutionDashboardLazyChunkGates';

vi.mock('@/app/utils/scheduleIdleWork', () => ({
    scheduleIdleWork: (work: () => void) => {
        work();
        return () => {};
    },
}));

describe('useExecutionDashboardLazyChunkGates', () => {
    it('enables phone body and shell overlays together when chunk data is ready', async () => {
        const { result } = renderHook(() =>
            useExecutionDashboardLazyChunkGates(
                {
                    showUnifiedExecutionModal: false,
                    showDecisionsModal: false,
                },
                true,
            ),
        );

        await waitFor(() => {
            expect(result.current.phoneBodyReady).toBe(true);
            expect(result.current.shellOverlaysReady).toBe(true);
        });
    });

    it('forces both gates open when an urgent modal is visible', () => {
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
    });
});
