import { whenNativeBridgeReady } from './nativeBridgeReady';
import { getCapacitorPlatformId, isCapacitorNativePlatform, type NativePlatformId } from './nativePlatform';
import { BOOT_REVEAL_DONE_EVENT } from '@/app/bootstrap/bootReveal';
import { applyHandheldAppKernel } from './handheldAppKernel';
import { wireNativeSecuritySettingsListener } from './nativeSecurityBoot';
import { wireNativeResumeFastPath } from './nativeResumeFastPath';

function applyNativeDataset(isNative: boolean, platform: NativePlatformId): void {
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
 * آمن على الويب: isNative=false. هوية اليد (هاتف/لوحي) تُختَم دائماً.
 */
export function applyCapacitorShellBoot(): void {
    if (typeof window === 'undefined') return;

    applyHandheldAppKernel();

    const isNative = isCapacitorNativePlatform();
    const platform = getCapacitorPlatformId();
    applyNativeDataset(isNative, platform);

    void import('./overlayEdgeBackGesture').then((m) => m.wireOverlayEdgeBackGesture()).catch(() => undefined);

    if (isNative) {
        wireNativeBootRevealHandoff();
        wireNativeResumeFastPath();
        void import('./capacitorAppLifecycle').then((m) => m.wireCapacitorAppLifecycle());
        void import('@/plugins/hami-privacy-guard').catch(() => undefined);
        if (platform === 'android') {
            /* قبل أول فتح للملف — يمنع وميض banding إن وُجدت القواعد متأخرة */
            void import('./profileAndroidFxLoader')
                .then((m) => m.prefetchProfileAndroidFx())
                .catch(() => undefined);
        }
        /* أشرطة النظام: مسار واحد بعد الجسر في applyCapacitorNativePlugins */
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

/** أشرطة النظام + Keyboard + أمان أصلي — يُستدعى بعد جاهزية الجسر فقط */
export async function applyCapacitorNativePlugins(): Promise<void> {
    await whenNativeBridgeReady();
    try {
        /*
         * أشرطة النظام من النواة، لا من @capacitor/status-bar المهجورة.
         *
         * ما سقط عمداً مع استهداف أندرويد ١٦: `setOverlaysWebView({overlay:false})`
         * و`setBackgroundColor`. النظام يفرض الرسم من حافة إلى حافة على كل تطبيق
         * يستهدف SDK 35 فما فوق، وأُلغيت آخر وسيلة انسحاب في SDK 36. فالنداءان
         * لا يفعلان شيئاً، ووجودهما يوهم القارئ بأن الهيدر محميّ بهما بينما
         * الحماية الفعلية من `env(safe-area-inset-*)` في CSS.
         */
        const { SystemBars, SystemBarsStyle } = await import('@capacitor/core');
        /* Dark = محتوى فاتح على خلفية داكنة — يطابق قاعدة التطبيق الكحلية */
        await SystemBars.setStyle({ style: SystemBarsStyle.Dark });
    } catch {
        /* plugin غير متاح على الويب */
    }

    try {
        const { Keyboard, KeyboardResize, KeyboardStyle } = await import('@capacitor/keyboard');
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
        await Keyboard.setStyle({ style: KeyboardStyle.Dark });
    } catch {
        /* optional */
    }

    try {
        wireNativeSecuritySettingsListener();
    } catch {
        /* optional */
    }
}
