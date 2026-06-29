import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import { syncNativeScreenshotGuard } from '@/app/runtime/screenshotDeterrentRuntime';

/** يطبّق حماية لقطة الشاشة الأصلية حسب الإعدادات — قبل/بعد React */
export async function applyNativeSecurityFromSettings(): Promise<void> {
    try {
        const { security } = getLawyerSettingsSnapshot();
        await syncNativeScreenshotGuard(security.screenshotDeterrent);
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
