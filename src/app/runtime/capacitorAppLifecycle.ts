import { isAndroidNativeShell, isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { applyNativeResumeFastPath } from '@/app/runtime/nativeResumeFastPath';
import { dispatchNativeBack } from '@/app/runtime/nativeBackStack';
import { publishHamiAppState } from '@/app/runtime/appStateEvents';
import { wireOverlayEdgeBackGesture } from '@/app/runtime/overlayEdgeBackGesture';

export type { NativeBackHandler } from '@/app/runtime/nativeBackStack';
export {
    registerNativeBackHandler,
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/nativeBackStack';

function applyAppActiveDataset(isActive: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.hamiAppActive = isActive ? '1' : '0';
    publishHamiAppState(isActive);
}

/** App plugin — زر الرجوع + حالة foreground/background */
export async function wireCapacitorAppLifecycle(): Promise<void> {
    wireOverlayEdgeBackGesture();
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

        void App.addListener('appUrlOpen', ({ url }) => {
            if (!url) return;
            void import('@/app/services/auth/passwordRecoveryGate').then((m) => {
                m.applyAuthDeepLink(url);
            });
        });

        const launched = await App.getLaunchUrl();
        if (launched?.url) {
            const { applyAuthDeepLink } = await import('@/app/services/auth/passwordRecoveryGate');
            applyAuthDeepLink(launched.url);
        }

        const state = await App.getState();
        applyAppActiveDataset(state.isActive);
    } catch {
        /* plugin غير متاح على الويب */
    }
}
