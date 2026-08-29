/**
 * حالة جاهزية كروم المنزل — ورقة بلا تحضير ثقيل.
 * HomeTab يستورد من هنا فقط حتى لا يدخل JPEG/المقاطع داخل lawyer-home-paint.
 */
import {
    isLawyerProfileBootWarmPending,
    subscribeLawyerProfileBootWarmPending,
} from '@/app/services/profile/profileBootWarmPending';
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

export function isHomeBootChromeReady(): boolean {
    return chromePrepared && !isLawyerProfileBootWarmPending();
}

bindHomeIdentityChromeReady(isHomeBootChromeReady);

export function subscribeHomeBootChrome(listener: () => void): () => void {
    listeners.add(listener);
    const unsubWarm = subscribeLawyerProfileBootWarmPending(listener);
    return () => {
        listeners.delete(listener);
        unsubWarm();
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
