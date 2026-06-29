import { isAndroidNativeShell, isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

export type NativeBackHandler = () => boolean;

let nativeBackHandler: NativeBackHandler | null = null;

/** تسجيل معالج رجوع أندرويد — يُرجع true إذا استُوعب الحدث */
export function registerNativeBackHandler(handler: NativeBackHandler): () => void {
    nativeBackHandler = handler;
    return () => {
        if (nativeBackHandler === handler) nativeBackHandler = null;
    };
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
                if (nativeBackHandler?.()) return;
                void App.minimizeApp();
            });
        }

        void App.addListener('appStateChange', ({ isActive }) => {
            applyAppActiveDataset(isActive);
        });

        const state = await App.getState();
        applyAppActiveDataset(state.isActive);
    } catch {
        /* plugin غير متاح على الويب */
    }
}
