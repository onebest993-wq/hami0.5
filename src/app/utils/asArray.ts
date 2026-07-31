/** يحوّل قيمة تخزين فاسدة (كائن/نص/…) إلى مصفوفة — `?? []` و `|| []` لا يكفيان */
export function asArray<T = unknown>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

export function asRecord<T extends Record<string, unknown> = Record<string, unknown>>(
    value: unknown,
): T {
    return value != null && typeof value === 'object' && !Array.isArray(value)
        ? (value as T)
        : ({} as T);
}
