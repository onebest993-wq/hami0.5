import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { loadOptionalCapacitorPlugin } from '@/app/runtime/optionalCapacitorPluginLoad';

const GUARD_DATASET_KEY = 'hamiScreenshotGuard';
const PRIVACY_SCREEN_MODULE = '@capacitor-community/privacy-screen';

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
    const blockClipboard = (e: ClipboardEvent) => e.preventDefault();

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
