import { describe, expect, it } from 'vitest';
import { useExecutionDashboardCoerciveUiState } from '../useExecutionDashboardCoerciveUiState';
import { renderHook } from '@testing-library/react';

describe('useExecutionDashboardCoerciveUiState', () => {
    it('locks coercive UI when execution is paused', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardCoerciveUiState({
                executionPaused: true,
                isPaused: false,
                stayOfExecutionActive: false,
                activeDebtorSolidary: false,
                allDebtorsUnifiedLength: 1,
                activeDebtorCleared: false,
                dossierStatus: 'active',
                isHistoricalMode: false,
            }),
        );

        expect(result.current.coerciveUiLocked).toBe(true);
        expect(result.current.evictionProcedureLocked).toBe(true);
        expect(result.current.executionActionsGridLocked).toBe(false);
    });

    it('locks timeline tools in historical mode', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardCoerciveUiState({
                executionPaused: false,
                isPaused: false,
                stayOfExecutionActive: false,
                activeDebtorSolidary: false,
                allDebtorsUnifiedLength: 1,
                activeDebtorCleared: false,
                dossierStatus: 'active',
                isHistoricalMode: true,
            }),
        );

        expect(result.current.executionToolsTimelineLockedUi).toBe(true);
    });
});
