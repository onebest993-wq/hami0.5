/**
 * تحميل كسول لمواد قانون التنفيذ 45 — خارج مسار فتح الإضبارة.
 */
import { resolveExecutionLawLeaf } from './executionLawHierarchy';
import type { ExecutionLawArticle } from './executionLaws';
import { executionArticles } from './executionLawsSeeds';

type ExecutionLawSeedOverride = {
    number: number;
    title: string;
    text: string;
};

const executionLawSeedOverrides = new Map<number, ExecutionLawSeedOverride>(
    [...executionArticles].map((a) => [a.number, a as ExecutionLawSeedOverride]),
);

let cachedSeedData: ExecutionLawArticle[] | null = null;
let inflightSeed: Promise<ExecutionLawArticle[]> | null = null;

function mapArticlesJson(
    executionLawArticles: Array<{ number: number; title?: string; content?: string }>,
): ExecutionLawArticle[] {
    return executionLawArticles.map((a) => {
        const override = executionLawSeedOverrides.get(a.number);
        const leaf = resolveExecutionLawLeaf(a.number);
        return {
            number: a.number,
            title: override?.title ?? String(a.title || ''),
            content: override?.text ?? String(a.content || ''),
            parentId: leaf.parentId,
            leafId: leaf.id,
            leafLabel: leaf.label,
        };
    });
}

/** مواد قانون التنفيذ من ملف JSON — chunk مستقل عند أول طلب */
export async function loadExecutionLawSeedData(): Promise<ExecutionLawArticle[]> {
    if (cachedSeedData) return cachedSeedData;
    if (inflightSeed) return inflightSeed;

    inflightSeed = (async () => {
        const mod = await import('./executionLaws.articles.json');
        const raw = (mod.default ?? mod) as Array<{ number: number; title?: string; content?: string }>;
        cachedSeedData = mapArticlesJson(Array.isArray(raw) ? raw : []);
        return cachedSeedData;
    })();

    try {
        return await inflightSeed;
    } finally {
        inflightSeed = null;
    }
}

export function prefetchExecutionLawSeedData(): void {
    void loadExecutionLawSeedData().catch(() => {});
}

/** للاختبارات */
export function resetExecutionLawSeedCacheForTests(): void {
    cachedSeedData = null;
    inflightSeed = null;
}
