// @ts-nocheck
/** Phase C Slice 25 — اختيار مفاتيح من runtime bag */
export function pickKeysFromRuntimeBag(bag: Record<string, unknown>, keys: readonly string[]) {
    const out: Record<string, unknown> = {};
    for (const k of keys) {
        if (k in bag) out[k] = bag[k];
    }
    return out;
}
