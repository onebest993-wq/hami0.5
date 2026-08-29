import { describe, expect, it } from 'vitest';
import {
    buildHamiSupportWhatsAppUrlFromRaw,
    isAllowedSupportWhatsAppUrl,
    toSupportWhatsAppMsisdn,
} from '@/app/constants/supportWhatsapp';

describe('supportWhatsapp', () => {
    it('يبني wa.me من رقم عراقي', () => {
        expect(toSupportWhatsAppMsisdn('07811102199')).toBe('9647811102199');
        expect(toSupportWhatsAppMsisdn('+9647811102199')).toBe('9647811102199');
        const url = buildHamiSupportWhatsAppUrlFromRaw('07811102199');
        expect(url).toMatch(/^https:\/\/wa\.me\/9647811102199\?/);
        expect(isAllowedSupportWhatsAppUrl(url ?? '')).toBe(true);
    });

    it('يرفض عناوين غير واتساب', () => {
        expect(isAllowedSupportWhatsAppUrl('https://evil.example/wa.me/1')).toBe(false);
        expect(isAllowedSupportWhatsAppUrl('http://wa.me/9647811102199')).toBe(false);
        expect(toSupportWhatsAppMsisdn('07123456789')).toBeNull();
    });
});
