import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { isNativeSensitivePromptActive } from '@/app/runtime/nativeSensitivePrompt';
import { applyNativePrivacyGuard } from '@/app/runtime/nativePrivacyGuard';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';

const SHIELD_ID = 'hami-privacy-blur-shield';
const WEB_BLUR = 'blur(14px)';

function ensureNativeShield(): HTMLElement {
    let el = document.getElementById(SHIELD_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = SHIELD_ID;
    el.setAttribute('data-testid', 'hami-privacy-blur-shield');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:2147483646',
        'background:#0a0f1c',
        'backdrop-filter:blur(18px)',
        '-webkit-backdrop-filter:blur(18px)',
        'pointer-events:auto',
        'opacity:0',
        'visibility:hidden',
        'transition:none',
    ].join(';');
    document.body.appendChild(el);
    return el;
}

function showNativeShield(): void {
    if (isNativeSensitivePromptActive()) return;
    const el = ensureNativeShield();
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    document.documentElement.dataset.hamiPrivacyShield = '1';
}

function hideNativeShield(): void {
    const el = document.getElementById(SHIELD_ID);
    if (!el) return;
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
    el.style.pointerEvents = 'none';
    delete document.documentElement.dataset.hamiPrivacyShield;
}

/** يُستدعى فور العودة من الخلفية — بلا انتظار microtask أو انتقال */
export function dismissNativePrivacyShieldImmediately(): void {
    if (typeof document === 'undefined') return;
    hideNativeShield();
    document.body.style.filter = 'none';
}

function bindWebPrivacyBlur(enabled: boolean): () => void {
    const onVis = () => {
        if (!enabled || !document.hidden) {
            document.body.style.filter = 'none';
            return;
        }
        document.body.style.filter = WEB_BLUR;
    };
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => {
        document.removeEventListener('visibilitychange', onVis);
        document.body.style.filter = 'none';
    };
}

function bindNativePrivacyBlur(enabled: boolean): () => void {
    document.body.style.filter = 'none';
    void applyNativePrivacyGuard({
        recentsCover: enabled,
        windowSecure: enabled || getLawyerSettingsSnapshot().security.screenshotDeterrent,
    });

    if (!enabled) {
        hideNativeShield();
        return () => undefined;
    }

    const applyBackgroundState = (backgrounded: boolean) => {
        if (!backgrounded || isNativeSensitivePromptActive()) {
            dismissNativePrivacyShieldImmediately();
            return;
        }
        showNativeShield();
    };

    const onVis = () => applyBackgroundState(document.hidden);
    document.addEventListener('visibilitychange', onVis);

    let removeAppListener: (() => void) | undefined;
    void import('@capacitor/app')
        .then(async ({ App }) => {
            const state = await App.getState();
            if (!state.isActive) applyBackgroundState(true);
            const handle = await App.addListener('appStateChange', ({ isActive }) => {
                applyBackgroundState(!isActive);
            });
            removeAppListener = () => {
                void handle.remove();
            };
        })
        .catch(() => undefined);

    if (document.hidden) applyBackgroundState(true);

    return () => {
        document.removeEventListener('visibilitychange', onVis);
        removeAppListener?.();
        hideNativeShield();
        delete document.documentElement.dataset.hamiPrivacyShield;
    };
}

/** تمويه عند الخروج — ويب: CSS؛ أصلي: غطاء نافذة + FLAG_SECURE لشاشة المهام */
export function bindPrivacyBlur(enabled: boolean): () => void {
    if (typeof document === 'undefined') return () => undefined;
    if (isCapacitorNativePlatform()) {
        return bindNativePrivacyBlur(enabled);
    }
    return bindWebPrivacyBlur(enabled);
}
