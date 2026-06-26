import { describe, expect, it } from 'vitest';
import { mergeOrchestratorSlices } from '../executionOrchestratorTypes';
import type { ExecutionPartiesOrchestratorSlice } from '../executionOrchestratorSliceTypes';

describe('execution orchestrators', () => {
    it('mergeOrchestratorSlices combines slices without mutating inputs', () => {
        const a = { activeTabId: '1', setActiveTabId: () => {} };
        const b: ExecutionPartiesOrchestratorSlice = {
            showExtraCreditors: true,
            setShowExtraCreditors: () => {},
            showExtraDebtors: false,
            setShowExtraDebtors: () => {},
        };
        const merged = mergeOrchestratorSlices(a, b);
        expect(merged.activeTabId).toBe('1');
        expect(merged.showExtraCreditors).toBe(true);
        expect(a).not.toHaveProperty('showExtraCreditors');
    });
});
