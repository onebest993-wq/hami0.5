import { whenNativeBridgeReady } from '@/app/runtime/nativeBridgeReady';
import { applyNativePrivacyGuard, syncNativePrivacyGuardFromSettings } from '@/app/runtime/nativePrivacyGuard';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';

const GUARD_DATASET_KEY = 'hamiScreenshotGuard';
let allowedClipboardActionDepth = 0;

/** يُفعّل/يُوقف حماية لقطة الشاشة — ويب + FLAG_SECURE / شاشة المهام على الموبايل */
export async function syncNativeScreenshotGuard(enabled: boolean): Promise<boolean> {
    if (!isCapacitorNativePlatform()) return true;

    try {
        await whenNativeBridgeReady();
        const privacyBlur = getLawyerSettingsSnapshot().security.privacyBlur;
        return await applyNativePrivacyGuard({
            recentsCover: privacyBlur,
            windowSecure: enabled || privacyBlur,
        });
    } catch {
        return false;
    }
}

/** مستمعات الويب — تُكمّل (لا تستبدل) الحماية الأصلية */
export function bindWebScreenshotDeterrent(): () => void {
    if (isCapacitorNativePlatform()) {
        void syncNativeScreenshotGuard(true);
        return () => {
            void syncNativePrivacyGuardFromSettings();
        };
    }

    const blockMenu = (e: Event) => e.preventDefault();
    const blockClipboard = (e: ClipboardEvent) => {
        if (allowedClipboardActionDepth > 0) return;
        e.preventDefault();
    };

    document.documentElement.dataset[GUARD_DATASET_KEY] = '1';
    document.addEventListener('contextmenu', blockMenu);
    document.addEventListener('copy', blockClipboard, true);
    document.addEventListener('cut', blockClipboard, true);

    void syncNativeScreenshotGuard(true);

    return () => {
        delete document.documentElement.dataset[GUARD_DATASET_KEY];
        document.removeEventListener('contextmenu', blockMenu);
        document.removeEventListener('copy', blockClipboard, true);
        document.removeEventListener('cut', blockClipboard, true);
        void syncNativePrivacyGuardFromSettings();
    };
}

/** يسمح لنسخ/قص برمجي موثوق من داخل التطبيق دون تعطيل الحارس العام بشكل دائم. */
export async function withAllowedClipboardAction<T>(action: () => Promise<T> | T): Promise<T> {
    allowedClipboardActionDepth += 1;
    try {
        return await action();
    } finally {
        allowedClipboardActionDepth = Math.max(0, allowedClipboardActionDepth - 1);
    }
}
