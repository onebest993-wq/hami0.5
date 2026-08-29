import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { applyNativePrivacyGuard, syncNativePrivacyGuardFromSettings } from '@/app/runtime/nativePrivacyGuard';

let sessionDepth = 0;
let restoreOnRelease = false;

/** يُوقف FLAG_SECURE مؤقتاً أثناء الكاميرا — الغطاء يبقى إن كانت الضبابية مفعّلة */
export async function beginPrivacySensitiveSurface(): Promise<void> {
    sessionDepth += 1;
    if (sessionDepth > 1) return;

    const { privacyBlur, screenshotDeterrent } = getLawyerSettingsSnapshot().security;
    restoreOnRelease = privacyBlur || screenshotDeterrent;
    if (restoreOnRelease) {
        await applyNativePrivacyGuard({
            recentsCover: privacyBlur,
            windowSecure: false,
        });
    }
}

export async function endPrivacySensitiveSurface(): Promise<void> {
    if (sessionDepth <= 0) return;
    sessionDepth -= 1;
    if (sessionDepth > 0) return;

    if (restoreOnRelease) {
        await syncNativePrivacyGuardFromSettings();
    }
    restoreOnRelease = false;
}

export async function runWithPrivacyScreenSuspended<T>(fn: () => Promise<T>): Promise<T> {
    await beginPrivacySensitiveSurface();
    try {
        return await fn();
    } finally {
        await endPrivacySensitiveSurface();
    }
}
