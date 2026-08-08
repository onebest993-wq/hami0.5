import { describe, expect, it } from 'vitest';
import {
    buildCalendarShellReviewPayload,
    buildExecutionCreationShellReviewPayload,
    buildLawsuitShellReviewPayload,
} from '@/app/spark/shell/shellReviewPayloadBuilders';
import { buildExecutionCreationSparkContext } from '@/app/spark/context/executionCreationSparkContext';
import type { LawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';
import type { CalendarSparkContext } from '@/app/spark/context/calendarSparkContext';

describe('shellReviewPayloadBuilders', () => {
    it('يبني حمولة مراجعة من السجل الزمني للدعوى', () => {
        const ctx = {
            dossierKey: 'lawsuit:10/2026',
            fileId: 'f1',
            jurisdiction: 'civil',
            representedParty: 'المدعي',
            status: 'نشطة',
            isPaused: false,
            pauseReason: '',
            displayStage: {
                id: 's1',
                name: 'البداءة',
                stageName: 'مرحلة البداءة',
                courtName: 'محكمة البداءة',
            },
            stages: [],
            timeline: [
                {
                    id: 't1',
                    type: 'document',
                    title: 'مذكرة',
                    notes: 'تم تقديم المذكرة الجوابية للمحكمة',
                    date: '2026-08-01',
                },
            ],
        } as unknown as LawsuitSparkContext;

        const payload = buildLawsuitShellReviewPayload(ctx);
        expect(payload?.fieldType).toBe('note');
        expect(payload?.text).toContain('مذكرة');
        expect(payload?.court).toBe('محكمة البداءة');
    });

    it('يبني حمولة مراجعة من مواعيد التقويم القريبة', () => {
        const ctx: CalendarSparkContext = {
            dossierKey: 'calendar:ev-1',
            nowMs: Date.parse('2026-08-05T10:00:00'),
            upcoming: [
                {
                    eventId: 'ev-1',
                    title: 'جلسة مرافعة',
                    date: '2026-08-06',
                    time: '11:00',
                    type: 'hearing',
                    source: 'hearing',
                    isBridged: false,
                    startsAtMs: Date.parse('2026-08-06T11:00:00'),
                    hoursUntil: 25,
                },
            ],
            conflictDays: [],
            allEvents: [],
        };

        const payload = buildCalendarShellReviewPayload(ctx);
        expect(payload?.text).toContain('جلسة مرافعة');
    });

    it('يبني حمولة مراجعة من مسودة إنشاء التنفيذ مع تحليل النفقة', () => {
        const ctx = buildExecutionCreationSparkContext({
            directorate: 'بغداد',
            fileNumber: '2026/1',
            docType: 'حكم',
            docNumber: '10',
            judgmentDate: '2025-12-01',
            classification: 'أحوال شخصية',
            claimType: 'نفقة',
            activeClaimTypes: ['نفقة'],
            claimAmountsByType: {},
            totalAmount: '1000000',
            debtors: [{ name: 'مدين', address: 'الكرادة', isClient: false }],
            creditors: [{ name: 'موكل', address: '', isClient: true }],
            isDocumentBlocked: false,
            submissionDate: '2026-08-05',
            alimony: {
                beneficiary: 'زوجة فقط',
                lawsuitDate: '2025-06-01',
                executionDate: '2026-08-05',
                wifeMonthly: '250000',
                childrenMonthly: '',
                childrenCount: '1',
                includesPastCalc: false,
                pastStartDate: '',
                judgmentDate: '2025-12-01',
                submissionDate: '',
                calculated: {
                    baseAccumulation: 1_000_000,
                    pastAccumulation: 0,
                    monthlyOngoing: 250_000,
                    totalAccumulated: 1_000_000,
                    legalCapApplied: false,
                    pastYearCapApplied: false,
                    explanation: 'اختبار',
                },
            },
        });

        const payload = buildExecutionCreationShellReviewPayload(ctx);
        expect(payload?.fieldType).toBe('note');
        expect(payload?.text).toContain('تحليل التماسك');
        expect(payload?.text).toContain('تماسك السياق');
        expect(payload?.caseNo).toBe('2026/1');
    });
});
