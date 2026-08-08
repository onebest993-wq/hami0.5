import { whenNativeBridgeReady } from '@/app/runtime/nativeBridgeReady';
import { callPrivacyScreenGuard } from '@/app/runtime/privacyScreenNative';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

const GUARD_DATASET_KEY = 'hamiScreenshotGuard';
let allowedClipboardActionDepth = 0;

async function invokeNativeScreenshotGuard(enabled: boolean): Promise<void> {
    if (!isCapacitorNativePlatform()) return;

    try {
        await whenNativeBridgeReady();
        await callPrivacyScreenGuard(enabled);
    } catch {
        /* best effort — لا نُسقط الإقلاع */
    }
}

/** يُفعّل/يُوقف حماية لقطة الشاشة — ويب + FLAG_SECURE / app-switcher على الموبايل */
export async function syncNativeScreenshotGuard(enabled: boolean): Promise<void> {
    await invokeNativeScreenshotGuard(enabled);
}

/** مستمعات الويب — تُكمّل (لا تستبدل) الحماية الأصلية */
export function bindWebScreenshotDeterrent(): () => void {
    if (isCapacitorNativePlatform()) {
        void invokeNativeScreenshotGuard(true);
        return () => {
            void invokeNativeScreenshotGuard(false);
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

    void invokeNativeScreenshotGuard(true);

    return () => {
        delete document.documentElement.dataset[GUARD_DATASET_KEY];
        document.removeEventListener('contextmenu', blockMenu);
        document.removeEventListener('copy', blockClipboard, true);
        document.removeEventListener('cut', blockClipboard, true);
        void invokeNativeScreenshotGuard(false);
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
