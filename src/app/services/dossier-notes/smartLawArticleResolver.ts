import {
    CIVIL_LAW_CANONICAL_NAMES,
    EXECUTION_LAW_CANONICAL_NAME,
    IRAQI_LAW_CANONICAL_NAMES,
} from '@/app/constants/iraqiLawCatalog';
import { extractArticleSortNumber } from '@/app/components/admin/lawStructure';
import {
    loadLegalCodeArticles,
    prefetchLegalCodeArticles,
} from '@/app/components/lawyer/criminal-system/legalCodes/legalCodesDataCache';
import {
    loadCivilLawArticles,
    prefetchCivilLawArticles,
} from '@/app/utils/civilLawRemoteCache';
import {
    loadExecutionLawArticlesRemote,
    prefetchExecutionLawArticlesRemote,
} from '@/app/utils/executionLawRemoteCache';
import {
    type DossierNoteContext,
    lawLabelForId,
    type SmartLawId,
    smartLawIdToCivilTab,
    smartLawIdToCriminalTab,
} from './smartLawLinker';

export type ResolvedSmartLawArticle = {
    lawId: SmartLawId;
    articleNumber: number;
    lawLabel: string;
    title: string;
    content: string;
};

const articleTextCache = new Map<string, ResolvedSmartLawArticle | null>();

function cacheKey(lawId: SmartLawId, articleNum: number): string {
    return `${lawId}::${articleNum}`;
}

function findByArticleNumber(
    rows: Array<{ articleNumber?: string; number?: number; text?: string; content?: string; title?: string }>,
    articleNum: number,
): { text: string; title: string } | null {
    for (const row of rows) {
        if (typeof row.number === 'number' && row.number === articleNum) {
            return {
                text: String(row.content ?? row.text ?? '').trim(),
                title: String(row.title ?? '').trim(),
            };
        }
        const sort = extractArticleSortNumber(String(row.articleNumber ?? ''));
        if (sort === articleNum) {
            return {
                text: String(row.text ?? row.content ?? '').trim(),
                title: '',
            };
        }
    }
    return null;
}

export async function fetchSmartLawArticle(
    lawId: SmartLawId,
    articleNum: number,
): Promise<ResolvedSmartLawArticle | null> {
    const key = cacheKey(lawId, articleNum);
    if (articleTextCache.has(key)) return articleTextCache.get(key) ?? null;

    let resolved: ResolvedSmartLawArticle | null = null;

    try {
        if (lawId === 'execution') {
            const articles = await loadExecutionLawArticlesRemote();
            const hit = articles.find((a) => a.number === articleNum);
            if (hit?.content) {
                resolved = {
                    lawId,
                    articleNumber: articleNum,
                    lawLabel: EXECUTION_LAW_CANONICAL_NAME,
                    title: hit.title || `المادة ${articleNum}`,
                    content: hit.content,
                };
            }
        } else {
            const civilTab = smartLawIdToCivilTab(lawId);
            if (civilTab) {
                const articles = await loadCivilLawArticles(civilTab);
                const hit = findByArticleNumber(articles, articleNum);
                if (hit?.text) {
                    resolved = {
                        lawId,
                        articleNumber: articleNum,
                        lawLabel: CIVIL_LAW_CANONICAL_NAMES[civilTab],
                        title: hit.title || `المادة ${articleNum}`,
                        content: hit.text,
                    };
                }
            } else {
                const criminalTab = smartLawIdToCriminalTab(lawId);
                if (criminalTab) {
                    const articles = await loadLegalCodeArticles(criminalTab);
                    const hit = findByArticleNumber(articles, articleNum);
                    if (hit?.text) {
                        resolved = {
                            lawId,
                            articleNumber: articleNum,
                            lawLabel: IRAQI_LAW_CANONICAL_NAMES[criminalTab],
                            title: hit.title || `المادة ${articleNum}`,
                            content: hit.text,
                        };
                    }
                }
            }
        }
    } catch {
        resolved = null;
    }

    articleTextCache.set(key, resolved);
    return resolved;
}

export function prefetchSmartLawArticlesForContext(ctx: DossierNoteContext): void {
    if (ctx.kind === 'execution') {
        prefetchExecutionLawArticlesRemote();
        return;
    }
    if (ctx.kind === 'lawsuit') {
        if (ctx.lawsuitType === 'criminal') {
            prefetchLegalCodeArticles(['penal', 'procedure']);
            return;
        }
        prefetchCivilLawArticles(['civil_procedure', 'evidence']);
        return;
    }
    prefetchExecutionLawArticlesRemote();
    prefetchCivilLawArticles(['civil_procedure', 'evidence']);
    prefetchLegalCodeArticles(['penal', 'procedure']);
}

export function fallbackLawSummary(lawId: SmartLawId, articleNum: number): string {
    return `المادة ${articleNum} — ${lawLabelForId(lawId)}`;
}

export function resetSmartLawArticleCacheForTests(): void {
    articleTextCache.clear();
}
