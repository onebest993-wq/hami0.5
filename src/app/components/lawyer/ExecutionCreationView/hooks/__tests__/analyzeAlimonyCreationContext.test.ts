import { describe, expect, it } from 'vitest';
import { analyzeAlimonyCreationContext } from '../analyzeAlimonyCreationContext';

describe('analyzeAlimonyCreationContext', () => {
    it('يكتشف تعارض التواريخ ويشرح السبب لا يوجّه فقط', () => {
        const analysis = analyzeAlimonyCreationContext({
            alimonyBeneficiary: 'زوجة فقط',
            alimonyLawsuitDate: '2026-08-05',
            alimonyExecutionDate: '2026-02-05',
            alimonyWifeMonthly: '300000',
            alimonyChildrenMonthly: '',
            alimonyChildrenCount: '1',
            calculatedAlimonyNew: null,
            claimType: 'نفقة',
            activeClaimTypes: ['نفقة'],
            todayYmd: '2026-08-05',
        });

        expect(analysis.findings.some((f) => f.severity === 'critical')).toBe(true);
        expect(analysis.coherenceScore).toBe(0);
        expect(analysis.synthesis).toContain('تعارض');
        expect(analysis.recommendations.length).toBeGreaterThan(0);
        expect(analysis.recommendations[0].rationale.length).toBeGreaterThan(10);
    });

    it('يربط تاريخ الحكم بإقامة الدعوى عند الاختلاف', () => {
        const analysis = analyzeAlimonyCreationContext({
            alimonyBeneficiary: 'زوجة وأولاد',
            alimonyLawsuitDate: '2024-01-15',
            alimonyExecutionDate: '2026-08-05',
            alimonyWifeMonthly: '200000',
            alimonyChildrenMonthly: '100000',
            alimonyChildrenCount: '2',
            calculatedAlimonyNew: null,
            judgmentDate: '2025-06-01',
            docType: 'قرارات وأحكام المحاكم',
            claimType: 'نفقة',
            activeClaimTypes: ['نفقة'],
            todayYmd: '2026-08-05',
        });

        expect(analysis.findings.some((f) => f.id === 'cross:judgment-lawsuit')).toBe(true);
        expect(analysis.inferences.some((i) => i.id === 'inf:judgment-lawsuit')).toBe(true);
    });

    it('يميّز المسار المزدوج نفقة + نفقة ماضية', () => {
        const analysis = analyzeAlimonyCreationContext({
            alimonyBeneficiary: 'زوجة فقط',
            alimonyLawsuitDate: '2025-01-01',
            alimonyExecutionDate: '2026-01-01',
            alimonyWifeMonthly: '250000',
            alimonyChildrenMonthly: '',
            alimonyChildrenCount: '1',
            calculatedAlimonyNew: null,
            includesPastCalc: true,
            alimonyPastStartDate: '2023-06-01',
            claimType: 'نفقة',
            activeClaimTypes: ['نفقة', 'نفقة ماضية'],
            todayYmd: '2026-08-05',
        });

        expect(analysis.inferences.some((i) => i.id === 'inf:dual-track')).toBe(true);
    });
});
