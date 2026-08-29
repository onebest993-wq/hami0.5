import { clearOverlayEnterSettle } from '@/app/runtime/overlayEnterSettle';
import { isViteE2eHooksEnabled } from '@/app/utils/viteE2eHooks';
import { isProfileStudioChromeVisible } from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

const CLOSING_ATTR = 'data-hami-profile-closing';
const OPEN_ATTR = 'data-hami-profile-open';
const SURFACE_SELECTOR = '[data-testid="lawyer-dashboard-profile-surface"]';
const ROOT_SELECTOR = '[data-lawyer-profile-root]';

export const PROFILE_SURFACE_EXIT_MS = 170;
export const PROFILE_SURFACE_EXIT_PAD_MS = 16;

function shouldSkipProfileMotion(): boolean {
    if (typeof document === 'undefined') return true;
    if (import.meta.env.VITE_E2E === '1' || import.meta.env.VITE_E2E === 'true') return true;
    const root = document.documentElement;
    if (
        root.dataset.hamiReduceMotion === '1' ||
        root.dataset.hamiAnimations === '0' ||
        root.dataset.hamiLite === '1'
    ) {
        return true;
    }
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
}

function recordE2eProfileClose(blocked: boolean): void {
    if (!isViteE2eHooksEnabled() || typeof window === 'undefined') return;
    const w = window as Window & {
        __hamiE2eLastProfileClose?: {
            blocked: boolean;
            at: number;
            studio: boolean;
            stack: string;
        };
    };
    w.__hamiE2eLastProfileClose = {
        blocked,
        at: Date.now(),
        studio: Boolean(
            typeof document !== 'undefined' &&
                document.querySelector(
                    '[data-testid="profile-settings-sheet"], [data-testid="profile-settings-sheet-loading"]',
                ),
        ),
        stack: new Error().stack?.split('\n').slice(0, 16).join('\n') ?? '',
    };
}

function isStudioChromeMounted(): boolean {
    return isProfileStudioChromeVisible();
}

/**
 * يُبقي السطح للخروج ثم onDone — لا flushSync للرئيسية قبل التلاشي.
 * لا تُغلق الملف فوق استوديو مفتوح/يُحمَّل — أغلِق الاستوديو أولاً (رجوع/Escape).
 */
export function beginProfileShellExit(onDone: () => void): void {
    if (isStudioChromeMounted()) {
        recordE2eProfileClose(true);
        return;
    }
    recordE2eProfileClose(false);
    if (typeof document === 'undefined' || shouldSkipProfileMotion()) {
        clearOverlayEnterSettle('data-hami-profile-enter');
        onDone();
        return;
    }

    const surface = document.querySelector(SURFACE_SELECTOR);
    if (!(surface instanceof HTMLElement)) {
        onDone();
        return;
    }

    surface.style.removeProperty('opacity');
    const root = document.documentElement;
    clearOverlayEnterSettle('data-hami-profile-enter');
    root.setAttribute(CLOSING_ATTR, '1');
    root.removeAttribute(OPEN_ATTR);

    const maybeRoot = document.querySelector(ROOT_SELECTOR);
    const motionEl = maybeRoot instanceof HTMLElement ? maybeRoot : surface;

    let settled = false;
    const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        motionEl.removeEventListener('transitionend', onTransitionEnd);
        try {
            onDone();
        } finally {
            if (document.documentElement.getAttribute(OPEN_ATTR) !== '1') {
                document.documentElement.removeAttribute(CLOSING_ATTR);
            }
        }
    };

    const onTransitionEnd = (event: Event) => {
        if (!(event instanceof TransitionEvent)) return;
        if (event.propertyName !== 'opacity' && event.propertyName !== 'transform') return;
        finish();
    };

    motionEl.addEventListener('transitionend', onTransitionEnd);
    const fallbackTimer = window.setTimeout(
        finish,
        PROFILE_SURFACE_EXIT_MS + PROFILE_SURFACE_EXIT_PAD_MS,
    );
}
