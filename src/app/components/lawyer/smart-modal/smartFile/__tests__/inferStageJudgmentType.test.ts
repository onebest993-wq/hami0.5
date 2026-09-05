import { describe, expect, it } from 'vitest';
import { inferJudgmentTypeFromStage } from '../inferStageJudgmentType';

describe('inferJudgmentTypeFromStage', () => {
    it('تعديل الحكم الغيابي بعد خسارة المعترض عليه = رد كلي', () => {
        expect(
            inferJudgmentTypeFromStage({
                finalDecision: 'تعديل الحكم الغيابي — يحق لموكلك الطعن',
                clientStageOutcome: 'LOSS',
            }),
        ).toBe('رد الدعوى كلياً');
    });

    it('تأييد الحكم الغيابي = إجابة', () => {
        expect(
            inferJudgmentTypeFromStage({
                finalDecision: 'تأييد الحكم الغيابي — بانتظار طعن المعترض',
                clientStageOutcome: 'WIN',
            }),
        ).toBe('إجابة الدعوى بالكامل');
    });

    it('رد الاعتراض شكلاً', () => {
        expect(
            inferJudgmentTypeFromStage({
                finalDecision: 'رد الاعتراض شكلاً — اكتسب الحكم الغيابي القطعية بحق المعترض',
            }),
        ).toBe('رد الاعتراض شكلاً');
    });

    it('لا يستنتج إجابة من شكل حضوري مخزَّن إذا النتيجة خسارة', () => {
        expect(
            inferJudgmentTypeFromStage({
                finalDecision: 'محسومة ضد الموكل - يحق لموكلك الطعن',
                clientStageOutcome: 'LOSS',
            }),
        ).toBe('رد الدعوى كلياً');
    });
});
