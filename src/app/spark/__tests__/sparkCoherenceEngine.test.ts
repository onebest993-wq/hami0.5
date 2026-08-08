import { describe, expect, it } from 'vitest';
import { runSparkCoherenceEngine } from '@/app/spark/coherence/sparkCoherenceEngine';
import type { SparkCoherenceContextBundle } from '@/app/spark/coherence/types';
import { runSparkCoherenceForExecutionCreation } from '@/app/spark/coherence/runSparkCoherenceForExecutionCreation';
import { buildExecutionCreationSparkContext } from '@/app/spark/context/executionCreationSparkContext';

const baseBundle: SparkCoherenceContextBundle = {
    surface: 'execution',
    dossierKey: 'test',
    facts: [],
    events: [],
    claims: [],
    dates: [
        { id: 'f', label: 'إقامة', ymd: '2026-08-05', role: 'filing', source: 't' },
        { id: 'e', label: 'احتساب', ymd: '2026-02-05', role: 'execution', source: 't' },
    ],
    texts: [],
    actions: [],
};

describe('sparkCoherenceEngine', () => {
    it('يكتشف تناقض ترتيب زمني عاماً — ليس مخصصاً لنفقة فقط', () => {
        const report = runSparkCoherenceEngine(baseBundle);
        expect(report.findings.some((f) => f.category === 'timeline')).toBe(true);
        expect(report.coherenceScore).toBeLessThan(50);
    });

    it('يكتشف تعارض حقائق لنفس المفتاح', () => {
        const report = runSparkCoherenceEngine({
            ...baseBundle,
            dates: [],
            facts: [
                { id: '1', key: 'amount', value: 100, source: 'form' },
                { id: '2', key: 'amount', value: 200, source: 'engine' },
            ],
        });
        expect(report.findings.some((f) => f.id.startsWith('fact:conflict'))).toBe(true);
    });

    it('يكتشف تواريخ في نص غير مسجّلة', () => {
        const report = runSparkCoherenceEngine({
            ...baseBundle,
            dates: [{ id: 'j', label: 'حكم', ymd: '2025-01-01', role: 'judgment', source: 't' }],
            registeredDates: ['2025-01-01'],
            texts: [
                {
                    id: 'note1',
                    role: 'ملاحظة',
                    content: 'تم التبليغ بتاريخ 2025-06-15 وفق المحضر',
                    source: 'note',
                },
            ],
        });
        expect(report.findings.some((f) => f.category === 'text')).toBe(true);
    });

    it('يدمج قواعد عامة + نطاق إنشاء التنفيذ', () => {
        const ctx = buildExecutionCreationSparkContext({
            directorate: 'بغداد',
            fileNumber: '9',
            docType: 'حكم',
            docNumber: '',
            judgmentDate: '',
            classification: 'مدني',
            claimType: 'نفقة',
            activeClaimTypes: ['نفقة'],
            claimAmountsByType: {},
            totalAmount: '',
            debtors: [{ name: 'م', address: 'ب', isClient: false }],
            creditors: [{ name: 'م', address: '', isClient: true }],
            isDocumentBlocked: false,
            submissionDate: '2026-08-05',
            alimony: {
                beneficiary: 'زوجة فقط',
                lawsuitDate: '2026-08-05',
                executionDate: '2026-02-05',
                wifeMonthly: '300000',
                childrenMonthly: '',
                childrenCount: '1',
                includesPastCalc: false,
                pastStartDate: '',
                judgmentDate: '',
                submissionDate: '2026-08-05',
                calculated: null,
            },
        });
        const report = runSparkCoherenceForExecutionCreation(ctx);
        expect(report.findings.length).toBeGreaterThan(1);
        expect(report.coherenceScore).toBeLessThan(30);
    });
});
