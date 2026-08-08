/**
 * تحميل كسول لمواد قانون التنفيذ 45 — من static-law-data (خارج حزمة JS).
 */
import { lawNameForBundleSlug } from '@/app/constants/iraqiLawBundleRegistry';
import { loadBundledLawArticles } from '@/app/utils/bundledIraqiLawLoader';
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

/** مواد قانون التنفيذ من /static-law-data — لا dynamic import لـ JSON داخل assets */
export async function loadExecutionLawSeedData(): Promise<ExecutionLawArticle[]> {
    if (cachedSeedData) return cachedSeedData;
    if (inflightSeed) return inflightSeed;

    inflightSeed = (async () => {
        const bundled = await loadBundledLawArticles(lawNameForBundleSlug('execution'));
        const mapped = bundled
            .map((article) => {
                const number = Number.parseInt(String(article.article_number ?? '').trim(), 10);
                if (!Number.isFinite(number) || number <= 0) return null;
                return {
                    number,
                    title: '',
                    content: String(article.content ?? ''),
                };
            })
            .filter((item): item is { number: number; title: string; content: string } => item !== null);
        cachedSeedData = mapArticlesJson(mapped);
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
