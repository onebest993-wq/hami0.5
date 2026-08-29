import { SETTINGS_OVERLAY_HOST_SELECTOR } from './settingsInstantPaintConstants';

const ROOT_SELECTOR = '[data-settings-root]';

export function hasSettingsOverlayHost(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(document.querySelector(SETTINGS_OVERLAY_HOST_SELECTOR));
}

export function resolveSettingsOverlayLayer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const host = document.querySelector(SETTINGS_OVERLAY_HOST_SELECTOR);
    if (host instanceof HTMLElement) return host;
    const root = document.querySelector(ROOT_SELECTOR);
    return root instanceof HTMLElement ? root : null;
}

export function resolveConnectedSettingsOverlayLayer(
    root?: HTMLElement | null,
): HTMLElement | null {
    if (root?.isConnected) return root;
    return resolveSettingsOverlayLayer();
}
