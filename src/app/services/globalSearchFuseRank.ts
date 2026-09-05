import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { PERFORMANCE } from '@/app/utils/constants';
import { normalizeArabicSearch } from '@/app/services/search/normalizeArabicSearch';

function lifecyclePenalty(lifecycle: GlobalSearchEntry['lifecycle']): number {
    if (lifecycle === 'active') return 0;
    if (lifecycle === 'archived') return 0.045;
    return 0.09;
}

function significantTokens(normalizedQuery: string): string[] {
    return normalizedQuery
        .split(/\s+/u)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 || /\d/u.test(t));
}

function fieldContainsAll(hay: string, tokens: string[]): boolean {
    return tokens.every((t) => hay.includes(t));
}

/**
 * ترتيب وفلترة نتائج Fuse:
 * - كل رمز مهم يجب أن يظهر (دقة)
 * - تعزيز التطابق التام/البادئة في العنوان وأرقام الإضبارة
 * - تقليل أولوية السلة/الأرشيف قليلاً دون إخفائهما
 */
export function rankGlobalSearchHits(
    query: string,
    fuseHits: Array<{ item: GlobalSearchEntry; score?: number }>,
    limit = PERFORMANCE.MAX_SEARCH_RESULTS,
): GlobalSearchEntry[] {
    const nq = normalizeArabicSearch(query).toLowerCase().trim();
    if (!nq) return [];
    const tokens = significantTokens(nq);
    if (!tokens.length && nq.length < PERFORMANCE.MIN_SEARCH_LENGTH) return [];

    const required = tokens.length ? tokens : [nq];
    const hasDigits = /\d/u.test(nq);

    const ranked = fuseHits
        .map((hit) => {
            const item = hit.item;
            const hay = item._searchStr || '';
            const titleN = normalizeArabicSearch(item.title).toLowerCase();
            const subtitleN = normalizeArabicSearch(item.subtitle || '').toLowerCase();
            const snippetN = normalizeArabicSearch(item.snippet || '').toLowerCase();
            const blob = `${hay} ${titleN} ${subtitleN} ${snippetN}`;

            if (!fieldContainsAll(blob, required)) return null;

            let rank = hit.score ?? 0.45;

            if (titleN === nq) rank -= 0.55;
            else if (titleN.startsWith(nq) || nq.startsWith(titleN)) rank -= 0.4;
            else if (titleN.includes(nq)) rank -= 0.32;
            else if (fieldContainsAll(titleN, required)) rank -= 0.2;
            else if (fieldContainsAll(subtitleN, required)) rank -= 0.1;
            else if (hasDigits && (titleN.includes(nq) || hay.includes(nq))) rank -= 0.28;

            if (hasDigits && titleN.includes(nq.replace(/\s+/gu, ''))) rank -= 0.08;

            rank += lifecyclePenalty(item.lifecycle);
            return { item, rank };
        })
        .filter((x): x is { item: GlobalSearchEntry; rank: number } => Boolean(x))
        .sort((a, b) => a.rank - b.rank);

    const seen = new Set<string>();
    const out: GlobalSearchEntry[] = [];
    for (const row of ranked) {
        if (seen.has(row.item.id)) continue;
        seen.add(row.item.id);
        out.push(row.item);
        if (out.length >= limit) break;
    }
    return out;
}

/** مسح تطابق نصّي مباشر — شبكة أمان عندما يفوّت Fuse تطابقاً واضحاً. */
export function exactScanGlobalSearchHits(
    query: string,
    entries: readonly GlobalSearchEntry[],
    limit = PERFORMANCE.MAX_SEARCH_RESULTS,
): GlobalSearchEntry[] {
    const nq = normalizeArabicSearch(query).toLowerCase().trim();
    if (!nq) return [];
    const tokens = significantTokens(nq);
    const required = tokens.length ? tokens : [nq];
    if (!required.length) return [];

    const hits = entries
        .map((item) => {
            const hay = item._searchStr || '';
            const titleN = normalizeArabicSearch(item.title).toLowerCase();
            const subtitleN = normalizeArabicSearch(item.subtitle || '').toLowerCase();
            const blob = `${hay} ${titleN} ${subtitleN}`;
            if (!fieldContainsAll(blob, required)) return null;
            let rank = 0.35;
            if (titleN === nq) rank = 0;
            else if (titleN.includes(nq)) rank = 0.08;
            else if (fieldContainsAll(titleN, required)) rank = 0.15;
            rank += lifecyclePenalty(item.lifecycle);
            return { item, rank };
        })
        .filter((x): x is { item: GlobalSearchEntry; rank: number } => Boolean(x))
        .sort((a, b) => a.rank - b.rank);

    const out: GlobalSearchEntry[] = [];
    const seen = new Set<string>();
    for (const row of hits) {
        if (seen.has(row.item.id)) continue;
        seen.add(row.item.id);
        out.push(row.item);
        if (out.length >= limit) break;
    }
    return out;
}

/** يدمج نتائج Fuse مع مسح مباشر عند نقص النتائج الواضحة */
export function mergeSearchHitLists(
    primary: GlobalSearchEntry[],
    fallback: GlobalSearchEntry[],
    limit = PERFORMANCE.MAX_SEARCH_RESULTS,
): GlobalSearchEntry[] {
    const seen = new Set(primary.map((e) => e.id));
    const out = [...primary];
    for (const e of fallback) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        out.push(e);
        if (out.length >= limit) break;
    }
    return out;
}
