/** إغلاق نافذة من نطاق `Record<string, unknown>` — close الصريح أو setter. */
export function closeUnknownScope(
    s: Record<string, unknown>,
    closeKey: string,
    setKey?: string,
): () => void {
    return () => {
        const close = s[closeKey];
        if (typeof close === 'function') {
            (close as () => void)();
            return;
        }
        if (!setKey) return;
        const set = s[setKey];
        if (typeof set === 'function') {
            (set as (v: boolean) => void)(false);
        }
    };
}
