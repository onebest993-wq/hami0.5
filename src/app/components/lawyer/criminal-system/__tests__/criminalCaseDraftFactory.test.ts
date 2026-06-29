import { describe, expect, it } from 'vitest';
import {
    makeEmptyLocation,
    makeInitialDraft,
    normalizeCriminalCaseLocation,
} from '../criminalCaseDraftFactory';

describe('criminalCaseDraftFactory', () => {
    it('makeInitialDraft seeds one complainant and defendant', () => {
        const draft = makeInitialDraft();
        expect(draft.complainants).toHaveLength(1);
        expect(draft.defendants).toHaveLength(1);
        expect(draft.location).toEqual(makeEmptyLocation());
    });

    it('normalizeCriminalCaseLocation rejects junk case numbers', () => {
        expect(
            normalizeCriminalCaseLocation({
                ...makeEmptyLocation(),
                caseNumber: 'ىرلاىرلاى',
            }).caseNumber,
        ).toBe('');
    });
});
