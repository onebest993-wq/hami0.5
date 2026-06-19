import { describe, expect, it } from 'vitest';
import {
    canSetDebtorEntityKind,
    capManualIndependentDebtRaw,
    maxManualIndependentDebtForSlot,
    resolveLockedDebtorEntityKind,
} from '../executionFormUtils';

describe('manual independent debt cap', () => {
    it('caps independent slot at global total', () => {
        expect(maxManualIndependentDebtForSlot(5_000_000, [false], [0], 0)).toBe(5_000_000);
        expect(capManualIndependentDebtRaw(5_000_000, [false], [0], 0, '6000000')).toBe('5000000');
    });

    it('subtracts other independent shares from max', () => {
        expect(
            maxManualIndependentDebtForSlot(5_000_000, [false, false], [3_000_000, 0], 1),
        ).toBe(2_000_000);
    });
});

describe('debtor entity kind lock', () => {
    it('locks to legal when any debtor is legal entity', () => {
        expect(
            resolveLockedDebtorEntityKind(
                [{ entityKind: 'natural_person' }],
                [{ entityKind: 'legal_entity' }],
            ),
        ).toBe('legal_entity');
    });

    it('blocks mixing natural and legal', () => {
        expect(
            canSetDebtorEntityKind(
                [{ id: 1, entityKind: 'natural_person' }],
                [{ id: 'ad_1', entityKind: 'natural_person' }],
                'ad_1',
                'legal_entity',
            ),
        ).toBe(false);
    });
});
