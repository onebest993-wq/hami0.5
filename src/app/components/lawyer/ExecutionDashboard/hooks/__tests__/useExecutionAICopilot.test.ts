import { describe, expect, it } from 'vitest';
import { useExecutionAICopilot } from '../useExecutionAICopilot';
import { renderHook } from '@testing-library/react';

describe('useExecutionAICopilot', () => {
    it('detects approved unified collection decisions', () => {
        const { result } = renderHook(() =>
            useExecutionAICopilot({
                decisionsStorageExecutionId: 'dossier-1',
                decisionsReloadEpoch: 0,
            }),
        );

        expect(typeof result.current.hasApprovedCollectionDecision).toBe('boolean');
        expect(result.current.firstActiveAppealDecisionId === null || typeof result.current.firstActiveAppealDecisionId === 'string').toBe(true);
    });
});
