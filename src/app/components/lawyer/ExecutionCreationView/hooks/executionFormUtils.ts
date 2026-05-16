export const FINANCIAL_CLAIM_TYPES_PARTY_SPLIT = new Set([
    'استحصال دين مالي',
    'استخلاص دين مالي',
    'مهر مؤجل',
    'حجة زواج - مهر معجل',
    'حجة زواج - مهر مؤجل',
    'حجة وصية',
    'حجة تخارج',
    'حجة مخالعة',
    'حجة إقرار بدين',
    'نفقة عدة',
    'تعويض عن طلاق تعسفي',
    'استيفاء دين من بيع عقار',
    'نفقة',
    'أثاث زوجية',
    'حجة نفقة اتفاقية',
]);

export function isFinancialClaimForPartySplit(claimType: string): boolean {
    const ct = String(claimType || '').trim();
    return Boolean(ct && FINANCIAL_CLAIM_TYPES_PARTY_SPLIT.has(ct));
}

export function parseMoneyInput(raw: string): number {
    const normalizeDigits = (s: string) =>
        s
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const normalized = normalizeDigits(String(raw || '')).replace(/\u066B/g, '.');
    const cleaned = normalized.replace(/[^0-9.]/g, '');
    return Math.max(0, Math.round(parseFloat(cleaned) || 0));
}

export function splitAmountEqually(total: number, parts: number): number[] {
    if (parts <= 0) return [];
    const t = Math.max(0, Math.round(total));
    if (t === 0) return Array(parts).fill(0);
    const base = Math.floor(t / parts);
    let rem = t - base * parts;
    const out = Array(parts).fill(base);
    for (let i = 0; i < rem; i++) out[i] += 1;
    return out;
}
