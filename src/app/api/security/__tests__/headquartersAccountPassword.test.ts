import { describe, expect, it } from 'vitest';
import { validateHeadquartersAccountPassword } from '../headquartersAccountPassword.ts';
import { isHqFreezeDurationHours } from '../headquartersAccountControl.ts';

describe('headquartersAccountPassword', () => {
    it('يقبل كلمة مرور إنجليزية مع رقم', () => {
        expect(validateHeadquartersAccountPassword('HamiLaw9x')).toBeNull();
    });

    it('يرفض الفراغ والضعف', () => {
        expect(validateHeadquartersAccountPassword('')).toBeTruthy();
        expect(validateHeadquartersAccountPassword('password123')).toBeTruthy();
        expect(validateHeadquartersAccountPassword('قصيرة')).toBeTruthy();
    });
});

describe('headquartersAccountControl', () => {
    it('يقبل مدد التجميد المعتمدة فقط', () => {
        expect(isHqFreezeDurationHours(0)).toBe(true);
        expect(isHqFreezeDurationHours(24)).toBe(true);
        expect(isHqFreezeDurationHours(12)).toBe(false);
        expect(isHqFreezeDurationHours('24')).toBe(false);
    });
});
