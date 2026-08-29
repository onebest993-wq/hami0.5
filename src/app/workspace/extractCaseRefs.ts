import { normalizeArabicSearch } from '@/app/services/search/normalizeArabicSearch';

/** استخراج أرقام قضايا من نص عربي/مختلط — دون لمس schemas الأقسام */
const CASE_REF_PATTERN = /\d{4}\s*\/\s*[^\s/—–-]+(?:\s*\/\s*[\d/]+)?/g;

export function normalizeCaseKey(value: string): string {
    return normalizeArabicSearch(value)
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[—–\-]/g, '/');
}

export function extractCaseRefsFromText(...parts: (string | undefined | null)[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const part of parts) {
        if (!part) continue;
        const matches = String(part).match(CASE_REF_PATTERN);
        if (!matches) continue;
        for (const m of matches) {
            const key = normalizeCaseKey(m);
            if (key.length < 5 || seen.has(key)) continue;
            seen.add(key);
            out.push(m.trim());
        }
    }
    return out;
}

export function effectiveCaseNumber(caseNumber: string, title: string, ...more: string[]): string {
    const direct = caseNumber.trim();
    if (direct) return direct;
    const refs = extractCaseRefsFromText(title, ...more);
    return refs[0] ?? '';
}
