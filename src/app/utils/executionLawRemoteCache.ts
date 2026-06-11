import { supabase } from '@/app/lib/supabase-client';
import { EXECUTION_LAW_CANONICAL_NAME } from '@/app/constants/iraqiLawCatalog';
import type { ExecutionLawArticle } from '@/data/executionLaws';
import { resolveExecutionLawLeaf } from '@/data/executionLawHierarchy';
import { normalizeArabicDigits } from '@/app/components/admin/lawStructure';

type LawRow = {
    id?: string;
    law_name?: string;
    article_number?: string;
    content?: string;
};

let cachedArticles: ExecutionLawArticle[] | null = null;
let inflight: Promise<ExecutionLawArticle[]> | null = null;

function extractArticleSortNumber(articleNumber: string): number | null {
    const normalized = normalizeArabicDigits(String(articleNumber ?? '').trim());
    const m = normalized.match(/\d+/);
    if (!m) return null;
    const n = Number.parseInt(m[0], 10);
    return Number.isFinite(n) ? n : null;
}

function mapRemoteRowsToExecutionArticles(rows: LawRow[]): ExecutionLawArticle[] {
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

export async function loadExecutionLawArticlesRemote(): Promise<ExecutionLawArticle[]> {
    if (cachedArticles) return cachedArticles;
    if (inflight) return inflight;

    inflight = (async () => {
        const { data, error } = await supabase.functions.invoke<{
            ok?: boolean;
            error?: string;
            details?: string;
            items?: LawRow[];
        }>('list-laws', { body: { law_name: EXECUTION_LAW_CANONICAL_NAME } });

        if (error) {
            throw new Error(error.message || 'تعذر تحميل مواد قانون التنفيذ.');
        }
        if (!data || data.ok === false) {
            throw new Error((data?.error || data?.details || 'تعذر تحميل مواد قانون التنفيذ.').trim());
        }

        const rows = Array.isArray(data.items) ? data.items : [];
        cachedArticles = mapRemoteRowsToExecutionArticles(rows);
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
}
