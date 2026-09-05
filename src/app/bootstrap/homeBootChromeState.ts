/**
 * حالة جاهزية كروم المنزل — ورقة بلا تحضير ثقيل.
 * HomeTab يستورد من هنا فقط حتى لا يدخل JPEG/المقاطع داخل lawyer-home-paint.
 */
import {
    bindHomeIdentityChromeReady,
    isHomeGridRevealReady,
} from '@/app/bootstrap/homeMainGridPaintAnnounce';

export { isHomeGridRevealReady };

let chromePrepared = false;
const listeners = new Set<() => void>();

function emitHomeBootChrome(): void {
    for (const listener of listeners) listener();
}

export function isHomeBootChromePrepared(): boolean {
    return chromePrepared;
}

/** شبكة المنزل جاهزة للكشف — فك الملف يُغني الاسم بعد الظهور، لا يحجب الغطاء. */
export function isHomeBootChromeReady(): boolean {
    return chromePrepared;
}

bindHomeIdentityChromeReady(isHomeBootChromeReady);

export function subscribeHomeBootChrome(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function markHomeBootChromePrepared(): void {
    chromePrepared = true;
    emitHomeBootChrome();
}

export function markHomeBootChromeReadyForTests(): void {
    chromePrepared = true;
    emitHomeBootChrome();
}

export function resetHomeBootChromeForTests(): void {
    chromePrepared = false;
    listeners.clear();
}
