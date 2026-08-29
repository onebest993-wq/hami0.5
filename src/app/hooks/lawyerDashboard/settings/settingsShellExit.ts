import { clearOverlayEnterSettle } from '@/app/runtime/overlayEnterSettle';

const CLOSING_ATTR = 'data-hami-settings-closing';
const OPEN_ATTR = 'data-hami-settings-open';
const HOST_SELECTOR = '[data-testid="hami-settings-overlay-host"]';

export const SETTINGS_SHELL_EXIT_MS = 220;

function shouldSkipSettingsShellMotion(): boolean {
    if (typeof document === 'undefined') return true;
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

export function clearSettingsShellClosing(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(CLOSING_ATTR);
}

/**
 * يُبقي الطبقة للخروج المركَّب ثم يستدعي onDone —
 * لا يُخفى المركز بقطع DOM قبل اكتمال الحركة.
 */
export function beginSettingsShellExit(onDone: () => void): void {
    if (typeof document === 'undefined' || shouldSkipSettingsShellMotion()) {
        clearOverlayEnterSettle('data-hami-settings-enter');
        clearSettingsShellClosing();
        onDone();
        return;
    }

    const host = document.querySelector(HOST_SELECTOR);
    if (!(host instanceof HTMLElement)) {
        clearOverlayEnterSettle('data-hami-settings-enter');
        clearSettingsShellClosing();
        onDone();
        return;
    }

    const root = document.documentElement;
    clearOverlayEnterSettle('data-hami-settings-enter');
    root.setAttribute(CLOSING_ATTR, '1');
    root.removeAttribute(OPEN_ATTR);

    let settled = false;
    const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        host.removeEventListener('transitionend', onTransitionEnd);
        clearSettingsShellClosing();
        onDone();
    };

    const onTransitionEnd = (event: Event) => {
        if (!(event instanceof TransitionEvent)) return;
        if (event.propertyName !== 'transform' && event.propertyName !== 'opacity') return;
        finish();
    };

    host.addEventListener('transitionend', onTransitionEnd);
    const fallbackTimer = window.setTimeout(finish, SETTINGS_SHELL_EXIT_MS + 40);
}
