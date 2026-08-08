import { describe, expect, it } from 'vitest';
import {
    buildCommunicationDisplayContext,
    buildNoResponseConfirmationDetails,
    extractDirectorate,
    hasResult,
    isAwaitingCommunicationResult,
    isCommunicationDecision,
    isCommunicationFollowupComplete,
    isFollowupDismissed,
    isNoResponseConfirmed,
} from '../communicationDecisionModel';

describe('communicationDecisionModel', () => {
    it('يتعرّف على قرارات المخاطبة', () => {
        expect(isCommunicationDecision({ title: 'إرسال كتاب / مخاطبة جهة — محكمة' })).toBe(true);
        expect(isCommunicationDecision({ title: 'مخاطبة جهة حكومية' })).toBe(true);
        expect(isCommunicationDecision({ title: 'حجز راتب' })).toBe(false);
    });

    it('يحسب اكتمال المتابعة والنتيجة', () => {
        expect(hasResult({ deputationClosed: true })).toBe(true);
        expect(hasResult({ deputationResultDetails: 'تم' })).toBe(true);
        expect(isFollowupDismissed({ deputationFollowupDismissed: true })).toBe(true);
        expect(isNoResponseConfirmed({ deputationNoResponseConfirmed: true })).toBe(true);
        expect(hasResult({ deputationNoResponseConfirmed: true, deputationClosed: true })).toBe(false);
        expect(
            isCommunicationFollowupComplete({ deputationFollowupDismissed: true }),
        ).toBe(true);
        expect(
            isCommunicationFollowupComplete({ deputationNoResponseConfirmed: true }),
        ).toBe(false);
    });

    it('يبني سياق العرض للموافق بانتظار النتيجة', () => {
        const ctx = buildCommunicationDisplayContext(
            {
                title: 'إرسال كتاب / مخاطبة جهة — مديرية التنفيذ',
                executorOutcome: 'approved',
                date: '2026-07-01',
            },
            [{ id: 'x', executorOutcome: 'approved' }],
        );
        expect(ctx.directorate).toContain('مديرية');
        expect(ctx.statusLabel).toBe('بانتظار النتيجة');
        expect(ctx.statusTone).toBe('warning');
        expect(ctx.referenceTitle).toBe('مرجع الإجابة');
    });

    it('يصيغ نص تأكيد عدم ورود الإجابة مع تاريخ الكتاب السابق', () => {
        expect(
            buildNoResponseConfirmationDetails({
                previousLetterDate: '2026-07-01',
                confirmationDate: '2026-07-15',
            }),
        ).toBe(
            'تم التأكيد على الكتاب السابق المؤرّخ في 2026-07-01 — عدم ورود إجابة من الجهة المخاطبة.\nتاريخ كتاب التأكيد: 2026-07-15',
        );
    });

    it('يعرض تأكيد عدم الإجابة مع تاريخ التأكيد في السجل', () => {
        const ctx = buildCommunicationDisplayContext(
            {
                title: 'إرسال كتاب / مخاطبة جهة — محكمة',
                executorOutcome: 'approved',
                date: '2026-07-01',
                deputationNoResponseConfirmed: true,
                deputationClosed: true,
                deputationReferralDate: '2026-07-15',
                deputationResultDetails: buildNoResponseConfirmationDetails({
                    previousLetterDate: '2026-07-01',
                    confirmationDate: '2026-07-15',
                }),
            },
            [{ id: 'x', executorOutcome: 'approved' }],
        );
        expect(ctx.statusLabel).toBe('عدم ورود إجابة');
        expect(ctx.referenceTitle).toBe('تاريخ كتاب التأكيد');
        expect(ctx.referenceLabel).toBe('2026-07-15');
        expect(ctx.outcomeBody).toContain('تم التأكيد على الكتاب السابق المؤرّخ في 2026-07-01');
        expect(ctx.outcomeBody).not.toContain('تم التأكيد — عدم ورود');
    });

    it('يستخرج اسم الجهة من العنوان', () => {
        expect(extractDirectorate('إرسال كتاب / مخاطبة جهة — محكمة البداءة')).toBe(
            'محكمة البداءة',
        );
    });

    it('يحدّد انتظار النتيجة للمخاطبات دون اشتراط موافقة المنفذ', () => {
        const decision = {
            title: 'إرسال كتاب / مخاطبة جهة — جهة',
            executorOutcome: 'pending',
            id: 'd1',
        };
        expect(isAwaitingCommunicationResult(decision, [decision as any])).toBe(true);
    });

    it('لا ينتظر نتيجة مخاطبة مرفوضة أو مكتملة', () => {
        expect(
            isAwaitingCommunicationResult(
                {
                    title: 'إرسال كتاب / مخاطبة جهة — جهة',
                    executorOutcome: 'rejected',
                    executorRejectedFinal: true,
                    id: 'd2',
                },
                [],
            ),
        ).toBe(false);
        expect(
            isAwaitingCommunicationResult(
                {
                    title: 'إرسال كتاب / مخاطبة جهة — جهة',
                    executorOutcome: 'approved',
                    deputationClosed: true,
                    deputationResultDetails: 'تم',
                    id: 'd3',
                },
                [],
            ),
        ).toBe(false);
        expect(
            isAwaitingCommunicationResult(
                {
                    title: 'إرسال كتاب / مخاطبة جهة — جهة',
                    executorOutcome: 'approved',
                    deputationNoResponseConfirmed: true,
                    deputationResultDetails: buildNoResponseConfirmationDetails({
                        previousLetterDate: '2026-07-01',
                        confirmationDate: '2026-07-15',
                    }),
                    id: 'd4',
                },
                [],
            ),
        ).toBe(true);
    });

    it('يعرض مضمون الكتاب والإجابة ومسار الأحداث في السجل المكتمل', () => {
        const decision = {
            title: 'إرسال كتاب / مخاطبة جهة — محكمة',
            executorOutcome: 'approved',
            date: '2026-08-05',
            body: 'بتاريخ 2026-08-05:\n\nنص الكتاب الأصلي',
            deputationClosed: true,
            deputationResultDetails: 'نص الإجابة الواردة',
            deputationReferralDate: '2026-08-05 123',
            id: 'd-complete',
        };
        const ctx = buildCommunicationDisplayContext(decision, [decision as any], [
            {
                date: '2026-08-05',
                title: 'مخاطبة: محكمة',
                description: 'طلب مخاطبة جهة',
                metadata: {
                    timelineThreadKey: 'executor_decision:d-complete',
                    decisionRowId: 'd-complete',
                },
            },
            {
                date: '2026-08-06',
                title: 'نتيجة مخاطبة — محكمة',
                description: 'مرجع: 2026-08-05 123\nنص الإجابة الواردة',
                metadata: {
                    timelineThreadKey: 'executor_decision:d-complete',
                    decisionRowId: 'd-complete',
                },
            },
        ]);
        expect(ctx.letterBody).toBe('نص الكتاب الأصلي');
        expect(ctx.responseBody).toBe('نص الإجابة الواردة');
        expect(ctx.responseReference).toBe('2026-08-05 123');
        expect(ctx.eventTrail.length).toBeGreaterThanOrEqual(2);
        expect(ctx.eventTrail.some((e) => e.label.includes('مخاطبة'))).toBe(true);
        expect(ctx.eventTrail.some((e) => e.label.includes('نتيجة'))).toBe(true);
    });

    it('لا يعتمد على نوع المطالبة — يعمل لكل أقسام التنفيذ', () => {
        const claimModules = [
            'financial_debt',
            'custody_removal',
            'eviction',
            'specific_delivery',
            'encroachment_removal',
        ];
        for (const moduleTag of claimModules) {
            const decision = {
                title: 'إرسال كتاب / مخاطبة جهة — جهة عامة',
                executorOutcome: 'approved',
                date: '2026-08-01',
                claimModule: moduleTag,
                requestKind: 'special_followup',
                id: `d-${moduleTag}`,
            };
            expect(isCommunicationDecision(decision)).toBe(true);
            const ctx = buildCommunicationDisplayContext(decision, [decision as any]);
            expect(ctx.letterDate).toBe('2026-08-01');
            expect(ctx.statusLabel).toBe('بانتظار النتيجة');
            expect(isAwaitingCommunicationResult(decision, [decision as any])).toBe(true);
        }
    });
});
