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
        expect(
            isCommunicationFollowupComplete({ deputationFollowupDismissed: true }),
        ).toBe(true);
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
        expect(ctx.statusLabel).toBe('موافق — بانتظار النتيجة');
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
        expect(ctx.statusLabel).toBe('موافق — عدم ورود إجابة');
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

    it('يحدّد انتظار النتيجة عند الموافقة دون إغلاق', () => {
        const decision = {
            title: 'إرسال كتاب / مخاطبة جهة — جهة',
            executorOutcome: 'approved',
            id: 'd1',
        };
        const awaiting = isAwaitingCommunicationResult(decision, [decision as any]);
        expect(typeof awaiting).toBe('boolean');
    });
});
