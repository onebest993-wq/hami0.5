/** Phase C Slice 25 — اختيار مفاتيح من runtime bag مع الحفاظ على أنواع المصدر. */
export function pickKeysFromRuntimeBag<T extends object>(bag: T, keys: readonly string[]): T {
    const out = {} as T;
    const src = bag as Record<string, unknown>;
    const dst = out as Record<string, unknown>;
    for (const k of keys) {
        if (k in bag) dst[k] = src[k];
    }
    return out;
}
