import { describe, expect, it } from 'vitest';
import {
    computeStageOptions,
    getBlockedWordsError,
    getStageCourtMismatchErrors,
    getValuePlaceholder,
    getCaseNumberError,
    getExceptionWarning,
    isFixedFeeType,
} from '../validation';

describe('LawyerNewCase validation', () => {
    it('uses اعتراض الغير (not typo) for appeal courts', () => {
        const stages = computeStageOptions('محكمة استئناف بغداد');
        expect(stages).toContain('اعتراض الغير');
        expect(stages).not.toContain('اعتراض الير');
    });

    it('allows personal-status keywords when jurisdiction is personal', () => {
        expect(getBlockedWordsError('محكمة أحوال شخصية', 'دعوى طلاق', 'personal')).toEqual({});
        expect(getBlockedWordsError('', 'زواج شرعي', 'personal')).toEqual({});
    });

    it('blocks personal-status keywords in civil jurisdiction', () => {
        expect(getBlockedWordsError('محكمة أحوال', 'دعوى', 'civil')).toHaveProperty('court');
        expect(getBlockedWordsError('', 'طلاق شرعي', 'civil')).toHaveProperty('type');
    });

    it('flags court/stage mismatch', () => {
        expect(getStageCourtMismatchErrors('بداءة الكرخ', 'استئناف')).toHaveProperty('stage');
        expect(getStageCourtMismatchErrors('استئناف بغداد', 'بداءة بدرجة أولى')).toHaveProperty('court');
    });

    it('derives placeholder, case number, fixed fee, and exception warning', () => {
        expect(getValuePlaceholder('دعوى تخلي')).toContain('بدل الإيجار');
        expect(getCaseNumberError('15/ب/2026')).toBeNull();
        expect(getCaseNumberError('15/ب/2026/extra')).toContain('15/ب/2026');
        expect(isFixedFeeType('نزاع مرور')).toBe(true);
        expect(getExceptionWarning('500000', 'دعوى تعويض')).toContain('التمييزية');
        expect(getExceptionWarning('', 'دعوى تعويض')).toBeNull();
    });
});
