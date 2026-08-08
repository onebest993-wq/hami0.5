import { describe, expect, it } from 'vitest';
import type { OtherPartyActionLogEntry } from '@/app/types/execution';
import {
    resolveOtherPartyLogEntryOutcome,
    syncOtherPartyActionLogOutcomes,
} from '../otherPartyActionLogOutcome';

describe('otherPartyActionLogOutcome', () => {
    const baseEntry: OtherPartyActionLogEntry = {
        id: 'opa-1',
        date: '2026-08-03',
        content: 'طلب تجريبي',
        outcome: 'pending',
        savedAt: '2026-08-03T00:00:00.000Z',
        decisionRowId: 'dec-1',
    };

    it('resolves approved outcome from linked decision row', () => {
        const outcome = resolveOtherPartyLogEntryOutcome(baseEntry, [
            {
                id: 'dec-1',
                requestKind: 'special_followup',
                title: 'تحرك الطرف الآخر — قيد البت',
                executorOutcome: 'approved',
            },
        ]);
        expect(outcome).toBe('approved');
    });

    it('syncOtherPartyActionLogOutcomes patches stored log when decision changed', () => {
        const { next, changed } = syncOtherPartyActionLogOutcomes([baseEntry], [
            {
                id: 'dec-1',
                requestKind: 'special_followup',
                title: 'تحرك الطرف الآخر — قيد البت',
                executorOutcome: 'rejected',
            },
        ]);
        expect(changed).toBe(true);
        expect(next[0]?.outcome).toBe('rejected');
    });
});
