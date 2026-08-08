import { isAndroidNativeShell, isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { applyNativeResumeFastPath } from '@/app/runtime/nativeResumeFastPath';

export type NativeBackHandler = () => boolean;

/** مكدس LIFO — آخر مسجّل يُستهلك أولاً (تجنّب سباق الطبقات المتداخلة) */
const nativeBackHandlers: NativeBackHandler[] = [];

/** تسجيل معالج رجوع أندرويد — يُرجع true إذا استُوعب الحدث */
export function registerNativeBackHandler(handler: NativeBackHandler): () => void {
    nativeBackHandlers.push(handler);
    return () => {
        const idx = nativeBackHandlers.lastIndexOf(handler);
        if (idx >= 0) nativeBackHandlers.splice(idx, 1);
    };
}

/** للاختبارات — محاكاة زر الرجوع */
export function consumeNativeBackForTests(): boolean {
    return dispatchNativeBack();
}

/** للاختبارات — إفراغ المكدس */
export function resetNativeBackHandlersForTests(): void {
    nativeBackHandlers.length = 0;
}

function dispatchNativeBack(): boolean {
    for (let i = nativeBackHandlers.length - 1; i >= 0; i -= 1) {
        const handler = nativeBackHandlers[i];
        if (handler?.()) return true;
    }
    return false;
}

function applyAppActiveDataset(isActive: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.hamiAppActive = isActive ? '1' : '0';
}

/** App plugin — زر الرجوع + حالة foreground/background */
export async function wireCapacitorAppLifecycle(): Promise<void> {
    if (!isCapacitorNativePlatform()) return;

    try {
        const { App } = await import('@capacitor/app');

        if (isAndroidNativeShell()) {
            void App.addListener('backButton', () => {
                if (dispatchNativeBack()) return;
                void App.minimizeApp();
            });
        }

        void App.addListener('appStateChange', ({ isActive }) => {
            applyAppActiveDataset(isActive);
            if (isActive) applyNativeResumeFastPath();
        });

        const state = await App.getState();
        applyAppActiveDataset(state.isActive);
    } catch {
        /* plugin غير متاح على الويب */
    }
}
