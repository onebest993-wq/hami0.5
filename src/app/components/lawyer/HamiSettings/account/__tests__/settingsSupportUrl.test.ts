import { describe, expect, it } from 'vitest';
import { isAllowedSettingsSupportUrl } from '@/app/components/lawyer/HamiSettings/account/settingsSupportUrl';

describe('isAllowedSettingsSupportUrl', () => {
    it('يقبل mailto فقط', () => {
        expect(isAllowedSettingsSupportUrl('mailto:support@example.com?subject=x')).toBe(true);
        expect(isAllowedSettingsSupportUrl('https://wa.me/9647811102199')).toBe(false);
        expect(isAllowedSettingsSupportUrl('https://api.whatsapp.com/send?phone=1')).toBe(false);
    });

    it('يرفض javascript وhttp والمضيف الغريب', () => {
        expect(isAllowedSettingsSupportUrl('javascript:alert(1)')).toBe(false);
        expect(isAllowedSettingsSupportUrl('http://wa.me/9647811102199')).toBe(false);
        expect(isAllowedSettingsSupportUrl('https://evil.example/wa.me')).toBe(false);
        expect(isAllowedSettingsSupportUrl('')).toBe(false);
    });
});
