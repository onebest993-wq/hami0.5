/** Pick scope bag keys from a hook return or binding object */
export function scopeBagPick<T extends Record<string, unknown> | undefined>(
    source: T,
    keys: readonly string[],
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (!source) return out;
    for (const key of keys) {
        if (key in source) out[key] = source[key];
    }
    return out;
}

export function scopeBagBindingFragment<T>(binding: T, key: string): Record<string, unknown> {
    return { [key]: binding };
}
