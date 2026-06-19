/** أدوات مقارنة أرقام المواد — مستقلة لتجنّب التبعيات الدائرية. */

export function normalizeArabicDigits(input: string): string {
    return input
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

export function extractArticleSortNumber(articleNumber: string): number | null {
    const normalized = normalizeArabicDigits(String(articleNumber ?? '').trim());
    const m = normalized.match(/\d+/);
    if (!m) return null;
    const n = Number.parseInt(m[0], 10);
    return Number.isFinite(n) ? n : null;
}

export function articleNumberInRange(articleNumber: string, from: number, to: number): boolean {
    const n = extractArticleSortNumber(articleNumber);
    if (n === null) return false;
    return n >= from && n <= to;
}
