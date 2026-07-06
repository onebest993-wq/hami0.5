/** أقل مدة عرض لكلمة حامي قبل بدء الخروج */
export const BOOT_REVEAL_MIN_MS = 650;

/** مدة أنيميشن الخروج (ms) — يجب أن تطابق CSS */
export const BOOT_EXIT_MS = 320;

/** أقصى انتظار قبل إجبار الكشف (حماية من التعليق) */
export const BOOT_REVEAL_MAX_MS = 14_000;

export const BOOT_CONTENT_READY_EVENT = 'hami:boot-content-ready';

/** يُستدعى عند جاهزية هيكل اللوحة (بعد paint) */
export function notifyBootContentReady(): void {
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            window.dispatchEvent(new Event(BOOT_CONTENT_READY_EVENT));
        });
    });
}
