import { describe, expect, it } from 'vitest';
import {
    isLawsuitDefendantRecord,
    isLawsuitPlaintiffRecord,
    normalizeLawsuitPartyRoleLabel,
    partitionLawsuitPartiesByRole,
} from '../lawsuitPartyRole';
import { computeLawsuitStageOptions } from '../lawsuitStageOptions';

describe('lawsuitPartyRole', () => {
    it('يفصل المدعي عن المدعى عليه دون خلط صفة الطرف الثالث البسيطة', () => {
        const parties = [
            { id: 1, name: 'علي', role: 'المدعي' },
            { id: 2, name: 'حسن', role: 'المدعي' },
            { id: 3, name: 'محمد', role: 'المدعى عليه' },
        ];
        const { plaintiffs, defendants } = partitionLawsuitPartiesByRole(parties);
        expect(plaintiffs.map((p) => p.id)).toEqual([1, 2]);
        expect(defendants.map((p) => p.id)).toEqual([3]);
    });

    it('يقرأ status الإنجليزي وside كاحتياط', () => {
        expect(isLawsuitPlaintiffRecord({ status: 'plaintiff' })).toBe(true);
        expect(isLawsuitDefendantRecord({ status: 'defendant' })).toBe(true);
        expect(isLawsuitPlaintiffRecord({ side: 'right' })).toBe(true);
        expect(isLawsuitDefendantRecord({ side: 'left' })).toBe(true);
        expect(normalizeLawsuitPartyRoleLabel('creditor', 'المدعي')).toBe('المدعي');
        expect(normalizeLawsuitPartyRoleLabel('opponent', 'المدعى عليه')).toBe('المدعى عليه');
    });

    it('لا يخلط المستأنف عليه (المدعي) مع عمود المستأنف', () => {
        const appellee = { id: 1, name: 'أحمد', role: 'المستأنف عليه (المدعي)' };
        const appellant = { id: 2, name: 'حسن', role: 'المستأنف (المدعى عليه)' };
        expect(isLawsuitPlaintiffRecord(appellee)).toBe(false);
        expect(isLawsuitDefendantRecord(appellee)).toBe(true);
        expect(isLawsuitPlaintiffRecord(appellant)).toBe(true);
        expect(isLawsuitDefendantRecord(appellant)).toBe(false);

        const { plaintiffs, defendants } = partitionLawsuitPartiesByRole([appellee, appellant]);
        expect(plaintiffs.map((p) => p.id)).toEqual([2]);
        expect(defendants.map((p) => p.id)).toEqual([1]);
    });
});

describe('lawsuitStageOptions', () => {
    it('يربط محكمة البداءة والاستئناف بالمراحل الصحيحة', () => {
        expect(computeLawsuitStageOptions('بداءة الكرخ')).toContain('بداءة بدرجة أولى');
        expect(computeLawsuitStageOptions('بداءة الكرخ')).not.toContain('استئناف');
        expect(computeLawsuitStageOptions('استئناف بغداد')).toContain('استئناف');
        expect(computeLawsuitStageOptions('استئناف بغداد')).not.toContain('بداءة بدرجة أولى');
        expect(computeLawsuitStageOptions('محكمة عامة')).toContain('استئناف');
        expect(computeLawsuitStageOptions('محكمة عامة')).toContain('بداءة بدرجة أولى');
    });
});
