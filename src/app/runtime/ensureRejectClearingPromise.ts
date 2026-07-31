/**
 * يخزّن وعد تحميل وحدة ديناميكية ويمسح الكاش عند الرفض
 * حتى تُعاد المحاولة بعد فشل الشبكة/الـ chunk.
 */
export function ensureRejectClearingPromise<T>(
    cached: Promise<T> | null,
    setCached: (next: Promise<T> | null) => void,
    create: () => Promise<T>,
): Promise<T> {
    if (cached) return cached;
    const next = create().catch((err) => {
        setCached(null);
        throw err;
    });
    setCached(next);
    return next;
}
