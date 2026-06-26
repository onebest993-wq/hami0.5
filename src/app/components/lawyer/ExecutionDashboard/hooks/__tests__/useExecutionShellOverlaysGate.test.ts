import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionShellOverlaysGate } from '../useExecutionShellOverlaysGate';

vi.mock('@/app/utils/scheduleIdleWork', () => ({
    scheduleIdleWork: (work: () => void) => {
        work();
        return () => {};
    },
}));

describe('useExecutionShellOverlaysGate', () => {
    it('opens shell overlays immediately when an urgent modal is active', () => {
        const { result } = renderHook(() =>
            useExecutionShellOverlaysGate({ showUnifiedExecutionModal: true }),
        );
        expect(result.current.shellOverlaysReady).toBe(true);
        expect(result.current.overlayUrgent).toBe(true);
    });

    it('enables shell overlays via idle scheduler when no urgent modal', () => {
        const { result } = renderHook(() => useExecutionShellOverlaysGate({}));
        expect(result.current.shellOverlaysReady).toBe(true);
        expect(result.current.overlayUrgent).toBe(false);
    });
});
