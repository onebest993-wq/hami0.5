import { describe, expect, it } from 'vitest';
import {
    analyzeExecutionCreationAlimony,
    buildAlimonyCreationSparkNudges,
} from '@/app/spark/procedural/alimonyCreationSparkBridge';
import { buildExecutionCreationSparkContext } from '@/app/spark/context/executionCreationSparkContext';

const baseAlimonyDraft = {
    beneficiary: 'زوجة فقط' as const,
    lawsuitDate: '2026-08-05',
    executionDate: '2026-02-05',
    wifeMonthly: '300000',
    childrenMonthly: '',
    childrenCount: '1',
    includesPastCalc: false,
    pastStartDate: '',
    judgmentDate: '',
    submissionDate: '',
    calculated: null,
};

describe('alimonyCreationSparkBridge', () => {
    it('يُنتج تحليلاً وطابور تنبيهات من مسودة الإنشاء', () => {
        const ctx = buildExecutionCreationSparkContext({
            directorate: 'بغداد',
            fileNumber: '99',
            docType: 'حكم',
            docNumber: '',
            judgmentDate: '',
            classification: 'أحوال شخصية',
            claimType: 'نفقة',
            activeClaimTypes: ['نفقة'],
            claimAmountsByType: {},
            totalAmount: '',
            debtors: [{ name: 'مدين', address: 'بغداد', isClient: false }],
            creditors: [{ name: 'موكل', address: '', isClient: true }],
            isDocumentBlocked: false,
            submissionDate: '2026-08-05',
            alimony: baseAlimonyDraft,
        });

        const analysis = analyzeExecutionCreationAlimony(ctx);
        expect(analysis).not.toBeNull();
        expect(analysis!.coherenceScore).toBe(0);

        const nudges = buildAlimonyCreationSparkNudges(ctx, analysis!);
        expect(nudges.some((n) => n.kind === 'execution.creation_alimony_timeline')).toBe(true);
        expect(nudges.some((n) => n.action?.actionId === 'focus_alimony' || n.action?.actionId === 'apply_alimony_execution_today')).toBe(true);
    });

    it('يستخدم مخرجات محرك الحاسبة في التحليل', () => {
        const ctx = buildExecutionCreationSparkContext({
            directorate: 'بغداد',
            fileNumber: '100',
            docType: 'حكم',
            docNumber: '2/2026',
            judgmentDate: '2025-06-01',
            classification: 'أحوال شخصية',
            claimType: 'نفقة',
            activeClaimTypes: ['نفقة'],
            claimAmountsByType: { نفقة: '5000000' },
            totalAmount: '',
            debtors: [{ name: 'مدين', address: 'بغداد', isClient: false }],
            creditors: [{ name: 'موكل', address: '', isClient: true }],
            isDocumentBlocked: false,
            submissionDate: '2026-08-05',
            alimony: {
                ...baseAlimonyDraft,
                lawsuitDate: '2025-01-01',
                executionDate: '2026-01-01',
                calculated: {
                    baseAccumulation: 3_600_000,
                    pastAccumulation: 0,
                    monthlyOngoing: 300_000,
                    totalAccumulated: 3_600_000,
                    legalCapApplied: false,
                    pastYearCapApplied: false,
                    explanation: 'حساب اختباري',
                },
            },
        });

        const analysis = analyzeExecutionCreationAlimony(ctx);
        expect(analysis!.projectedAccumulatedIqd).toBeGreaterThan(0);
        expect(
            analysis!.findings.some((f) => f.id === 'cross:claim-amount-mismatch') ||
                analysis!.inferences.some((i) => i.id === 'inf:engine-refined'),
        ).toBe(true);
    });
});
