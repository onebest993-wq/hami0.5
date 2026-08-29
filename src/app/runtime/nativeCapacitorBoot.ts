import { NATIVE_CAPACITOR_BOOT_DONE_EVENT, whenNativeBridgeReady } from '@/app/runtime/nativeBridgeReady';
import { applyCapacitorNativePlugins, applyCapacitorShellBoot } from '@/app/runtime/capacitorShellBoot';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

type BootWindow = Window & {
    __hamiCapacitorNativeBootPromise__?: Promise<void>;
    __hamiCapacitorNativeBootDone__?: boolean;
};

function markBootComplete(): void {
    const w = window as BootWindow;
    w.__hamiCapacitorNativeBootDone__ = true;
    try {
        document.documentElement.dataset.hamiCapacitorBoot = '1';
    } catch {
        /* ignore */
    }
    window.dispatchEvent(new CustomEvent(NATIVE_CAPACITOR_BOOT_DONE_EVENT));
}

/**
 * بوابة إقلاع أصلية واحدة — تنتظر الجسر ثم تُهيّئ أشرطة النظام/Keyboard/الأمان.
 * idempotent: آمن استدعاؤها من index و deferredBoot.
 */
export async function bootNativeCapacitorShell(): Promise<void> {
    if (typeof window === 'undefined') return;

    const w = window as BootWindow;
    if (w.__hamiCapacitorNativeBootDone__) return;
    if (w.__hamiCapacitorNativeBootPromise__) return w.__hamiCapacitorNativeBootPromise__;

    w.__hamiCapacitorNativeBootPromise__ = (async () => {
        if (!isCapacitorNativePlatform()) {
            applyCapacitorShellBoot();
            markBootComplete();
            return;
        }

        applyCapacitorShellBoot();
        await whenNativeBridgeReady();
        applyCapacitorShellBoot();
        await applyCapacitorNativePlugins();
        markBootComplete();
        void import('@/app/runtime/biometricNative')
            .then((m) => m.probeBiometricPlugin())
            .catch(() => undefined);
    })().finally(() => {
        delete w.__hamiCapacitorNativeBootPromise__;
    });

    return w.__hamiCapacitorNativeBootPromise__;
}

/** يُستخدم قبل أي plugin أصلي خارج مسار الإقلاع (مثل إعدادات المحامي). */
export function whenNativeCapacitorBootComplete(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();

    const w = window as BootWindow;
    if (w.__hamiCapacitorNativeBootDone__) return Promise.resolve();
    if (w.__hamiCapacitorNativeBootPromise__) return w.__hamiCapacitorNativeBootPromise__;

    return new Promise((resolve) => {
        const onReady = () => {
            window.removeEventListener(NATIVE_CAPACITOR_BOOT_DONE_EVENT, onReady);
            resolve();
        };
        window.addEventListener(NATIVE_CAPACITOR_BOOT_DONE_EVENT, onReady, { once: true });
        void bootNativeCapacitorShell().then(() => resolve());
    });
}

export function resetNativeCapacitorBootForTests(): void {
    const w = window as BootWindow;
    delete w.__hamiCapacitorNativeBootPromise__;
    delete w.__hamiCapacitorNativeBootDone__;
    try {
        delete document.documentElement.dataset.hamiCapacitorBoot;
    } catch {
        /* ignore */
    }
}
