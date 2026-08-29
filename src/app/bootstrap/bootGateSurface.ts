import {
    BOOT_REVEAL_DONE_EVENT,
    markBootRevealDone,
    notifyBootContentReady,
} from '@/app/bootstrap/bootReveal';
import { announceHomeMainGridPainted } from '@/app/bootstrap/homeMainGridPaintAnnounce';
import { hasStaticBootShell, removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';

function finishGateBootReveal(): void {
    markBootRevealDone();
    try {
        window.dispatchEvent(new Event(BOOT_REVEAL_DONE_EVENT));
    } catch {
        /* ignore */
    }
}

/**
 * كشف بوابة الدخول بعد إقلاع صامت.
 * الإعلان يمر من بوابة الطلاء؛ القصّ هنا فوري بلا rAF حتى لا يتجمّد الكشف.
 */
export function finalizeBootGateSurface(): void {
    notifyBootContentReady();
    announceHomeMainGridPainted();
    if (hasStaticBootShell()) {
        removeStaticBootShell({ force: true, instant: true });
    }
    finishGateBootReveal();
}
