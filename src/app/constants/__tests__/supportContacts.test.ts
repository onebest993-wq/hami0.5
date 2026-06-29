import { describe, expect, it } from 'vitest';
import {
    buildHamiSupportMailtoUrl,
    buildHamiSupportWhatsAppUrl,
    HAMI_SUPPORT_WHATSAPP_DIGITS,
} from '@/app/constants/supportContacts';

describe('supportContacts', () => {
    it('builds WhatsApp URL for support number', () => {
        expect(buildHamiSupportWhatsAppUrl()).toBe(`https://wa.me/${HAMI_SUPPORT_WHATSAPP_DIGITS}`);
        expect(buildHamiSupportWhatsAppUrl('مرحباً')).toContain('text=');
    });

    it('builds mailto URL', () => {
        expect(buildHamiSupportMailtoUrl()).toContain('mailto:support@hami.app');
    });
});
