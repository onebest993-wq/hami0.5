
export function parseMoneyInput(raw: string): number {
    const normalizeDigits = (s: string) =>
        s
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const normalized = normalizeDigits(String(raw || '')).replace(/\u066B/g, '.');
    const cleaned = normalized.replace(/[^0-9.]/g, '');
    return Math.max(0, Math.round(parseFloat(cleaned) || 0));
}

export function roundStoredMoney(n: unknown): number {
    const v = Math.round(Number(n) || 0);
    return Number.isFinite(v) && v > 0 ? v : 0;
}
