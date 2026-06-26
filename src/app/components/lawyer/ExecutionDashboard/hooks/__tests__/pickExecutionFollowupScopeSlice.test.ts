import { describe, expect, it } from 'vitest';
import { pickExecutionFollowupScopeSlice } from '../pickExecutionFollowupScopeSlice';

describe('pickExecutionFollowupScopeSlice', () => {
    it('picks only registered followup snapshot keys', () => {
        const slice = pickExecutionFollowupScopeSlice({
            saveCoerciveAction: () => {},
            saveStandaloneExecutionMarkForDecision: () => {},
            notAFollowupKey: 42,
        });
        expect(typeof slice.saveCoerciveAction).toBe('function');
        expect(typeof slice.saveStandaloneExecutionMarkForDecision).toBe('function');
        expect(slice.notAFollowupKey).toBeUndefined();
    });
});
