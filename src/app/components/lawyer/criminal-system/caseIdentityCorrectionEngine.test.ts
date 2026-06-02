import { describe, expect, it } from 'vitest';
import {
    caseIdentityCorrectionBlocked,
    validateDepositionCorrectionInput,
    validateIdentityCorrectionInput,
} from './caseIdentityCorrectionEngine';

describe('caseIdentityCorrectionEngine', () => {
    it('validateIdentityCorrectionInput requires value; reason is optional', () => {
        expect(validateIdentityCorrectionInput('', '')).toBeTruthy();
        expect(validateIdentityCorrectionInput('محمد', '')).toBeNull();
        expect(validateIdentityCorrectionInput('محمد', 'خطأ مطبعي')).toBeNull();
        expect(validateIdentityCorrectionInput('محمد', 'قص')).toBeTruthy();
    });

    it('validateDepositionCorrectionInput requires papersAt type', () => {
        expect(validateDepositionCorrectionInput('', 'مركز', 'سبب')).toBeTruthy();
        expect(
            validateDepositionCorrectionInput('مركز شرطة', 'الجمهوري', 'تصحيح إداري'),
        ).toBeNull();
    });

    it('caseIdentityCorrectionBlocked respects frozen and archived', () => {
        expect(caseIdentityCorrectionBlocked({ isFrozen: true } as any)).toBe(true);
        expect(caseIdentityCorrectionBlocked({ isArchived: true } as any)).toBe(true);
        expect(caseIdentityCorrectionBlocked({} as any)).toBe(false);
    });
});
