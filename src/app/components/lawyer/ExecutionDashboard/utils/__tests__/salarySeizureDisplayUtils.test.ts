import { describe, expect, it } from 'vitest';
import {
    buildSalarySeizureDescriptionText,
    formatSalaryAmountDisplay,
    resolveSalarySeizureSubject,
} from '../salarySeizureDisplayUtils';

describe('salarySeizureDisplayUtils', () => {
    it('formats salary with thousand separators', () => {
        expect(formatSalaryAmountDisplay('78787887')).toContain('٬');
        expect(formatSalaryAmountDisplay('1234567').length).toBeGreaterThan(6);
    });

    it('builds description with subject and salary label', () => {
        const text = buildSalarySeizureDescriptionText({
            subject: { roleLabel: 'المدين', personName: 'أحمد علي' },
            employerName: 'وزارة المالية',
            salaryAmount: '500000',
            monthlyDeductionIqd: 100000,
        });
        expect(text).toContain('محل الحجز: المدين');
        expect(text).toContain('الاسم: أحمد علي');
        expect(text).toContain('جهة العمل: وزارة المالية');
        expect(text).toContain('مقدار الراتب:');
        expect(text).toContain('د.ع');
        expect(text).not.toContain('الدخل الشهري');
    });

    it('resolves guarantor from followup data', () => {
        const subject = resolveSalarySeizureSubject(
            {
                details: { seizureTarget: 'guarantor' },
            },
            {
                guarantor_followup: { guarantor_name: 'سامي الكفيل' },
            } as any,
            'ex-1'
        );
        expect(subject.roleLabel).toBe('الكفيل الضامن');
        expect(subject.personName).toBe('سامي الكفيل');
    });
});
