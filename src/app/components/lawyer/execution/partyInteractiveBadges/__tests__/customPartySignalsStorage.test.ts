import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = new Map<string, string>();

vi.mock('@/app/services/storage/readSecureOrDrainLegacySync', () => ({
    readSecureOrDrainLegacySync: (key: string) => mem.get(key) ?? null,
    writeSecureAndClearLegacySync: (key: string, value: string) => {
        mem.set(key, value);
    },
}));

import {
    appendCustomPartySignal,
    loadCustomPartySignals,
    removeCustomPartySignal,
} from '../customPartySignalsStorage';

describe('customPartySignalsStorage', () => {
    beforeEach(() => {
        mem.clear();
    });

    it('appends, rejects duplicates, and removes by id', () => {
        const a = appendCustomPartySignal('ex1', 'debtor', 'main', 'إحضار');
        expect(a?.label).toBe('إحضار');
        expect(appendCustomPartySignal('ex1', 'debtor', 'main', 'إحضار')).toBeNull();
        expect(loadCustomPartySignals('ex1', 'debtor', 'main')).toHaveLength(1);
        removeCustomPartySignal('ex1', 'debtor', 'main', a!.id);
        expect(loadCustomPartySignals('ex1', 'debtor', 'main')).toHaveLength(0);
    });
});
