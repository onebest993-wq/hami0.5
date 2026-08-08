import {
    BOOT_REVEAL_DONE_EVENT,
    isBootRevealDone,
    markBootRevealDone,
    notifyBootContentReady,
} from '@/app/bootstrap/bootReveal';
import { hasStaticBootShell, removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';

function finishGateBootReveal(): void {
    if (!isBootRevealDone()) {
        markBootRevealDone();
        try {
            window.dispatchEvent(new Event(BOOT_REVEAL_DONE_EVENT));
        } catch {
            /* ignore */
        }
    }
}

/**
 * بوابة تسجيل الدخول فقط — تُعلِن الجاهزية ثم تزيل الشعار بعد paint الواجهة (إطاران).
 */
export function finalizeBootGateSurface(): void {
    notifyBootContentReady();
    if (!hasStaticBootShell()) {
        finishGateBootReveal();
        return;
    }
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (hasStaticBootShell()) {
                removeStaticBootShell({ force: true, instant: true });
            }
            finishGateBootReveal();
        });
    });
}
