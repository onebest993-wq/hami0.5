import { describe, expect, it } from 'vitest';
import { normalizeExecutionFileArrays } from '../normalizeExecutionFileArrays';

describe('normalizeExecutionFileArrays', () => {
    it('replaces corrupt non-array fields with empty arrays', () => {
        const file = normalizeExecutionFileArrays({
            id: 'x',
            caseNotesLog: { id: 'bad' },
            seizedAssets: 'nope',
            timelineEvents: 1,
            linkedDossiers: { linkedId: 'z' },
            seizureDraftsByDecisionId: [],
            creditors: [{ id: 'c1', name: 'دائن' }],
        } as never);

        expect(file.caseNotesLog).toEqual([]);
        expect(file.seizedAssets).toEqual([]);
        expect(file.timelineEvents).toEqual([]);
        expect(file.linkedDossiers).toEqual([]);
        expect(file.seizureDraftsByDecisionId).toEqual({});
        expect(file.creditors).toEqual([{ id: 'c1', name: 'دائن' }]);
    });

    it('returns the same reference when all array fields are already valid', () => {
        const input = {
            id: 'ok',
            caseNotesLog: [],
            seizedAssets: [],
            timelineEvents: [],
        } as never;
        expect(normalizeExecutionFileArrays(input)).toBe(input);
    });
});
