import { getBootCapacitorPlatformId, type BootNativePlatformId } from './bootNativePlatform';
import { applyNativeSecurityFromSettings, wireNativeSecuritySettingsListener } from './nativeSecurityBoot';

type CapacitorLike = {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
};

function readCapacitorGlobal(): CapacitorLike | null {
    if (typeof window === 'undefined') return null;
    return (window as Window & { Capacitor?: CapacitorLike }).Capacitor ?? null;
}

function applyNativeDataset(isNative: boolean, platform: BootNativePlatformId): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    /* لا تُسقط native→web إن كُشف Android مبكراً عبر UA قبل Capacitor */
    if (!isNative && root.dataset.hamiNative === '1' && root.dataset.hamiPlatform === 'android') {
        return;
    }
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
    const platform: BootNativePlatformId = isNative ? getBootCapacitorPlatformId() : 'web';

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
        await StatusBar.setBackgroundColor({ color: '#0A0F1C' });
        /* Android فقط: WebView تحت شريط الحالة — يمنع لصق الهيدر الثابت فوق الساعة/البطارية */
        if (getBootCapacitorPlatformId() === 'android') {
            await StatusBar.setOverlaysWebView({ overlay: false });
            await StatusBar.setBackgroundColor({ color: '#0A0F1C' });
        }
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
