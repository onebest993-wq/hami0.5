import { describe, expect, it } from 'vitest';
import {
    ART172_STAY_CAUSE_LIFTED,
    ART172_VOID_EXTENDS_TO_PRESENT_NOTICE,
    OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE,
    OBJECTOR_UPHOLD_ORIGINAL_APPEAL_NOTICE,
    classifyAbsentObjectionOutcome,
    objectorMayFileOriginalAppeal,
    plaintiffMustFileNewOriginalAppeal,
    resolveObjectionAppealNotices,
    resolveObjectionResumeWarning,
} from '../objectionAppealConsequence';

describe('objectionAppealConsequence', () => {
    it('يصنّف منطوق الاعتراض وفق المصفوفة', () => {
        expect(classifyAbsentObjectionOutcome('تأييد الحكم الغيابي — بانتظار طعن المعترض')).toBe(
            'uphold',
        );
        expect(classifyAbsentObjectionOutcome('رد الاعتراض شكلاً — اكتسب الحكم الغيابي القطعية بحق المعترض')).toBe(
            'form_reject',
        );
        expect(classifyAbsentObjectionOutcome('تعديل الحكم الغيابي — يحق لموكلك الطعن')).toBe(
            'void_full',
        );
        expect(classifyAbsentObjectionOutcome('تعديل جزئي للحكم الغيابي — يحق للطرفين الطعن')).toBe(
            'partial',
        );
    });

    it('التأييد يفتح استئنافاً أصلياً للمعترض والإبطال يفرض عريضة جديدة للمدعي', () => {
        expect(objectorMayFileOriginalAppeal('uphold')).toBe(true);
        expect(objectorMayFileOriginalAppeal('form_reject')).toBe(false);
        expect(plaintiffMustFileNewOriginalAppeal('void_full')).toBe(true);
        expect(plaintiffMustFileNewOriginalAppeal('uphold')).toBe(false);
    });

    it('بعد حسم الاعتراض والاستئخار: زوال السبب + توجيه بحسب المركز', () => {
        expect(
            resolveObjectionAppealNotices({
                outcome: 'uphold',
                clientRole: 'objected',
                stayActive: true,
                objectionResolved: true,
                indivisible: true,
                clientIsPresentAppellant: false,
            }),
        ).toEqual([ART172_STAY_CAUSE_LIFTED]);

        expect(
            resolveObjectionAppealNotices({
                outcome: 'void_full',
                clientRole: 'objected',
                stayActive: true,
                objectionResolved: true,
                indivisible: true,
                clientIsPresentAppellant: false,
            }),
        ).toEqual([ART172_STAY_CAUSE_LIFTED, OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE]);

        expect(
            resolveObjectionAppealNotices({
                outcome: 'void_full',
                clientRole: null,
                stayActive: true,
                objectionResolved: true,
                indivisible: true,
                clientIsPresentAppellant: true,
            }),
        ).toEqual([ART172_STAY_CAUSE_LIFTED, ART172_VOID_EXTENDS_TO_PRESENT_NOTICE]);

        expect(
            resolveObjectionAppealNotices({
                outcome: 'uphold',
                clientRole: 'objector',
                stayActive: false,
                objectionResolved: true,
                indivisible: true,
                clientIsPresentAppellant: false,
            }),
        ).toEqual([OBJECTOR_UPHOLD_ORIGINAL_APPEAL_NOTICE]);
    });

    it('لا يكتفي المدعي بفك الاستئخار بعد إبطال الغيابي', () => {
        expect(
            resolveObjectionResumeWarning({
                outcome: 'void_full',
                clientRole: 'objected',
            }),
        ).toBe(OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE);
        expect(
            resolveObjectionResumeWarning({
                outcome: 'uphold',
                clientRole: 'objected',
            }),
        ).toBeNull();
    });
});
