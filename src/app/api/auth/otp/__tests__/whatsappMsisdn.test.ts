import { describe, expect, it } from 'vitest';
import { toIraqWhatsAppMsisdn, phoneLastTwoDigits } from '@/app/api/auth/otp/whatsappMsisdn';

describe('toIraqWhatsAppMsisdn', () => {
    it('يحول 07x العراقي إلى 9647… ويأخذ آخر رقمين', () => {
        expect(toIraqWhatsAppMsisdn('07803344524')).toBe('9647803344524');
        expect(toIraqWhatsAppMsisdn('+9647803344524')).toBe('9647803344524');
        expect(phoneLastTwoDigits('07803344524')).toBe('24');
        expect(phoneLastTwoDigits('07801111299')).toBe('99');
    });

    it('يرفض أرقاماً غير معتمدة', () => {
        expect(toIraqWhatsAppMsisdn('07123456789')).toBeNull();
        expect(toIraqWhatsAppMsisdn('')).toBeNull();
        expect(toIraqWhatsAppMsisdn(null)).toBeNull();
    });
});
