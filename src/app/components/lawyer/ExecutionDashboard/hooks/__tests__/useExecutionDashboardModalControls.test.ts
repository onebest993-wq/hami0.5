import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { useExecutionDashboardModalControls } from '../useExecutionDashboardModalControls';

describe('useExecutionDashboardModalControls', () => {
    it('resets modals when execution file id changes', () => {
        useExecutionDashboardStore.getState().openModal('showNotesModal');
        expect(useExecutionDashboardStore.getState().modals.showNotesModal).toBe(true);

        const { rerender } = renderHook(
            ({ fileId }: { fileId: string | null }) => useExecutionDashboardModalControls(fileId),
            { initialProps: { fileId: 'file-a' } },
        );

        expect(useExecutionDashboardStore.getState().modals.showNotesModal).toBe(false);

        act(() => {
            useExecutionDashboardStore.getState().openModal('showNotesModal');
        });
        expect(useExecutionDashboardStore.getState().modals.showNotesModal).toBe(true);

        rerender({ fileId: 'file-b' });
        expect(useExecutionDashboardStore.getState().modals.showNotesModal).toBe(false);
    });

    it('setShowUnifiedExecutionModal toggles unified followup modal', () => {
        const { result } = renderHook(() => useExecutionDashboardModalControls('ex-1'));

        act(() => {
            result.current.setShowUnifiedExecutionModal(true);
        });
        expect(useExecutionDashboardStore.getState().modals.showUnifiedExecutionModal).toBe(true);

        act(() => {
            result.current.setShowUnifiedExecutionModal(false);
        });
        expect(useExecutionDashboardStore.getState().modals.showUnifiedExecutionModal).toBe(false);
    });
});
