import { describe, expect, it } from 'vitest';
import { settingWiringHint } from '@/app/services/settings/settingsCapabilities';

/** مفاتيح الإعدادات المعروضة فعلياً في الواجهة — مرجع للتدقيق الذرّي */
const WIRED_SETTING_KEYS = [
    // المنظر — الإعدادات العامة فقط (تخصيص الأقسام عبر homeLayout.overrides)
        'appearance.theme',
        'appearance.wallpaper',
        'appearance.reduceMotion',
        'appearance.fontSize',
        'appearance.highContrast',
        'performance.litePerformance',
    // الأمان
    'security.localOnlyMode',
    'security.biometricLock',
    'security.autoLockMinutes',
    'security.privacyBlur',
    'security.screenshotDeterrent',
    // البيانات
    'data.autoSave',
    'data.cloudSync',
    'data.businessBackup',
    'data.clearLocal',
    'data.resetSettings',
] as const;

describe('settings wiring coverage', () => {
    it('كل خيار معروض له تلميح صادق في settingsCapabilities', () => {
        for (const key of WIRED_SETTING_KEYS) {
            expect(settingWiringHint(key), `missing hint for ${key}`).toBeTruthy();
        }
    });
});
