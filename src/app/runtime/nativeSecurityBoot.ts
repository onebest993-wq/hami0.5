import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { syncNativePrivacyGuardFromSettings } from '@/app/runtime/nativePrivacyGuard';

/** يطبّق حماية النافذة الأصلية (شاشة المهام + FLAG_SECURE) حسب الإعدادات */
export async function applyNativeSecurityFromSettings(): Promise<void> {
    try {
        await syncNativePrivacyGuardFromSettings(getLawyerSettingsSnapshot().security);
    } catch {
        /* best effort */
    }
}

/** يُزامِن الحماية عند تغيّر الإعدادات أثناء الجلسة */
export function wireNativeSecuritySettingsListener(): () => void {
    if (typeof window === 'undefined') return () => undefined;

    const onUpdate = () => {
        void applyNativeSecurityFromSettings();
    };

    window.addEventListener('hami:settings-updated', onUpdate);
    return () => window.removeEventListener('hami:settings-updated', onUpdate);
}
