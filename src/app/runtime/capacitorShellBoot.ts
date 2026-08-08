import { whenNativeBridgeReady } from './nativeBridgeReady';
import { getBootCapacitorPlatformId, type BootNativePlatformId } from './bootNativePlatform';
import { BOOT_REVEAL_DONE_EVENT } from '@/app/bootstrap/bootReveal';
import { wireNativeSecuritySettingsListener } from './nativeSecurityBoot';
import { wireNativeResumeFastPath } from './nativeResumeFastPath';

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
        wireNativeBootRevealHandoff();
        wireNativeResumeFastPath();
        void import('./capacitorAppLifecycle').then((m) => m.wireCapacitorAppLifecycle());
    }
}

function wireNativeBootRevealHandoff(): void {
    if (typeof window === 'undefined') return;
    const w = window as Window & { __hamiNativeBootHandoff__?: boolean };
    if (w.__hamiNativeBootHandoff__) return;
    w.__hamiNativeBootHandoff__ = true;

    const settleSurface = () => {
        try {
            document.body.style.backgroundColor = '#0a0f1c';
            document.documentElement.style.backgroundColor = '#0a0f1c';
        } catch {
            /* ignore */
        }
    };

    window.addEventListener(BOOT_REVEAL_DONE_EVENT, settleSurface, { once: true });
    if (document.documentElement.dataset.hamiBootRevealed === '1') {
        settleSurface();
    }
}

/** StatusBar + Keyboard + أمان أصلي — يُستدعى بعد جاهزية الجسر فقط */
export async function applyCapacitorNativePlugins(): Promise<void> {
    await whenNativeBridgeReady();
    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0A0F1C' });
        /* Android فقط: WebView تحت شريط الحالة — يمنع لصق الهيدر الثابت فوق الساعة/البطارية */
        if (getBootCapacitorPlatformId() === 'android') {
            await StatusBar.setOverlaysWebView({ overlay: false });
            await StatusBar.setBackgroundColor({ color: '#0A0F1C' });
            if (typeof document !== 'undefined') {
                /* env(safe-area-inset-top) غالباً 0 — احتياط لإنزال الهيدر عن الساعة/البطارية */
                document.documentElement.style.setProperty('--hami-android-status-pad', '12px');
            }
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
        wireNativeSecuritySettingsListener();
    } catch {
        /* optional */
    }
}
