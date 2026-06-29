export function pickCollapsedItems<T>(items: T[], limit: number, expanded: boolean, ensureItem?: T): T[] {
    if (expanded || items.length <= limit) return items;
    const head = items.slice(0, limit);
    if (ensureItem && !head.includes(ensureItem)) {
        return [...head.slice(0, limit - 1), ensureItem];
    }
    return head;
}
