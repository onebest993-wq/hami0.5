import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

export const NATIVE_CAPACITOR_BOOT_DONE_EVENT = 'hami:capacitor-native-ready';

type CapacitorGlobal = {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    isPluginAvailable?: (name: string) => boolean;
};

function readCapacitor(): CapacitorGlobal | null {
    if (typeof window === 'undefined') return null;
    return (window as Window & { Capacitor?: CapacitorGlobal }).Capacitor ?? null;
}

let bridgeReadyPromise: Promise<void> | null = null;

async function isCapacitorBridgeOperational(): Promise<boolean> {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return true;

        const platform = Capacitor.getPlatform();
        if (platform !== 'android' && platform !== 'ios') return false;
        if (!Capacitor.isPluginAvailable('App')) return false;

        const { App } = await import('@capacitor/app');
        await App.getState();

        void (async () => {
            try {
                if (!Capacitor.isPluginAvailable('PrivacyScreen')) return;
                const { PrivacyScreen } = await import('@capacitor-community/privacy-screen');
                await PrivacyScreen.disable();
            } catch {
                /* optional — لا يحجب الجسر */
            }
        })();

        return true;
    } catch {
        return false;
    }
}

/**
 * ينتظر حقن جسر Capacitor + إثبات App + PrivacyScreen قبل أي plugin حساس.
 */
export function whenNativeBridgeReady(timeoutMs = 8_000): Promise<void> {
    if (!isCapacitorNativePlatform()) return Promise.resolve();

    if (!bridgeReadyPromise) {
        bridgeReadyPromise = (async () => {
            const started = Date.now();
            while (Date.now() - started < timeoutMs) {
                if (await isCapacitorBridgeOperational()) return;
                await new Promise<void>((resolve) => {
                    window.requestAnimationFrame(() => resolve());
                });
            }
        })();
    }

    return bridgeReadyPromise;
}

export function resetNativeBridgeReadyForTests(): void {
    bridgeReadyPromise = null;
}
