import { describe, expect, it } from 'vitest';
import { resolveFocusCaseIdApply } from '../resolveFocusCaseIdApply';

describe('resolveFocusCaseIdApply', () => {
    it('resets lastApplied when focus clears', () => {
        expect(resolveFocusCaseIdApply(undefined, 'case-a', true)).toEqual({
            apply: false,
            nextLastApplied: null,
        });
    });

    it('applies first focus when case exists', () => {
        expect(resolveFocusCaseIdApply('case-a', null, true)).toEqual({
            apply: true,
            nextLastApplied: 'case-a',
        });
    });

    it('skips re-apply of the same focus id', () => {
        expect(resolveFocusCaseIdApply('case-a', 'case-a', true)).toEqual({
            apply: false,
            nextLastApplied: 'case-a',
        });
    });

    it('applies a new focus id without requiring undefined in between (A→B)', () => {
        expect(resolveFocusCaseIdApply('case-b', 'case-a', true)).toEqual({
            apply: true,
            nextLastApplied: 'case-b',
        });
    });

    it('waits until the case exists in the list', () => {
        expect(resolveFocusCaseIdApply('case-a', null, false)).toEqual({
            apply: false,
            nextLastApplied: null,
        });
    });
});
