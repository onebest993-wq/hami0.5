import { describe, expect, it } from 'vitest';
import {
    appendJudgeDecisionLine,
    formatAttachmentDecisionLine,
    formatPetitionDecisionLine,
} from '../judgeDecisionComposer';

describe('judgeDecisionComposer', () => {
    it('formats petition and attachment lines', () => {
        expect(
            formatPetitionDecisionLine({
                requestType: 'منع سفر',
                subject: 'المدعى عليه',
                status: '⏳ قيد الانتظار',
            }),
        ).toBe('⚡ منع سفر: المدعى عليه — ⏳ قيد الانتظار');

        expect(formatAttachmentDecisionLine({ attachedProperty: 'عقار', status: 'فعّال' })).toBe(
            '🔒 عقار — فعّال',
        );
    });

    it('appends lines without duplication', () => {
        expect(appendJudgeDecisionLine('', 'تأجيل')).toBe('تأجيل');
        expect(appendJudgeDecisionLine('تأجيل', 'رفض')).toBe('تأجيل\nرفض');
        expect(appendJudgeDecisionLine('تأجيل', 'تأجيل')).toBe('تأجيل');
    });
});
