/** كشف/إخفاء الملف المهني فوراً في الـ DOM — مستقل عن إطار React */

import {
    snapProfileShellClose,
    snapProfileShellOpen,
} from '@/app/services/profile/profileShellSnap';
import { markProfilePerfPhase } from '@/app/services/profile/profilePerfMetrics';

const SURFACE_SELECTOR = '[data-testid="lawyer-dashboard-profile-surface"]';

let forceVisible = false;

export function isProfileForceVisible(): boolean {
    return forceVisible;
}

export function clearProfileForceVisible(): void {
    forceVisible = false;
}

function resolveSurface(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const surface = document.querySelector(SURFACE_SELECTOR);
    return surface instanceof HTMLElement ? surface : null;
}

function applySurfacePaint(surface: HTMLElement, visible: boolean): void {
    if (visible) {
        surface.style.setProperty('opacity', '1');
        surface.style.setProperty('visibility', 'visible');
        surface.style.setProperty('pointer-events', 'auto');
        surface.style.setProperty('z-index', '20');
    } else {
        surface.style.removeProperty('opacity');
        surface.style.removeProperty('visibility');
        surface.style.removeProperty('pointer-events');
        surface.style.removeProperty('z-index');
    }
    void surface.offsetHeight;
}

/**
 * يكشف سطح الملف فوراً (html attr + inline paint) — قبل commit React.
 * @returns true إذا وُجد السطح في DOM (keepAlive)
 */
export function revealProfileWarmShell(): boolean {
    if (typeof document === 'undefined') return false;
    const surface = resolveSurface();
    if (!surface) return false;

    forceVisible = true;
    snapProfileShellOpen();
    applySurfacePaint(surface, true);
    markProfilePerfPhase('shell-revealed');
    return true;
}

/** إخفاء فوري — يُستدعى من مسار الإغلاق قبل commit React */
export function concealProfileWarmShell(): void {
    forceVisible = false;
    snapProfileShellClose();
    const surface = resolveSurface();
    if (surface) applySurfacePaint(surface, false);
}
