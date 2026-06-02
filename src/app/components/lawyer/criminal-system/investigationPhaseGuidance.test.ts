import { describe, expect, it } from 'vitest';
import type { CriminalDefendant } from './criminalStore';
import {
    caseAllowsFugitiveParallelSplit,
    hasFugitiveDefendant,
} from './investigationPhaseGuidance';

function def(id: string, status = ''): CriminalDefendant {
    return { id, fullName: id, status: status as CriminalDefendant['status'], address: '' };
}

describe('investigationPhaseGuidance', () => {
    it('hasFugitiveDefendant detects fugitive status', () => {
        expect(hasFugitiveDefendant([def('a', 'حر'), def('b', 'موقوف')])).toBe(false);
        expect(hasFugitiveDefendant([def('a', 'هارب')])).toBe(true);
    });

    it('caseAllowsFugitiveParallelSplit requires fugitive and two selectable defendants', () => {
        expect(caseAllowsFugitiveParallelSplit([def('a', 'هارب')])).toBe(false);
        expect(
            caseAllowsFugitiveParallelSplit([def('a', 'هارب'), def('b', 'موقوف')]),
        ).toBe(true);
        expect(
            caseAllowsFugitiveParallelSplit([
                def('a', 'هارب'),
                { ...def('b', 'موقوف'), isPartyRecordLocked: true },
            ]),
        ).toBe(false);
    });
});
