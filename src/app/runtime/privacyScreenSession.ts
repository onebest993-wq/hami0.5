import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import { syncNativeScreenshotGuard } from '@/app/runtime/screenshotDeterrentRuntime';

let sessionDepth = 0;
let restoreOnRelease = false;

/** يُوقف FLAG_SECURE مؤقتاً أثناء الكاميرا — ref-counted للتداخل الآمن */
export async function beginPrivacySensitiveSurface(): Promise<void> {
    sessionDepth += 1;
    if (sessionDepth > 1) return;

    restoreOnRelease = getLawyerSettingsSnapshot().security.screenshotDeterrent;
    if (restoreOnRelease) {
        await syncNativeScreenshotGuard(false);
    }
}

export async function endPrivacySensitiveSurface(): Promise<void> {
    if (sessionDepth <= 0) return;
    sessionDepth -= 1;
    if (sessionDepth > 0) return;

    if (restoreOnRelease) {
        await syncNativeScreenshotGuard(true);
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
