import { describe, expect, it, vi } from 'vitest';
import {
    prefetchSecondarySettingsSections,
    prefetchSettingsSection,
} from '@/app/components/lawyer/HamiSettings/settingsSectionLoad';

const prefetchSettingsDialogs = vi.fn();

vi.mock('@/app/components/lawyer/HamiSettings/settingsDialogPrefetch', () => ({
    prefetchSettingsDialogs: (...args: unknown[]) => prefetchSettingsDialogs(...args),
}));

describe('settingsSectionLoad', () => {
    it('الأمن لا يسحب مقطعاً ثانوياً', () => {
        prefetchSettingsSection('security');
        expect(prefetchSettingsDialogs).not.toHaveBeenCalled();
    });

    it('المنظر/البيانات/الحساب تُسخَّن خارج جذع الأمن', () => {
        prefetchSecondarySettingsSections();
        expect(prefetchSettingsDialogs).toHaveBeenCalled();
    });
});
