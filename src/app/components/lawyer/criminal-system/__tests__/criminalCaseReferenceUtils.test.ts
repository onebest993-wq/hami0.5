import { describe, expect, it } from 'vitest';
import {
    isInternalCaseIdentifier,
    looksLikeRealCaseReference,
    resolveOfficialCaseNumber,
    sanitizeCaseReferenceField,
} from '../criminalCaseReferenceUtils';

describe('criminalCaseReferenceUtils', () => {
    it('isInternalCaseIdentifier detects uuid-like ids', () => {
        expect(isInternalCaseIdentifier('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        expect(isInternalCaseIdentifier('123/2024')).toBe(false);
    });

    it('looksLikeRealCaseReference rejects internal ids and junk text', () => {
        expect(looksLikeRealCaseReference('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
        expect(looksLikeRealCaseReference('ىرلاىرلاى')).toBe(false);
        expect(looksLikeRealCaseReference('123/2024')).toBe(true);
    });

    it('resolveOfficialCaseNumber prefers real case number', () => {
        expect(
            resolveOfficialCaseNumber({
                location: { caseNumber: '123/2024', baseRegisterNumberAndDate: 'reg' },
            }),
        ).toBe('123/2024');
    });

    it('sanitizeCaseReferenceField clears junk', () => {
        expect(sanitizeCaseReferenceField('ىرلاىرلاى')).toBe('');
        expect(sanitizeCaseReferenceField('456/2025')).toBe('456/2025');
    });
});
