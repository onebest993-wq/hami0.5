import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { loadOptionalCapacitorPlugin } from '@/app/runtime/optionalCapacitorPluginLoad';

const GUARD_DATASET_KEY = 'hamiScreenshotGuard';
const PRIVACY_SCREEN_MODULE = '@capacitor-community/privacy-screen';
let allowedClipboardActionDepth = 0;

type PrivacyScreenPlugin = {
    PrivacyScreen: {
        enable(): Promise<void>;
        disable(): Promise<void>;
    };
};

async function loadPrivacyScreenPlugin(): Promise<PrivacyScreenPlugin['PrivacyScreen'] | null> {
    if (!isCapacitorNativePlatform()) return null;
    const mod = await loadOptionalCapacitorPlugin<PrivacyScreenPlugin>(PRIVACY_SCREEN_MODULE);
    return mod?.PrivacyScreen ?? null;
}

/** يُفعّل/يُوقف حماية لقطة الشاشة — ويب + FLAG_SECURE / app-switcher على الموبايل */
export async function syncNativeScreenshotGuard(enabled: boolean): Promise<void> {
    const plugin = await loadPrivacyScreenPlugin();
    if (!plugin) return;
    try {
        if (enabled) await plugin.enable();
        else await plugin.disable();
    } catch {
        /* best effort */
    }
}

/** مستمعات الويب — تُكمّل (لا تستبدل) الحماية الأصلية */
export function bindWebScreenshotDeterrent(): () => void {
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
        void syncNativeScreenshotGuard(false);
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
