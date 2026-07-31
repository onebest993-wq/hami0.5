export function formatIqdDisplay(value: number): string {
    const n = Number.isFinite(value) ? Math.max(0, value) : 0;
    return Math.round(n).toLocaleString('en-US');
}

export function parseAmount(raw: string): number {
    const normalizeDigits = (s: string) =>
        s
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const normalized = normalizeDigits(String(raw))
        .replace(/[,\u066C\u060C\s]/g, '')
        .replace(/\u066B/g, '.');
    const n = parseFloat(normalized);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function formatNumberInput(raw: string): string {
    const normalizeDigits = (s: string) =>
        s
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const normalized = normalizeDigits(String(raw))
        .replace(/[,\u066C\u060C\s]/g, '')
        .replace(/\u066B/g, '.')
        .replace(/[^0-9.]/g, '');
    if (!normalized) return '';
    const [intPartRaw, ...rest] = normalized.split('.');
    const intPart = intPartRaw.replace(/^0+(?=\d)/, '') || '0';
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (!rest.length) return grouped;
    const decimal = rest.join('').replace(/\./g, '');
    return decimal ? `${grouped}.${decimal}` : grouped;
}
