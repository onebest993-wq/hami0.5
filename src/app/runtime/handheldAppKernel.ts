/**
 * نواة المنتج: حامٍ تطبيق يد (هاتف/لوحي) لا سطح مكتب يُكيَّف لاحقاً.
 * يُختَم على html من أول بايت (hami-boot.js) ويُعاد من applyCapacitorShellBoot.
 */

type HamiDeviceFormFactor = 'phone' | 'tablet';

const TABLET_SHORTEST_SIDE_PX = 600;

export function resolveHamiDeviceFormFactor(
    width = typeof window === 'undefined' ? 0 : window.innerWidth,
    height = typeof window === 'undefined' ? 0 : window.innerHeight,
): HamiDeviceFormFactor {
    const shortest = Math.min(width, height);
    return shortest >= TABLET_SHORTEST_SIDE_PX ? 'tablet' : 'phone';
}

/** هوية المنتج — true ما دام الجذر مختوماً (الافتراضي في index.html). */
export function isHandheldApp(): boolean {
    if (typeof document === 'undefined') return true;
    return document.documentElement.getAttribute('data-hami-app') === 'handheld';
}

export function getHamiDeviceFormFactor(): HamiDeviceFormFactor {
    if (typeof document === 'undefined') return 'phone';
    const raw = document.documentElement.getAttribute('data-hami-device');
    if (raw === 'tablet' || raw === 'phone') return raw;
    return resolveHamiDeviceFormFactor();
}

export function isPhoneFormFactor(): boolean {
    return getHamiDeviceFormFactor() === 'phone';
}

export function isTabletFormFactor(): boolean {
    return getHamiDeviceFormFactor() === 'tablet';
}

function stampReduceMotionIfUnset(root: HTMLElement): void {
    if (root.dataset.hamiReduceMotion === '0' || root.dataset.hamiReduceMotion === '1') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        root.dataset.hamiReduceMotion = '1';
    }
}

let orientationBound = false;

/** يختم html: data-hami-app + data-hami-device. يربط orientation مرة واحدة. */
export function applyHandheldAppKernel(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-hami-app', 'handheld');
    root.setAttribute('data-hami-device', resolveHamiDeviceFormFactor());
    stampReduceMotionIfUnset(root);
    if (typeof window === 'undefined' || orientationBound) return;
    orientationBound = true;
    window.addEventListener('orientationchange', () => applyHandheldAppKernel(), { passive: true });
}

export function resetHandheldAppKernelBindForTests(): void {
    orientationBound = false;
}
