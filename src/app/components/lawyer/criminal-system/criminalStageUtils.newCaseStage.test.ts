import { describe, expect, it } from 'vitest';
import {
    isStageAllowedForNewCasePartyMix,
    resolveNewCaseStageSelectOptions,
} from './criminalStageUtils';

describe('resolveNewCaseStageSelectOptions', () => {
    it('shows only juvenile investigation and trial for juveniles_only', () => {
        const opts = resolveNewCaseStageSelectOptions('juveniles_only');
        expect(opts.map((o) => o.label)).toEqual(['تحقيق - أحداث', 'محكمة - أحداث']);
        expect(opts.map((o) => o.value)).toEqual(['تحقيق الأحداث', 'محكمة الأحداث']);
    });

    it('shows standard adult stages for mixed and adults_only', () => {
        const mixed = resolveNewCaseStageSelectOptions('mixed');
        expect(mixed.some((o) => o.value === 'تحقيق الأحداث')).toBe(false);
        expect(mixed.some((o) => o.value === 'محكمة الأحداث')).toBe(false);
        expect(mixed.some((o) => o.value === 'مرحلة التحقيق')).toBe(true);

        const adults = resolveNewCaseStageSelectOptions('adults_only');
        expect(adults.map((o) => o.value)).toContain('مرحلة التحقيق');
        expect(adults.map((o) => o.value)).not.toContain('تحقيق الأحداث');
    });

    it('validates stage against party mix', () => {
        expect(isStageAllowedForNewCasePartyMix('تحقيق الأحداث', 'juveniles_only')).toBe(true);
        expect(isStageAllowedForNewCasePartyMix('مرحلة التحقيق', 'juveniles_only')).toBe(false);
        expect(isStageAllowedForNewCasePartyMix('تحقيق الأحداث', 'mixed')).toBe(false);
        expect(isStageAllowedForNewCasePartyMix('مرحلة التحقيق', 'mixed')).toBe(true);
    });
});
