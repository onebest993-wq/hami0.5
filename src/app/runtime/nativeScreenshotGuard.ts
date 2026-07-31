import { isBootCapacitorNativePlatform } from '@/app/runtime/bootNativePlatform';
import { loadOptionalCapacitorPlugin } from '@/app/runtime/optionalCapacitorPluginLoad';

const PRIVACY_SCREEN_MODULE = '@capacitor-community/privacy-screen';

type PrivacyScreenPlugin = {
    PrivacyScreen: {
        enable(): Promise<void>;
        disable(): Promise<void>;
    };
};

async function loadPrivacyScreenPlugin(): Promise<PrivacyScreenPlugin['PrivacyScreen'] | null> {
    if (!isBootCapacitorNativePlatform()) return null;
    const mod = await loadOptionalCapacitorPlugin<PrivacyScreenPlugin>(PRIVACY_SCREEN_MODULE);
    return mod?.PrivacyScreen ?? null;
}

/** يُفعّل/يُوقف حماية لقطة الشاشة الأصلية على Native فقط. */
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
