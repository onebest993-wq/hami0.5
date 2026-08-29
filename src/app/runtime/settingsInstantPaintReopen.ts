import { SETTINGS_GEAR_TRIGGER_SELECTOR } from './settingsInstantPaintConstants';

/**
 * حد أقصى لكبح إعادة الفتح — الضغطة المتبقية على الترس تُبتلع ثم تُرفع الكبح؛
 * المهلة احتياط إن لم يصل حدث ترس (كان 280ms فيجمّد التبديل السريع).
 */
export const SETTINGS_REOPEN_SUPPRESS_MS = 90;

let reopenSuppressedUntil = 0;
let reopenSuppressCleanup: (() => void) | null = null;

function clearReopenSuppressListeners(): void {
    if (!reopenSuppressCleanup) return;
    reopenSuppressCleanup();
    reopenSuppressCleanup = null;
}

/**
 * كبح إعادة الفتح الشبحي بعد إغلاق حقيقي —
 * يبتلع pointerdown/click المتبقي على ترس الهيدر ثم يرفع الكبح؛ مهلة ≤90ms احتياط.
 */
export function suppressSettingsReopen(ms: number = SETTINGS_REOPEN_SUPPRESS_MS): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const duration = Math.max(0, ms);
    reopenSuppressedUntil = now + duration;
    clearReopenSuppressListeners();

    if (typeof window === 'undefined' || duration <= 0) return;

    const clear = () => {
        reopenSuppressedUntil = 0;
        clearReopenSuppressListeners();
    };

    const swallowGearGhost = (event: Event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (!target.closest(SETTINGS_GEAR_TRIGGER_SELECTOR)) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
        clear();
    };

    window.addEventListener('pointerdown', swallowGearGhost, true);
    window.addEventListener('click', swallowGearGhost, true);
    const fallbackTimer = window.setTimeout(clear, duration);

    reopenSuppressCleanup = () => {
        window.removeEventListener('pointerdown', swallowGearGhost, true);
        window.removeEventListener('click', swallowGearGhost, true);
        window.clearTimeout(fallbackTimer);
    };
}

export function isSettingsReopenSuppressed(): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return now < reopenSuppressedUntil;
}

export function clearSettingsReopenSuppress(): void {
    reopenSuppressedUntil = 0;
    clearReopenSuppressListeners();
}
