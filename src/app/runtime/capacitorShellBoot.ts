import { getCapacitorPlatformId, type NativePlatformId } from './nativePlatform';
import { applyNativeSecurityFromSettings, wireNativeSecuritySettingsListener } from './nativeSecurityBoot';

type CapacitorLike = {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
};

function readCapacitorGlobal(): CapacitorLike | null {
    if (typeof window === 'undefined') return null;
    return (window as Window & { Capacitor?: CapacitorLike }).Capacitor ?? null;
}

function applyNativeDataset(isNative: boolean, platform: NativePlatformId): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.hamiNative = isNative ? '1' : '0';
    root.dataset.hamiPlatform = platform;
    if (isNative) {
        root.classList.add('hami-native-shell');
    } else {
        root.classList.remove('hami-native-shell');
    }
}

/**
 * يضبط سمات الجذر لـ Capacitor — safe-area، overscroll، لوحة المفاتيح.
 * آمن على الويب: isNative=false.
 */
export function applyCapacitorShellBoot(): void {
    if (typeof window === 'undefined') return;

    const cap = readCapacitorGlobal();
    const isNative = Boolean(cap?.isNativePlatform?.());
    const platform: NativePlatformId = isNative ? getCapacitorPlatformId() : 'web';

    applyNativeDataset(isNative, platform);

    if (isNative) {
        void applyCapacitorNativePlugins();
        void import('./capacitorAppLifecycle').then((m) => m.wireCapacitorAppLifecycle());
    }
}

/** StatusBar + Keyboard + أمان أصلي — يُستدعى على الجهاز فقط */
export async function applyCapacitorNativePlugins(): Promise<void> {
    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#05060D' });
    } catch {
        /* plugin غير متاح على الويب */
    }

    try {
        const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    } catch {
        /* optional */
    }

    try {
        await applyNativeSecurityFromSettings();
        wireNativeSecuritySettingsListener();
    } catch {
        /* optional */
    }
}
