/**
 * ورقة طباعة الإقلاع — بلا اعتماد على settings/apply أو SecureStore.
 * bootStaticShell يستورد من هنا فقط حتى لا تُغلق دورة boot-runtime ↔ home-paint.
 */
import { isBootTypographyLocked } from '@/app/bootstrap/bootTypographyLock';

const FONT_LAYOUT_BASE_PX = 16;

function resolveUserFontScale(fontSizePx: number): number {
    const px = Number.isFinite(fontSizePx) ? fontSizePx : FONT_LAYOUT_BASE_PX;
    return Number((px / FONT_LAYOUT_BASE_PX).toFixed(3));
}

/** يُستدعى تحت الغطاء قبل الإزالة — ثم بعد رفع القفل إن بقي معلّقاً */
export function flushPendingBootTypography(
    root: HTMLElement = document.documentElement,
    options?: { ignoreLock?: boolean },
): void {
    if (typeof document === 'undefined') return;
    if (!options?.ignoreLock && isBootTypographyLocked(root)) return;
    const pending = root.dataset.hamiPendingFontPx;
    if (!pending) return;
    const px = Number(pending);
    if (!Number.isFinite(px)) {
        delete root.dataset.hamiPendingFontPx;
        return;
    }
    root.style.setProperty('--hami-font-size', `${px}px`);
    root.style.setProperty('--hami-user-font-scale', String(resolveUserFontScale(px)));
    delete root.dataset.hamiPendingFontPx;
}

export { resolveUserFontScale, FONT_LAYOUT_BASE_PX };
