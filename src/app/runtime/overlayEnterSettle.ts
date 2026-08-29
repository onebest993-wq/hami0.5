/**
 * يثبت وضع البداية إطاراً ثم يُسكن — وإلا WebView يتخطى CSS transition
 * عندما تُفتح السمة والهدف النهائي في نفس الالتزام.
 */

const gens = new Map<string, number>();

export const OVERLAY_ENTER_SETTLE_MAX_FRAMES = 24;

function bump(attr: string): number {
    const next = (gens.get(attr) ?? 0) + 1;
    gens.set(attr, next);
    return next;
}

export function clearOverlayEnterSettle(enterAttr: string): void {
    bump(enterAttr);
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(enterAttr);
}

/**
 * @param enterAttr سمة html لوضع البداية (بلا transition)
 * @param ready عنصر الحركة — لا نُسكن قبل وجوده حتى لا يظهر المحتوى قفزاً
 */
export function armOverlayEnterSettle(enterAttr: string, ready: () => Element | null): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const token = bump(enterAttr);
    root.setAttribute(enterAttr, '1');

    const settle = () => {
        if (gens.get(enterAttr) !== token) return;
        root.removeAttribute(enterAttr);
    };

    if (typeof window === 'undefined') {
        settle();
        return;
    }

    let frames = 0;
    const tick = () => {
        if (gens.get(enterAttr) !== token) return;
        const el = ready();
        if (el instanceof HTMLElement) {
            void el.getBoundingClientRect();
            window.requestAnimationFrame(settle);
            return;
        }
        if (++frames >= OVERLAY_ENTER_SETTLE_MAX_FRAMES) {
            settle();
            return;
        }
        window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
}
