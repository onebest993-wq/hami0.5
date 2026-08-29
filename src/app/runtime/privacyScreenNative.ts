import { whenNativeBridgeReady } from '@/app/runtime/nativeBridgeReady';

const RETRY_MS = 200;
const MAX_ATTEMPTS = 30;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function isPrivacyScreenTimingError(err: unknown): boolean {
    const message = String((err as { message?: unknown } | null)?.message ?? err ?? '');
    return (
        /PrivacyScreen(\.\w+)?\(\).*is not implemented/i.test(message) ||
        /plugin is not implemented on android/i.test(message) ||
        /UNIMPLEMENTED/i.test(message)
    );
}

/**
 * يستدعي enable/disable بعد جاهزية الجسر — مع إعادة محاولة حتى يستجيب plugin الأصلي.
 */
export async function callPrivacyScreenGuard(enabled: boolean): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        try {
            await whenNativeBridgeReady();
            const { Capacitor } = await import('@capacitor/core');
            if (!Capacitor.isNativePlatform()) return false;
            if (!Capacitor.isPluginAvailable('PrivacyScreen')) {
                await delay(RETRY_MS);
                continue;
            }

            const { PrivacyScreen } = await import('@capacitor-community/privacy-screen');
            if (enabled) {
                await PrivacyScreen.enable();
            } else {
                await PrivacyScreen.disable();
            }
            return true;
        } catch (err) {
            if (!isPrivacyScreenTimingError(err) || attempt >= MAX_ATTEMPTS - 1) {
                return false;
            }
            await delay(RETRY_MS);
        }
    }

    return false;
}

/** يثبت التسجيل دون تغيير FLAG_SECURE */
export async function probePrivacyScreenPlugin(): Promise<boolean> {
    try {
        const { Capacitor } = await import('@capacitor/core');
        return Capacitor.isPluginAvailable('PrivacyScreen') || Capacitor.isPluginAvailable('HamiPrivacy');
    } catch {
        return false;
    }
}
