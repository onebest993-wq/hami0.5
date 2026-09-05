import {
    SETTINGS_INSTANT_CHROME,
    SETTINGS_OVERLAY_HOST_CLASS,
    SETTINGS_OVERLAY_HOST_SELECTOR,
    SETTINGS_OVERLAY_REACT_READY_SELECTOR,
    SETTINGS_OVERLAY_SECTION_INTERACTIVE_SELECTOR,
} from './settingsInstantPaintConstants';

export function isLaidOutSettingsInteractive(el: HTMLElement): boolean {
    const height = el.getBoundingClientRect().height;
    if (height >= 44) return true;
    return height === 0 && Boolean(import.meta.env.VITEST);
}

export function isSettingsOverlayHostReactReady(host?: Element | null): boolean {
    if (!(host instanceof HTMLElement)) return false;
    return Boolean(host.querySelector(SETTINGS_OVERLAY_REACT_READY_SELECTOR));
}

export function isSettingsOverlayHostSectionInteractive(host?: Element | null): boolean {
    if (!isSettingsOverlayHostReactReady(host) || !(host instanceof HTMLElement)) return false;
    const interactive = host.querySelector(SETTINGS_OVERLAY_SECTION_INTERACTIVE_SELECTOR);
    if (!(interactive instanceof HTMLElement)) return false;
    const frame = interactive.closest('.hami-settings-section-frame');
    if (!(frame instanceof HTMLElement)) return false;
    const wrap = Array.from(frame.children).find((child) => child.contains(interactive));
    if (!(wrap instanceof HTMLElement)) return false;
    if (wrap.querySelector('[data-settings-section-cover="1"], [aria-busy="true"]')) return false;
    return isLaidOutSettingsInteractive(interactive);
}

export function resolveSettingsOverlayHostNode(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const host = document.querySelector(SETTINGS_OVERLAY_HOST_SELECTOR);
    return host instanceof HTMLElement ? host : null;
}

export function syncSettingsOverlayHostAppearance(
    host: HTMLElement,
    opts: { layerOpen: boolean; keepAlive: boolean },
): void {
    host.className = [
        SETTINGS_OVERLAY_HOST_CLASS,
        opts.keepAlive ? 'hami-settings-overlay-layer--warm' : '',
        opts.layerOpen ? 'hami-settings-overlay-layer--visible' : '',
    ]
        .filter(Boolean)
        .join(' ');
    host.style.backgroundColor = SETTINGS_INSTANT_CHROME;
    if (opts.layerOpen) {
        host.setAttribute('data-hami-overlay-safe', '1');
        host.removeAttribute('aria-hidden');
        host.removeAttribute('inert');
    } else {
        host.removeAttribute('data-hami-overlay-safe');
        host.setAttribute('aria-hidden', 'true');
        host.setAttribute('inert', '');
    }
}

/** عقدة overlay واحدة — قشرة الطلاء تُركَّب داخلها، Host يتبناها كحاوية portal */
export function adoptSettingsOverlayHostNode(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const existing = resolveSettingsOverlayHostNode();
    if (existing) return existing;
    const host = document.createElement('div');
    host.setAttribute('data-testid', 'hami-settings-overlay-host');
    host.setAttribute('data-settings-instant-stub', '1');
    /* إنشاء العقدة ≠ كشف الطبقة — keepAlive المغلق لا يظهر المركز */
    syncSettingsOverlayHostAppearance(host, { layerOpen: false, keepAlive: false });
    document.body.appendChild(host);
    return host;
}

export function markSettingsOverlayHostReactOwned(host: HTMLElement): void {
    host.removeAttribute('data-settings-instant-stub');
}
