function safeStr(v: unknown): string {
    return typeof v === 'string' ? v.trim() : '';
}

function partyName(p: unknown): string {
    if (!p || typeof p !== 'object') return '';
    return safeStr((p as { name?: string }).name);
}

function partiesFromArray(arr: unknown, preferClient: boolean): string {
    if (!Array.isArray(arr)) return '';
    if (preferClient) {
        const clientRow = arr.find(
            (p) => p && typeof p === 'object' && (p as { isClient?: boolean }).isClient,
        );
        const fromClient = partyName(clientRow);
        if (fromClient) return fromClient;
    }
    for (const p of arr) {
        const n = partyName(p);
        if (n) return n;
    }
    return '';
}

/** موكل الإضبارة التنفيذية — من creditors/debtors حسب representedParty */
export function extractExecutionClientName(f: Record<string, unknown>): string {
    const represented = safeStr(f.representedParty);
    const creditors = Array.isArray(f.creditors) ? f.creditors : [];
    const debtors = Array.isArray(f.debtors) ? f.debtors : [];
    const pool = represented === 'debtor' ? debtors : creditors;
    const fromPool = partiesFromArray(pool, true);
    if (fromPool) return fromPool;

    const credObj = f.creditor;
    if (credObj && typeof credObj === 'object') {
        const n = partyName(credObj);
        if (n) return n;
    }
    const debObj = f.debtor;
    if (debObj && typeof debObj === 'object') {
        const n = partyName(debObj);
        if (n) return n;
    }

    return safeStr(f.creditor) || safeStr(f.clientName) || partiesFromArray(debtors, false);
}
