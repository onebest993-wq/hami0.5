import { describe, expect, it, vi } from 'vitest';
import { prefetchSettingsSection } from '@/app/components/lawyer/HamiSettings/settingsSectionLoad';

const prefetchSettingsDialogs = vi.fn();

vi.mock('@/app/components/lawyer/HamiSettings/settingsDialogPrefetch', () => ({
    prefetchSettingsDialogs: (...args: unknown[]) => prefetchSettingsDialogs(...args),
}));

describe('settingsSectionLoad', () => {
    it('الأمن لا يسحب مقطعاً ثانوياً', () => {
        prefetchSettingsSection('security');
        expect(prefetchSettingsDialogs).not.toHaveBeenCalled();
    });

    it('المنظر عند الطلب الصريح بلا حوارات البيانات/الحساب', () => {
        prefetchSettingsSection('appearance');
        expect(prefetchSettingsDialogs).not.toHaveBeenCalled();
    });

    it('تبويب البيانات يسحب الحوارات عند الطلب الصريح', () => {
        prefetchSettingsSection('data');
        expect(prefetchSettingsDialogs).toHaveBeenCalledTimes(1);
    });

    it('فتح المركز يحمّل المنظر والبيانات والحساب دون انتظار زيارة التبويب', async () => {
        const { prefetchSettingsOpenTabChunks } = await import(
            '@/app/components/lawyer/HamiSettings/settingsSectionLoad'
        );
        prefetchSettingsOpenTabChunks();
        expect(prefetchSettingsDialogs).toHaveBeenCalled();
    });
});
