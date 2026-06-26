import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardShellOrchestrators } from '../useExecutionDashboardShellOrchestrators';

describe('useExecutionDashboardShellOrchestrators', () => {
    it('merges parties, financial, dossier tab, and lifecycle panel slices', () => {
        let followupOpen = false;
        const { result, rerender } = renderHook(
            (props: {
                executionFileKey: string;
                currentFileId: string;
            }) =>
                useExecutionDashboardShellOrchestrators({
                    executionFileKey: props.executionFileKey,
                    currentFileId: props.currentFileId,
                    executionData: { id: props.executionFileKey, dossier_lifecycle_status: 'active' } as never,
                    setShowUnifiedExecutionModal: (show) => {
                        followupOpen = show;
                    },
                }),
            { initialProps: { executionFileKey: 'ex-1', currentFileId: 'ex-1' } },
        );

        expect(result.current.activeTabId).toBe('ex-1');

        act(() => {
            result.current.setShowExtraCreditors(true);
            result.current.openFinancialHubLedger();
        });

        expect(result.current.showExtraCreditors).toBe(true);
        expect(followupOpen).toBe(false);
        expect(result.current.showExecutionFinancialHub).toBe(true);

        rerender({ executionFileKey: 'ex-2', currentFileId: 'ex-2' });
        expect(result.current.activeTabId).toBe('ex-2');
        expect(result.current.showExtraCreditors).toBe(false);
    });
});
