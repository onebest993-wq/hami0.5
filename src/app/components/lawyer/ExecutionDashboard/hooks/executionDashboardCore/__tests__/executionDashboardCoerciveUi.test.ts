import { describe, expect, it } from 'vitest';
import { buildExecutionCoerciveUiFlags } from '../executionDashboardCoerciveUi';

describe('buildExecutionCoerciveUiFlags', () => {
    it('locks coercive UI when stay of execution is active', () => {
        const flags = buildExecutionCoerciveUiFlags({
            executionPaused: false,
            isPaused: false,
            stayOfExecutionActive: true,
            activeDebtorSolidary: false,
            allDebtorsUnifiedLength: 1,
            activeDebtorCleared: false,
            dossierStatus: 'active',
        });
        expect(flags.coerciveUiLocked).toBe(true);
        expect(flags.executionCoerciveButtonDisabled).toBe(true);
        expect(flags.coerciveDossierLocked).toBe(false);
    });

    it('disables coercive buttons when divided debtor cleared', () => {
        const flags = buildExecutionCoerciveUiFlags({
            executionPaused: false,
            isPaused: false,
            stayOfExecutionActive: false,
            activeDebtorSolidary: false,
            allDebtorsUnifiedLength: 2,
            activeDebtorCleared: true,
            dossierStatus: 'active',
        });
        expect(flags.dividedActiveDebtorCleared).toBe(true);
        expect(flags.executionCoerciveButtonDisabled).toBe(true);
    });

    it('locks dossier coercive lane when dossier not active', () => {
        const flags = buildExecutionCoerciveUiFlags({
            executionPaused: false,
            isPaused: false,
            stayOfExecutionActive: false,
            activeDebtorSolidary: true,
            allDebtorsUnifiedLength: 2,
            activeDebtorCleared: false,
            dossierStatus: 'closed',
        });
        expect(flags.dossierStatusUi).toBe('closed');
        expect(flags.coerciveDossierLocked).toBe(true);
        expect(flags.executionCoerciveButtonDisabled).toBe(false);
    });
});
