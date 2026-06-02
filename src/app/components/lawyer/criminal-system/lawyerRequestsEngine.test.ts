import { describe, expect, it } from 'vitest';
import { DETENTION_DECISION_TEMPLATE } from './proceduralRequestTypes';
import {
    canAddLawyerRequestFollowUpMargin,
    canEditLawyerRequestAttachments,
    stripLawyerRequestDecisionPatch,
    validateCreateLawyerRequestInput,
    validateFinalizeLawyerRequestInput,
} from './lawyerRequestsEngine';

describe('lawyerRequestsEngine', () => {
    it('validates create input', () => {
        expect(
            validateCreateLawyerRequestInput({
                requestDate: '',
                proceduralTemplate: 'طلب',
                lawyerNote: 'نص',
            }),
        ).toMatch(/تاريخ/);
        expect(
            validateCreateLawyerRequestInput({
                requestDate: '2026-05-01',
                proceduralTemplate: 'طلب إخلاء سبيل بكفالة / بتعهد',
                lawyerNote: 'تفاصيل',
            }),
        ).toBeNull();
    });

    it('requires detention start and end for unified detention decision', () => {
        expect(
            validateCreateLawyerRequestInput({
                requestDate: '2026-05-01',
                proceduralTemplate: DETENTION_DECISION_TEMPLATE,
                lawyerNote: 'توقيف',
                detentionEndDate: '2026-05-20',
            }),
        ).toMatch(/بدء/);
        expect(
            validateCreateLawyerRequestInput({
                requestDate: '2026-05-01',
                proceduralTemplate: DETENTION_DECISION_TEMPLATE,
                lawyerNote: 'توقيف',
                detentionStartDate: '2026-05-25',
                detentionEndDate: '2026-05-20',
            }),
        ).toMatch(/الانتهاء/);
        expect(
            validateCreateLawyerRequestInput({
                requestDate: '2026-05-01',
                proceduralTemplate: DETENTION_DECISION_TEMPLATE,
                lawyerNote: 'توقيف',
                detentionStartDate: '2026-05-01',
                detentionEndDate: '2026-05-20',
            }),
        ).toBeNull();
    });

    it('requires referred court name for complaint court referral', () => {
        expect(
            validateCreateLawyerRequestInput({
                requestDate: '2026-05-01',
                proceduralTemplate: 'إحالة الشكوى إلى محكمة أخرى',
                lawyerNote: 'إحالة',
            }),
        ).toMatch(/المحكمة الجديدة/);
        expect(
            validateCreateLawyerRequestInput({
                requestDate: '2026-05-01',
                proceduralTemplate: 'إحالة الشكوى إلى محكمة أخرى',
                lawyerNote: 'إحالة',
                referredCourtName: 'محكمة الكرخ',
            }),
        ).toBeNull();
    });

    it('validates finalize input', () => {
        expect(
            validateFinalizeLawyerRequestInput({
                status: 'approved',
                judgeMargin: '',
                decisionDate: '2026-06-01',
            }),
        ).toMatch(/هامش/);
        expect(
            validateFinalizeLawyerRequestInput({
                status: 'rejected',
                judgeMargin: 'رفض',
                decisionDate: '2026-06-01',
            }),
        ).toBeNull();
        expect(
            validateFinalizeLawyerRequestInput(
                { status: 'approved', judgeMargin: 'موافقة', decisionDate: '2026-05-01' },
                '2026-05-10',
            ),
        ).toMatch(/سابق/);
    });

    it('gates follow-up margins and attachments by lock state', () => {
        expect(
            canAddLawyerRequestFollowUpMargin({ status: 'pending', isLocked: false }),
        ).toBe(true);
        expect(
            canAddLawyerRequestFollowUpMargin({ status: 'approved', isLocked: true }),
        ).toBe(false);
        expect(canEditLawyerRequestAttachments({ status: 'pending', isLocked: false })).toBe(true);
        expect(canEditLawyerRequestAttachments({ status: 'executed', isLocked: true })).toBe(false);
        expect(
            canEditLawyerRequestAttachments({ status: 'approved', isLocked: false }),
        ).toBe(false);
        expect(
            canAddLawyerRequestFollowUpMargin({ status: 'rejected', isLocked: false }),
        ).toBe(false);
    });

    it('strips final decision fields and lock flags from patch', () => {
        const stripped = stripLawyerRequestDecisionPatch({
            lawyerNote: 'تعديل',
            status: 'approved',
            judgeMargin: 'x',
            isLocked: true,
        });
        expect(stripped.lawyerNote).toBe('تعديل');
        expect(stripped.status).toBeUndefined();
        expect(stripped.judgeMargin).toBeUndefined();
        expect(stripped.isLocked).toBeUndefined();
    });

    it('keeps draft margin on pending patch', () => {
        const stripped = stripLawyerRequestDecisionPatch({
            status: 'pending',
            judgeMargin: 'مسودة',
            decisionDate: '2026-06-02',
        });
        expect(stripped.status).toBe('pending');
        expect(stripped.judgeMargin).toBe('مسودة');
        expect(stripped.decisionDate).toBe('2026-06-02');
    });
});
