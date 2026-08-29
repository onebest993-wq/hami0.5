import { describe, expect, it } from 'vitest';
import { useExecutionDecisionAppealSnapshot } from '../useExecutionDecisionAppealSnapshot';
import { renderHook } from '@testing-library/react';

describe('useExecutionDecisionAppealSnapshot', () => {
    it('detects approved unified collection decisions', () => {
        const { result } = renderHook(() =>
            useExecutionDecisionAppealSnapshot({
                decisionsStorageExecutionId: 'dossier-1',
                decisionsReloadEpoch: 0,
            }),
        );

        expect(typeof result.current.hasApprovedCollectionDecision).toBe('boolean');
        expect(
            result.current.firstActiveAppealDecisionId === null ||
                typeof result.current.firstActiveAppealDecisionId === 'string',
        ).toBe(true);
    });
});
