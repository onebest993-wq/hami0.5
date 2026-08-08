import { describe, expect, it } from 'vitest';
import type { ExecutionFollowupOrchestratorSlice } from '../../orchestrators/executionFollowupOrchestratorTypes';

describe('ExecutionFollowupOrchestratorSlice', () => {
    it('includes fields required by handler cluster gate and debtor pipeline', () => {
        type RequiredKeys =
            | 'unifiedModalTab'
            | 'partyDeathModalParty'
            | 'evictionCaseExpenses'
            | 'executionDebtorTabIndex'
            | 'setUnifiedModalTab'
            | 'openExecutionSeizuresTab';

        const _assert: Pick<ExecutionFollowupOrchestratorSlice, RequiredKeys> = {} as never;
        expect(_assert).toBeDefined();
    });
});
