import {
    IRAQI_LAW_CANONICAL_NAMES,
    LAW_NAME_TO_CODE_TYPE,
    type IraqiLawCodeType,
} from '@/app/constants/iraqiLawCatalog';

export type LegalCodeType = IraqiLawCodeType;

export {
    IRAQI_LAW_CANONICAL_NAMES as CODE_TYPE_TO_LAW_NAME,
    LAW_NAME_TO_CODE_TYPE,
};

export type LegalCodeArticle = {
    id: string;
    codeType: LegalCodeType;
    articleNumber: string;
    text: string;
    lawName?: string;
};

export const LEGAL_CODES_PINNED_IDS_KEY = 'hami_legal_codes_pinned_article_ids';

export const LEGAL_ARTICLES_PAGE_SIZE = 12;

export function normalizeArabicDigits(input: string): string {
    return input
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

export function extractArticleSortNumber(articleNumber: string): number {
    const normalized = normalizeArabicDigits(String(articleNumber ?? '').trim());
    const m = normalized.match(/\d+/);
    if (!m) return Number.MAX_SAFE_INTEGER;
    const n = Number.parseInt(m[0], 10);
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

export function formatLegalArticleTitle(articleNumber: string): string {
    const normalized = normalizeArabicDigits(String(articleNumber ?? '').trim());
    const m = normalized.match(/\d+/);
    if (m) return `المادة ${m[0]}`;
    const stripped = normalized.replace(/^المادة\s*/u, '').trim();
    return stripped ? `المادة ${stripped}` : 'المادة —';
}

function mapAndDedupLawRows(
    rows: Array<{
        id?: string;
        law_name?: string;
        article_number?: string;
        content?: string;
    }>,
    codeType: LegalCodeType,
): LegalCodeArticle[] {
    const mappedRaw: LegalCodeArticle[] = rows
        .map((row): LegalCodeArticle | null => {
            const lawName = String(row?.law_name ?? '').trim();
            const rowType = LAW_NAME_TO_CODE_TYPE[lawName];
            if (rowType !== codeType) return null;
            return {
                id: String(row?.id ?? `${lawName}-${row?.article_number ?? ''}`),
                codeType,
                articleNumber: String(row?.article_number ?? '').trim() || '—',
                text: String(row?.content ?? '').trim() || '—',
                lawName,
            };
        })
        .filter((x): x is LegalCodeArticle => Boolean(x));
    const dedup = new Map<string, LegalCodeArticle>();
    for (const item of mappedRaw) {
        const key = `${item.codeType}::${normalizeArabicDigits(String(item.articleNumber).trim())}`;
        const prev = dedup.get(key);
        if (!prev || String(item.text).length > String(prev.text).length) {
            dedup.set(key, item);
        }
    }
    return Array.from(dedup.values());
}

export { mapAndDedupLawRows };
