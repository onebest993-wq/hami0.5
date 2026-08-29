import { describe, expect, it } from 'vitest';
import {
    deriveAbsentObjectionCaseNumber,
    resolveAppealStageCaseNumber,
    shouldDeriveAbsentObjectionCaseNumber,
} from '../absentObjectionCaseNumber';

describe('absentObjectionCaseNumber', () => {
    it('inserts اعتراضية before the year on the standard رقم/حرف/سنة form', () => {
        expect(deriveAbsentObjectionCaseNumber('111/ب/2026')).toBe('111/ب/اعتراضية/2026');
        expect(deriveAbsentObjectionCaseNumber(' 15 / ب / 2026 ')).toBe('15/ب/اعتراضية/2026');
        expect(deriveAbsentObjectionCaseNumber('١١١/ب/٢٠٢٦')).toBe('١١١/ب/اعتراضية/٢٠٢٦');
    });

    it('inserts before the year when the letter segment is missing', () => {
        expect(deriveAbsentObjectionCaseNumber('111/2026')).toBe('111/اعتراضية/2026');
    });

    it('does not duplicate اعتراضية', () => {
        expect(deriveAbsentObjectionCaseNumber('111/ب/اعتراضية/2026')).toBe('111/ب/اعتراضية/2026');
    });

    it('returns empty when the source number is missing', () => {
        expect(deriveAbsentObjectionCaseNumber('')).toBe('');
        expect(deriveAbsentObjectionCaseNumber(null)).toBe('');
    });

    it('derives only for absent-judgment objection, not اعتراض الغير', () => {
        expect(shouldDeriveAbsentObjectionCaseNumber('اعتراض على الحكم الغيابي')).toBe(true);
        expect(shouldDeriveAbsentObjectionCaseNumber('اعتراض غيابي')).toBe(true);
        expect(shouldDeriveAbsentObjectionCaseNumber('اعتراض الغير')).toBe(false);
        expect(shouldDeriveAbsentObjectionCaseNumber('استئناف')).toBe(false);
    });

    it('keeps a typed number and leaves empty when not entered', () => {
        expect(
            resolveAppealStageCaseNumber('اعتراض على الحكم الغيابي', '99/ب/اعتراضية/2026', '111/ب/2026'),
        ).toBe('99/ب/اعتراضية/2026');
        expect(resolveAppealStageCaseNumber('اعتراض على الحكم الغيابي', '  ', '111/ب/2026')).toBe('');
        expect(resolveAppealStageCaseNumber('استئناف', '', '111/ب/2026')).toBe('');
    });
});
