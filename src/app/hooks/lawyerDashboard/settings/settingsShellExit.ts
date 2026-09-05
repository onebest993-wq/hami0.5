import {
    beginHubLayerExit,
    clearHubLayerClosing,
    clearHubLayerEnter,
} from '@/app/runtime/overlayHubLayerMotion';
import { SETTINGS_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';
import { isSettingsOverlayHostReactReady } from '@/app/runtime/settingsInstantPaintHostAdopt';

/** يطابق مدة CSS للإغلاق (`220ms`) و`SETTINGS_HUB_LAYER.exitMs`. */
export const SETTINGS_SHELL_EXIT_MS = SETTINGS_HUB_LAYER.exitMs ?? 220;

export function clearSettingsShellClosing(): void {
    clearHubLayerClosing(SETTINGS_HUB_LAYER);
}

/**
 * خروج الطبقة عبر نواة الـ hub المشتركة.
 * قشرة بلا شجرة React تُغلق فوراً — لا ننتظر تلاشياً على Host فارغ (keepAlive).
 */
export function beginSettingsShellExit(onDone: () => void): void {
    if (typeof document === 'undefined') {
        onDone();
        return;
    }
    const host = document.querySelector(SETTINGS_HUB_LAYER.layerSelector);
    if (!(host instanceof HTMLElement) || !isSettingsOverlayHostReactReady(host)) {
        clearHubLayerEnter(SETTINGS_HUB_LAYER);
        clearHubLayerClosing(SETTINGS_HUB_LAYER);
        onDone();
        return;
    }
    beginHubLayerExit(SETTINGS_HUB_LAYER, onDone);
}
