import { describe, expect, it } from 'vitest';
import { buildWhatsAppOtpTemplatePayload } from '../whatsappOtpTemplate.ts';

describe('buildWhatsAppOtpTemplatePayload', () => {
    it('يضع الرمز في الجسم والزر لقوالب AUTHENTICATION', () => {
        const payload = buildWhatsAppOtpTemplatePayload({
            toMsisdn: '9647803344524',
            code: '847291',
            template: 'hami_otp',
            lang: 'ar',
            kind: 'authentication',
        });
        const template = payload.template as {
            components: Array<{ type: string; sub_type?: string; parameters?: Array<{ text: string }> }>;
        };
        expect(template.components[0]?.parameters?.[0]?.text).toBe('847291');
        expect(template.components[1]?.type).toBe('button');
        expect(template.components[1]?.sub_type).toBe('url');
        expect(template.components[1]?.parameters?.[0]?.text).toBe('847291');
    });

    it('يكتفي بالجسم لقوالب {{1}} بدون زر', () => {
        const payload = buildWhatsAppOtpTemplatePayload({
            toMsisdn: '9647803344524',
            code: '847291',
            template: 'hami_utility_otp',
            lang: 'ar',
            kind: 'body_only',
        });
        const template = payload.template as { components: unknown[] };
        expect(template.components).toHaveLength(1);
    });
});
