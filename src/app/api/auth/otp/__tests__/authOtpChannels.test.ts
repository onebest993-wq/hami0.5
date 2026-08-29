import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../security/adminMailer.ts', () => ({
    isAdminMailerConfigured: () => false,
    sendAdminMail: vi.fn(),
}));

import {
    isAuthOtpWhatsAppChannelReady,
    isAuthOtpWhatsAppWebhookReady,
    isMetaWhatsAppCloudReady,
} from '../authOtpChannels.ts';

describe('WhatsApp OTP channel readiness', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('لا يعتبر EMAIL_WEBHOOK_URL قناة واتساب من تلقاء نفسه', () => {
        vi.stubEnv('EMAIL_WEBHOOK_URL', 'https://hooks.example.test/mail');
        vi.stubEnv('WHATSAPP_TOKEN', '');
        vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '');
        vi.stubEnv('WHATSAPP_OTP_TEMPLATE', '');
        vi.stubEnv('WHATSAPP_WEBHOOK_URL', '');
        vi.stubEnv('WHATSAPP_VIA_EMAIL_WEBHOOK', '');
        expect(isMetaWhatsAppCloudReady()).toBe(false);
        expect(isAuthOtpWhatsAppWebhookReady()).toBe(false);
        expect(isAuthOtpWhatsAppChannelReady()).toBe(false);
    });

    it('يقبل وسيط البريد كواتساب فقط مع التصريح', () => {
        vi.stubEnv('EMAIL_WEBHOOK_URL', 'https://hooks.example.test/mail');
        vi.stubEnv('WHATSAPP_VIA_EMAIL_WEBHOOK', 'true');
        vi.stubEnv('WHATSAPP_TOKEN', '');
        vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '');
        vi.stubEnv('WHATSAPP_OTP_TEMPLATE', '');
        vi.stubEnv('WHATSAPP_WEBHOOK_URL', '');
        expect(isAuthOtpWhatsAppChannelReady()).toBe(true);
    });

    it('يقبل بيانات Meta Cloud الثلاث', () => {
        vi.stubEnv('WHATSAPP_TOKEN', 'token');
        vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
        vi.stubEnv('WHATSAPP_OTP_TEMPLATE', 'hami_otp');
        vi.stubEnv('WHATSAPP_WEBHOOK_URL', '');
        vi.stubEnv('WHATSAPP_VIA_EMAIL_WEBHOOK', '');
        vi.stubEnv('EMAIL_WEBHOOK_URL', '');
        expect(isMetaWhatsAppCloudReady()).toBe(true);
        expect(isAuthOtpWhatsAppChannelReady()).toBe(true);
    });
});
