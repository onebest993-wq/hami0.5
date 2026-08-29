/** Heir merge helpers for party-death save path */
export function mergeHeirNames(existing: string[], incoming: string[]): string[] {
    const out: string[] = [];
    [...existing, ...incoming].forEach((n) => {
        const name = String(n || '').trim();
        if (!name) return;
        if (!out.some((x) => x === name)) out.push(name);
    });
    return out;
}

export function mergeHeirDetails(
    existing: Array<{ name?: string; phone?: string; address?: string; isClient?: boolean }>,
    incoming: Array<{ name?: string; phone?: string; address?: string; isClient?: boolean }>,
): Array<{ name: string; phone: string; address: string; isClient?: boolean }> {
    const map = new Map<string, { name: string; phone: string; address: string; isClient?: boolean }>();
    [...existing, ...incoming].forEach((h) => {
        const name = String(h?.name || '').trim();
        if (!name) return;
        const phone = String(h?.phone || '').trim();
        const address = String(h?.address || '').trim();
        const ic = Boolean(h?.isClient);
        const key = `${name.toLowerCase()}|${phone}`;
        const prev = map.get(key);
        if (!prev) {
            map.set(key, { name, phone, address, ...(ic ? { isClient: true } : {}) });
            return;
        }
        map.set(key, {
            name: name || prev.name,
            phone: phone || prev.phone,
            address: address || prev.address,
            isClient: Boolean(prev.isClient || ic),
        });
    });
    return [...map.values()];
}
