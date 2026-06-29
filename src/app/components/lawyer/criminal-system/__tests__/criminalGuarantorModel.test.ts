import { describe, expect, it } from 'vitest';
import {
    isGuarantorForfeited,
    makeEmptyGuarantorDetails,
    normalizeGuarantorDetails,
} from '../criminalGuarantorModel';

describe('criminalGuarantorModel', () => {
    it('makeEmptyGuarantorDetails returns blank fields', () => {
        expect(makeEmptyGuarantorDetails()).toEqual({ bailAmount: '', guarantorInfo: '' });
    });

    it('normalizeGuarantorDetails parses structured personal bail', () => {
        expect(
            normalizeGuarantorDetails({
                kind: 'personal',
                bailAmount: '',
                guarantorInfo: '',
                guarantors: [{ id: 'g1', fullName: 'أحمد علي' }],
            }),
        ).toMatchObject({
            kind: 'personal',
            guarantors: [{ id: 'g1', fullName: 'أحمد علي' }],
        });
    });

    it('isGuarantorForfeited detects forfeiture marker in legacy info', () => {
        expect(
            isGuarantorForfeited({
                name: 'كفيل',
                isForfeited: true,
            }),
        ).toBe(true);
    });
});
