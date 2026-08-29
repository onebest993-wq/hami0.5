import { dispatchNativeBack } from '@/app/runtime/nativeBackStack';
import { isAndroidNativeShell } from '@/app/runtime/nativePlatform';

export const OVERLAY_EDGE_GESTURE_PX = 28;
const THRESHOLD_PX = 72;
const MAX_VERTICAL_PX = 56;

export function isOverlayInlineStartEdge(
    clientX: number,
    viewportWidth: number,
    rtl: boolean,
    edgePx = OVERLAY_EDGE_GESTURE_PX,
): boolean {
    if (viewportWidth <= 0) return false;
    return rtl ? clientX >= viewportWidth - edgePx : clientX <= edgePx;
}

const OVERLAY_OPEN_ATTRS = [
    'data-hami-tasks-manager-open',
    'data-hami-field-tasks-open',
    'data-hami-forum-open',
    'data-hami-repository-open',
    'data-hami-transactions-open',
    'data-hami-settings-open',
    'data-hami-global-search-open',
    'data-hami-notifications-open',
    'data-hami-feature-open',
    'data-hami-profile-open',
    'data-hami-schedule-open',
] as const;

let wired = false;

export function isHamiFullOverlayOpen(): boolean {
    if (typeof document === 'undefined') return false;
    const root = document.documentElement;
    if (OVERLAY_OPEN_ATTRS.some((attr) => root.getAttribute(attr) === '1')) return true;
    return Boolean(document.querySelector('[data-hami-overlay-safe="1"]'));
}

function isRtlDocument(): boolean {
    if (typeof document === 'undefined') return true;
    const dir = document.documentElement.getAttribute('dir') || document.dir;
    return dir !== 'ltr';
}

/**
 * إيماءة رجوع من حافة الشاشة لطبقات ملء الشاشة.
 * أندرويد يعتمد زر/إيماءة النظام عبر Capacitor backButton — لا نضاعفها هنا.
 */
export function wireOverlayEdgeBackGesture(): void {
    if (typeof window === 'undefined' || wired) return;
    wired = true;
    if (isAndroidNativeShell()) return;

    let tracking = false;
    let startX = 0;
    let startY = 0;
    let fromInlineStart = false;

    const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (!isHamiFullOverlayOpen()) return;
        const width = window.innerWidth || 0;
        if (width <= 0) return;
        const rtl = isRtlDocument();
        const x = event.clientX;
        fromInlineStart = isOverlayInlineStartEdge(x, width, rtl);
        if (!fromInlineStart) return;
        tracking = true;
        startX = x;
        startY = event.clientY;
    };

    const finish = (event: PointerEvent) => {
        if (!tracking) return;
        tracking = false;
        if (!isHamiFullOverlayOpen()) return;
        const dy = Math.abs(event.clientY - startY);
        if (dy > MAX_VERTICAL_PX) return;
        const rtl = isRtlDocument();
        const traveled = rtl ? startX - event.clientX : event.clientX - startX;
        if (traveled < THRESHOLD_PX) return;
        if (dispatchNativeBack()) {
            event.preventDefault();
        }
    };

    window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    window.addEventListener('pointerup', finish, { capture: true });
    window.addEventListener('pointercancel', () => {
        tracking = false;
    });
}

export function resetOverlayEdgeBackGestureForTests(): void {
    wired = false;
}
