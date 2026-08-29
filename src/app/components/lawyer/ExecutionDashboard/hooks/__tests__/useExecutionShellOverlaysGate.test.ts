import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionShellOverlaysGate } from '../useExecutionShellOverlaysGate';

describe('useExecutionShellOverlaysGate', () => {
    it('opens shell overlays immediately when an urgent modal is active', () => {
        const { result } = renderHook(() =>
            useExecutionShellOverlaysGate({ showNotesModal: true }),
        );
        expect(result.current.shellOverlaysReady).toBe(true);
        expect(result.current.overlayUrgent).toBe(true);
    });

    it('does not open the shell overlay barrel for followup-only', () => {
        const { result } = renderHook(() =>
            useExecutionShellOverlaysGate({ showUnifiedExecutionModal: true }),
        );
        expect(result.current.shellOverlaysReady).toBe(false);
        expect(result.current.overlayUrgent).toBe(false);
    });

    it('opens shell overlays for eviction expense', () => {
        const { result } = renderHook(() =>
            useExecutionShellOverlaysGate({ showEvictionExpenseModal: true }),
        );
        expect(result.current.shellOverlaysReady).toBe(true);
    });

    it('keeps shell overlays closed when no urgent modal', () => {
        const { result } = renderHook(() => useExecutionShellOverlaysGate({}));
        expect(result.current.shellOverlaysReady).toBe(false);
        expect(result.current.overlayUrgent).toBe(false);
    });
});
