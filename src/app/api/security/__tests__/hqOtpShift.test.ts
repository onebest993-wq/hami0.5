import { describe, expect, it } from 'vitest';
import {
    confirmCodeFromMailboxDigits,
    isHqOtpDigitString,
    mailboxDigitsFromConfirmCode,
} from '../hqOtpShift.ts';

describe('hqOtpShift', () => {
    it('يحيل 123459 في الرسالة إلى 234569 في الحقل (+1، والتسعة تبقى)', () => {
        expect(confirmCodeFromMailboxDigits('123459')).toBe('234569');
        expect(mailboxDigitsFromConfirmCode('234569')).toBe('123459');
    });

    it('يحافظ على التسع في الاتجاهين', () => {
        expect(confirmCodeFromMailboxDigits('999999')).toBe('999999');
        expect(mailboxDigitsFromConfirmCode('999999')).toBe('999999');
    });

    it('يرفض صفراً في رمز الحقل لأن القاعدة لا تنتج صفراً', () => {
        expect(() => mailboxDigitsFromConfirmCode('120456')).toThrow(/HQ_OTP_SHIFT_ZERO/);
    });

    it('يعكس كل رمز حقل من 1–9 بلا لبس', () => {
        const confirms = ['111111', '234569', '888888', '191919', '765432'];
        for (const confirm of confirms) {
            const mailbox = mailboxDigitsFromConfirmCode(confirm);
            expect(isHqOtpDigitString(mailbox)).toBe(true);
            expect(mailbox).not.toContain('8');
            expect(confirmCodeFromMailboxDigits(mailbox)).toBe(confirm);
        }
    });
});
