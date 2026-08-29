import {
    CODE_TYPE_TO_LAW_NAME,
    mapAndDedupLawRows,
    type LegalCodeArticle,
    type LegalCodeType,
} from './legalCodesConstants';
import { resolveLawCodeTypeFromName } from '@/app/constants/iraqiLawCatalog';
import { subscribeLawsCatalogChanged } from '@/app/kernel/laws/lawCatalogSync';
import { canReachPublishedLawCatalog } from '@/app/services/settings/localOnlyGuard';

const cache = new Map<LegalCodeType, LegalCodeArticle[]>();
const inflight = new Map<LegalCodeType, Promise<LegalCodeArticle[]>>();

export function getCachedLegalCodeArticles(tab: LegalCodeType): LegalCodeArticle[] | null {
    return cache.get(tab) ?? null;
}

export function getAllCachedLegalCodeArticles(): LegalCodeArticle[] {
    return Array.from(cache.values()).flat();
}

export function mergeLegalCodeArticlesForTab(
    prev: LegalCodeArticle[],
    tab: LegalCodeType,
    next: LegalCodeArticle[],
): LegalCodeArticle[] {
    return [...prev.filter((a) => a.codeType !== tab), ...next];
}

export async function loadLegalCodeArticles(tab: LegalCodeType): Promise<LegalCodeArticle[]> {
    const cached = cache.get(tab);
    if (cached) return cached;

    const pending = inflight.get(tab);
    if (pending) return pending;

    const promise = (async () => {
        let remoteError: unknown = null;
        if (canReachPublishedLawCatalog()) {
        try {
            const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
            const data = await SecureAPIClient.fetchSecure<{
                ok?: boolean;
                error?: string;
                details?: string;
                items?: Array<{
                    id?: string;
                    law_name?: string;
                    article_number?: string;
                    content?: string;
                }>;
            }>('/api/laws/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ law_name: CODE_TYPE_TO_LAW_NAME[tab] }),
            });

            if (data && data.ok !== false) {
                const rows = Array.isArray(data.items) ? data.items : [];
                const mapped = mapAndDedupLawRows(rows, tab);
                if (mapped.length > 0) {
                    cache.set(tab, mapped);
                    return mapped;
                }
            }
        } catch (error) {
            remoteError = error;
            /* fallback to bundled project files */
        }
        }

        try {
            const { loadBundledLawRows } = await import('@/app/utils/bundledIraqiLawLoader');
            const bundled = mapAndDedupLawRows(
                await loadBundledLawRows(CODE_TYPE_TO_LAW_NAME[tab]),
                tab,
            );
            if (bundled.length > 0) {
                cache.set(tab, bundled);
                return bundled;
            }
            console.warn('[LegalCodes] bundled fallback is present but empty', {
                tab,
                lawName: CODE_TYPE_TO_LAW_NAME[tab],
            });
        } catch (bundledError) {
            console.error('[LegalCodes] bundled fallback failed', {
                tab,
                lawName: CODE_TYPE_TO_LAW_NAME[tab],
                remoteError,
                bundledError,
            });
        }

        console.error('[LegalCodes] load failed', {
            tab,
            lawName: CODE_TYPE_TO_LAW_NAME[tab],
            remoteError,
        });
        throw new Error(
            `تعذر تحميل متون القانون: ${CODE_TYPE_TO_LAW_NAME[tab]} — الخادم لم يرجع بيانات، والملف المحلي المضمّن لهذا القانون غير محقون.`,
        );
    })();

    inflight.set(tab, promise);
    try {
        return await promise;
    } finally {
        inflight.delete(tab);
    }
}

export function prefetchLegalCodeArticles(tabs: readonly LegalCodeType[]): void {
    for (const tab of tabs) {
        if (cache.has(tab) || inflight.has(tab)) continue;
        void loadLegalCodeArticles(tab).catch(() => {
            /* prefetch — errors handled when tab is opened */
        });
    }
}

/** يُستدعى بعد حقن/حذف مواد من لوحة الأدمن لضمان ظهور التحديث في LegalCodesTab. */
export function invalidateLegalCodeArticlesCache(tab?: LegalCodeType): void {
    if (tab) {
        cache.delete(tab);
        inflight.delete(tab);
        return;
    }
    cache.clear();
    inflight.clear();
}

if (typeof window !== 'undefined') {
    subscribeLawsCatalogChanged((lawName) => {
        const tab = resolveLawCodeTypeFromName(lawName);
        if (tab) invalidateLegalCodeArticlesCache(tab);
    });
}
