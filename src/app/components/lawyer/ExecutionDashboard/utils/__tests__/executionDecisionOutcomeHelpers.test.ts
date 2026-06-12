import { describe, expect, it } from 'vitest';
import { matchesExecutionOutcomeEvent } from '@/app/components/lawyer/ExecutionDashboard/utils/executionDecisionOutcomeHelpers';

describe('matchesExecutionOutcomeEvent', () => {
    it('matches same execution id', () => {
        expect(
            matchesExecutionOutcomeEvent({ executionId: 'ex-9', requestKind: 'seizure' }, 'ex-9')
        ).toBe(true);
    });

    it('rejects different execution id', () => {
        expect(
            matchesExecutionOutcomeEvent({ executionId: 'ex-2', requestKind: 'seizure' }, 'ex-9')
        ).toBe(false);
    });
});
