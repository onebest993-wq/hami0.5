import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { persistSavedLawsuitType, readSavedLawsuitTypes } from '../savedLawsuitTypes';
import {
    computeNewCaseProgressiveReveal,
    INITIAL_NEW_CASE_UNLOCK,
    LOCKED_NEW_CASE_UNLOCK,
} from '../newCaseProgressiveReveal';

describe('savedLawsuitTypes', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    afterEach(() => {
        localStorage.clear();
    });

    it('يحفظ النوع في رأس القائمة بلا تكرار', () => {
        persistSavedLawsuitType('  كمبيالة  ');
        persistSavedLawsuitType('تخلي');
        persistSavedLawsuitType('كمبيالة');
        expect(readSavedLawsuitTypes()).toEqual(['كمبيالة', 'تخلي']);
    });
});

describe('computeNewCaseProgressiveReveal', () => {
    it('لا يظهر الحقل التالي إلا بعد تأكيد الخطوة', () => {
        expect(
            computeNewCaseProgressiveReveal({
                lockParentFields: false,
                unlock: INITIAL_NEW_CASE_UNLOCK,
            }).showType,
        ).toBe(false);
        expect(
            computeNewCaseProgressiveReveal({
                lockParentFields: false,
                unlock: { ...INITIAL_NEW_CASE_UNLOCK, type: true },
            }).showType,
        ).toBe(true);
        expect(
            computeNewCaseProgressiveReveal({
                lockParentFields: false,
                unlock: { ...INITIAL_NEW_CASE_UNLOCK, type: true },
            }).showValue,
        ).toBe(false);
        expect(
            computeNewCaseProgressiveReveal({
                lockParentFields: false,
                unlock: { ...INITIAL_NEW_CASE_UNLOCK, type: true, value: true },
            }).showValue,
        ).toBe(true);
        expect(
            computeNewCaseProgressiveReveal({
                lockParentFields: false,
                unlock: { ...INITIAL_NEW_CASE_UNLOCK, type: true, value: true, stage: true },
            }).showStage,
        ).toBe(true);
    });

    it('يظهر الأطراف بعد تأكيد التاريخ لا أثناء الكتابة', () => {
        const untilDate = {
            ...INITIAL_NEW_CASE_UNLOCK,
            type: true,
            value: true,
            stage: true,
            court: true,
            judgeDate: true,
        };
        expect(
            computeNewCaseProgressiveReveal({
                lockParentFields: false,
                unlock: untilDate,
            }).showParties,
        ).toBe(false);
        expect(
            computeNewCaseProgressiveReveal({
                lockParentFields: false,
                unlock: { ...untilDate, parties: true },
            }).showParties,
        ).toBe(true);
        expect(
            computeNewCaseProgressiveReveal({
                lockParentFields: true,
                unlock: INITIAL_NEW_CASE_UNLOCK,
            }).showParties,
        ).toBe(true);
        expect(LOCKED_NEW_CASE_UNLOCK.parties).toBe(true);
    });
});
