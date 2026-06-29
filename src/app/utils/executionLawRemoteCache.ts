import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { EXECUTION_LAW_CANONICAL_NAME } from '@/app/constants/iraqiLawCatalog';
import type { ExecutionLawArticle } from '@/data/executionLaws';
import { loadExecutionLawSeedData, prefetchExecutionLawSeedData } from '@/data/executionLawsLoader';
import { resolveExecutionLawLeaf } from '@/data/executionLawHierarchy';
import { normalizeArabicDigits } from '@/app/components/admin/lawStructure';
import { mergeLocalTitlesIntoExecutionArticles } from '@/app/utils/executionLawArticleUtils';
import { loadBundledLawRows } from '@/app/utils/bundledIraqiLawLoader';

export const EXECUTION_LAW_CACHE_INVALIDATED_EVENT = 'hami-execution-law-cache-invalidated';

type LawRow = {
    id?: string;
    law_name?: string;
    article_number?: string;
    content?: string;
};

let cachedArticles: ExecutionLawArticle[] | null = null;
let inflight: Promise<ExecutionLawArticle[]> | null = null;

export function hasExecutionLawArticlesCached(): boolean {
    return Array.isArray(cachedArticles) && cachedArticles.length > 0;
}

/** تحميل مسبق عند hover على tile المرجع — يشمل JSON المحلي */
export function prefetchExecutionLawArticlesRemote(): void {
    prefetchExecutionLawSeedData();
    void loadExecutionLawArticlesRemote().catch(() => {});
}

function extractArticleSortNumber(articleNumber: string): number | null {
    const normalized = normalizeArabicDigits(String(articleNumber ?? '').trim());
    const m = normalized.match(/\d+/);
    if (!m) return null;
    const n = Number.parseInt(m[0], 10);
    return Number.isFinite(n) ? n : null;
}

export function mapRemoteRowsToExecutionArticles(rows: LawRow[]): ExecutionLawArticle[] {
    const dedup = new Map<string, ExecutionLawArticle>();
    for (const row of rows) {
        const lawName = String(row?.law_name ?? '').trim();
        if (lawName !== EXECUTION_LAW_CANONICAL_NAME) continue;
        const num = extractArticleSortNumber(String(row?.article_number ?? ''));
        if (num == null) continue;
        const leaf = resolveExecutionLawLeaf(num);
        const content = String(row?.content ?? '').trim();
        const key = `${lawName}::${num}`;
        const mapped: ExecutionLawArticle = {
            number: num,
            title: '',
            content,
            parentId: leaf.parentId,
            leafId: leaf.id,
            leafLabel: leaf.label,
        };
        const prev = dedup.get(key);
        if (!prev || mapped.content.length > prev.content.length) {
            dedup.set(key, mapped);
        }
    }
    return Array.from(dedup.values()).sort((a, b) => a.number - b.number);
}

async function fetchRemoteLawRows(): Promise<LawRow[]> {
    const data = await SecureAPIClient.fetchSecure<{
        ok?: boolean;
        error?: string;
        details?: string;
        items?: LawRow[];
    }>('/api/laws/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ law_name: EXECUTION_LAW_CANONICAL_NAME }),
    });

    if (!data || data.ok === false) {
        throw new Error((data?.error || data?.details || 'تعذر تحميل مواد قانون التنفيذ.').trim());
    }
    return Array.isArray(data.items) ? data.items : [];
}

export async function loadExecutionLawArticlesRemote(): Promise<ExecutionLawArticle[]> {
    if (cachedArticles) return cachedArticles;
    if (inflight) return inflight;

    inflight = (async () => {
        const localSeed = await loadExecutionLawSeedData();

        try {
            const rows = await fetchRemoteLawRows();
            const mapped = mapRemoteRowsToExecutionArticles(rows);
            if (mapped.length > 0) {
                cachedArticles = mergeLocalTitlesIntoExecutionArticles(mapped, localSeed);
                return cachedArticles;
            }
        } catch {
            /* try bundled project file */
        }

        const bundledRows = await loadBundledLawRows(EXECUTION_LAW_CANONICAL_NAME);
        const bundledMapped = mapRemoteRowsToExecutionArticles(bundledRows);
        if (bundledMapped.length > 0) {
            cachedArticles = mergeLocalTitlesIntoExecutionArticles(bundledMapped, localSeed);
            return cachedArticles;
        }

        cachedArticles = localSeed;
        return cachedArticles;
    })();

    try {
        return await inflight;
    } finally {
        inflight = null;
    }
}

export function invalidateExecutionLawRemoteCache(): void {
    cachedArticles = null;
    inflight = null;
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EXECUTION_LAW_CACHE_INVALIDATED_EVENT));
    }
}
