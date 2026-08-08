import { describe, expect, it } from 'vitest';
import {
    analyzeExecutionCreationIntelligence,
    buildExecutionCreationIntelNudges,
} from '@/app/spark/procedural/executionCreationIntelligence';
import { buildExecutionCreationSparkContext } from '@/app/spark/context/executionCreationSparkContext';

const baseCtx = buildExecutionCreationSparkContext({
    directorate: 'بغداد',
    fileNumber: '1',
    docType: 'قرارات وأحكام المحاكم',
    docNumber: '',
    judgmentDate: '',
    classification: 'مدني',
    claimType: 'نفقة',
    activeClaimTypes: ['نفقة'],
    claimAmountsByType: {},
    totalAmount: '',
    debtors: [{ name: 'مدين', address: 'بغداد', isClient: false }],
    creditors: [{ name: 'موكل', address: '', isClient: true }],
    isDocumentBlocked: false,
    submissionDate: '2026-08-05',
    alimony: {
        beneficiary: 'زوجة فقط',
        lawsuitDate: '2025-01-01',
        executionDate: '2026-08-05',
        wifeMonthly: '200000',
        childrenMonthly: '',
        childrenCount: '1',
        includesPastCalc: false,
        pastStartDate: '',
        judgmentDate: '',
        submissionDate: '2026-08-05',
        calculated: null,
    },
});

describe('executionCreationIntelligence', () => {
    it('يكتشف غياب تاريخ الحكم وتصنيف نفقة غير متوافق', () => {
        const findings = analyzeExecutionCreationIntelligence(baseCtx);
        expect(findings.some((f) => f.id === 'instrument:judgment-date-missing')).toBe(true);
        expect(findings.some((f) => f.id === 'claim:alimony-classification-mismatch')).toBe(true);
    });

    it('يُنتج تنبيهات سبارك مع إجراء تركيز', () => {
        const nudges = buildExecutionCreationIntelNudges(baseCtx);
        expect(nudges.some((n) => n.kind === 'execution.creation_context_insight')).toBe(true);
        expect(nudges.some((n) => n.action?.actionId === 'focus_judgment')).toBe(true);
    });
});
