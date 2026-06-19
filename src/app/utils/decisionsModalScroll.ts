/** تمرير لبطاقة بعد تحميل lazy والقرارات من التخزين — يعيد المحاولة حتى يظهر العنصر */
export function scrollToDomIdWhenReady(
    elementId: string,
    onDone?: () => void,
    options?: { maxAttempts?: number; intervalMs?: number }
): () => void {
    const maxAttempts = options?.maxAttempts ?? 30;
    const intervalMs = options?.intervalMs ?? 80;
    let attempts = 0;
    let timer = 0;

    const finish = () => {
        onDone?.();
    };

    const tryScroll = () => {
        const el = document.getElementById(elementId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            finish();
            return;
        }
        attempts += 1;
        if (attempts >= maxAttempts) {
            finish();
            return;
        }
        timer = window.setTimeout(tryScroll, intervalMs);
    };

    timer = window.setTimeout(tryScroll, intervalMs);
    return () => window.clearTimeout(timer);
}

/** يمرّر لأول عنصر موجود من قائمة معرّفات — لبطاقات سجل الطعون المختلطة */
export function scrollToAnyDomIdWhenReady(
    elementIds: string[],
    onDone?: () => void,
    options?: { maxAttempts?: number; intervalMs?: number }
): () => void {
    const maxAttempts = options?.maxAttempts ?? 30;
    const intervalMs = options?.intervalMs ?? 80;
    let attempts = 0;
    let timer = 0;

    const finish = () => {
        onDone?.();
    };

    const tryScroll = () => {
        for (const elementId of elementIds) {
            const el = document.getElementById(elementId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                finish();
                return;
            }
        }
        attempts += 1;
        if (attempts >= maxAttempts) {
            finish();
            return;
        }
        timer = window.setTimeout(tryScroll, intervalMs);
    };

    timer = window.setTimeout(tryScroll, intervalMs);
    return () => window.clearTimeout(timer);
}
