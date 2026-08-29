const BELL_SELECTOR = '[data-testid="header-notifications-trigger"]';

/** يمنع إعادة فتح الإشعارات بنقرة شبحية بعد الإغلاق (pointerdown يغلق → click يفتح). */
export const NOTIFICATION_REOPEN_SUPPRESS_MS = 90;

let reopenSuppressedUntil = 0;
let reopenSuppressCleanup: (() => void) | null = null;

function clearReopenSuppressListeners(): void {
    if (!reopenSuppressCleanup) return;
    reopenSuppressCleanup();
    reopenSuppressCleanup = null;
}

export function isNotificationReopenSuppressed(): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return now < reopenSuppressedUntil;
}

export function suppressNotificationReopen(ms: number = NOTIFICATION_REOPEN_SUPPRESS_MS): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const duration = Math.max(0, ms);
    reopenSuppressedUntil = now + duration;
    clearReopenSuppressListeners();

    if (typeof window === 'undefined' || duration <= 0) return;

    const clear = () => {
        reopenSuppressedUntil = 0;
        clearReopenSuppressListeners();
    };

    const swallowBellGhost = (event: Event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (!target.closest(BELL_SELECTOR)) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
        clear();
    };

    window.addEventListener('pointerdown', swallowBellGhost, true);
    window.addEventListener('click', swallowBellGhost, true);
    const fallbackTimer = window.setTimeout(clear, duration);

    reopenSuppressCleanup = () => {
        if (typeof window === 'undefined') return;
        try {
            window.removeEventListener('pointerdown', swallowBellGhost, true);
            window.removeEventListener('click', swallowBellGhost, true);
            window.clearTimeout(fallbackTimer);
        } catch {
            /* بيئة الاختبار قد تُفكّ بعد انتهاء الملف */
        }
    };
}

export function resetNotificationReopenGuardForTests(): void {
    reopenSuppressedUntil = 0;
    clearReopenSuppressListeners();
}
