import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import {
    ALL_EXECUTION_ARTICLES_SCOPE,
    EXECUTION_LAW_HIERARCHY,
    filterExecutionLawsByScope,
    searchExecutionLawsGlobal,
    TAKHLYA_PARENT_ID,
    TAKHLYA_DEFAULT_LEAF_ID,
    type ExecutionLawArticle,
    type ExecutionLawLeafFilter,
    type ExecutionLawParentId,
    type ExecutionLawParentScope,
} from '@/data/executionLaws';
import { loadExecutionLawSeedData } from '@/data/executionLawsLoader';
import {
    EXECUTION_LAW_CACHE_INVALIDATED_EVENT,
    hasExecutionLawArticlesCached,
    loadExecutionLawArticlesRemote,
} from '@/app/utils/executionLawRemoteCache';
import {
    isArabicLooseHighlightMatch,
    splitTextByArabicLooseHighlight,
} from '@/app/utils/executionLawArticleUtils';
import {
    LAW_TAXONOMY_FILTER_BTN,
    LawTaxonomyFilterRail,
} from '@/app/components/lawyer/shared/LawTaxonomyFilterRail';

const PARENT_CHIP_ACTIVE =
    'border-[#E6C673]/35 bg-[#E6C673]/12 text-[#E6C673] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]';
const PARENT_CHIP_IDLE =
    'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/18 hover:text-slate-100';
const LEAF_CHIP_ACTIVE = 'border-purple-500/35 bg-purple-900/40 text-purple-300';
const LEAF_CHIP_IDLE = 'border-white/10 bg-transparent text-slate-400 hover:border-white/20 hover:text-slate-200';

function filterBtnClass(active: boolean, activeClass: string, idleClass: string): string {
    return [LAW_TAXONOMY_FILTER_BTN, active ? activeClass : idleClass].join(' ');
}

function getHighlightedText(text: string, highlight: string): React.ReactNode {
    const parts = splitTextByArabicLooseHighlight(text, highlight);
    if (parts.length === 1) return parts[0];
    return parts.map((part, index) =>
        part && isArabicLooseHighlightMatch(part, highlight) ? (
            <mark key={index} className="rounded-sm bg-yellow-500/40 px-1 font-bold text-yellow-100">
                {part}
            </mark>
        ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
        ),
    );
}

const ARTICLE_CARD_CLASS =
    'rounded-2xl border border-slate-700/40 bg-slate-900/35 p-4 text-right backdrop-blur-sm [content-visibility:auto] [contain-intrinsic-size:auto_140px]';

const INITIAL_ARTICLE_BATCH = 24;
const ARTICLE_BATCH_SIZE = 32;

function useProgressiveListLength(total: number): number {
    const [visibleCount, setVisibleCount] = useState(() => Math.min(INITIAL_ARTICLE_BATCH, total));

    useEffect(() => {
        setVisibleCount(Math.min(INITIAL_ARTICLE_BATCH, total));
    }, [total]);

    useEffect(() => {
        if (visibleCount >= total) return;
        let cancelled = false;
        const grow = () => {
            if (cancelled) return;
            setVisibleCount((current) => Math.min(current + ARTICLE_BATCH_SIZE, total));
        };
        if (typeof requestIdleCallback !== 'undefined') {
            const idleId = requestIdleCallback(grow, { timeout: 120 });
            return () => {
                cancelled = true;
                cancelIdleCallback(idleId);
            };
        }
        const timeoutId = window.setTimeout(grow, 0);
        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [visibleCount, total]);

    return visibleCount;
}

const ExecutionLawArticleCard = memo(function ExecutionLawArticleCard({
    art,
    searchQuery,
}: {
    art: ExecutionLawArticle;
    searchQuery: string;
}) {
    return (
        <li className={ARTICLE_CARD_CLASS}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-purple-300/85">{art.leafLabel}</span>
                <span className="text-[10px] text-white/35">{art.number}</span>
            </div>
            <h3 className="text-base font-black leading-snug text-slate-100 sm:text-lg">
                <span className="text-[#E6C673]/90">المادة ({art.number})</span>
                {art.title.trim() ? (
                    <>
                        {' '}
                        — <span>{getHighlightedText(art.title, searchQuery)}</span>
                    </>
                ) : null}
            </h3>
            {art.content.trim() ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                    {getHighlightedText(art.content, searchQuery)}
                </p>
            ) : (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-400">
                    نص المادة غير متوفر حالياً.
                </p>
            )}
        </li>
    );
});

function isTakhlyaExecutionContext(executionTypeRaw: string): boolean {
    const t = executionTypeRaw.trim();
    if (!t) return false;
    if (t === 'تخلية') return true;
    return t.includes('تخلية');
}

function defaultLeafForParent(parentId: ExecutionLawParentId): ExecutionLawLeafFilter {
    const parent = EXECUTION_LAW_HIERARCHY.find((p) => p.id === parentId);
    return parent?.children[0]?.id ?? 'all_in_parent';
}

function defaultParentScope(isTakhlyaCtx: boolean): ExecutionLawParentScope {
    if (isTakhlyaCtx) return TAKHLYA_PARENT_ID;
    return ALL_EXECUTION_ARTICLES_SCOPE;
}

export const ExecutionLawReferencePanel: React.FC<{ executionType?: string }> = ({
    executionType: executionTypeProp,
}) => {
    const lawGuideFileId = useExecutionDashboardStore((s) => s.currentFile?.id ?? '');
    const executionTypeFromStore = useExecutionDashboardStore((s) => s.currentFile?.executionType);
    const resolvedExecutionType = String(executionTypeProp ?? executionTypeFromStore ?? '').trim();
    const isTakhlyaCtx = isTakhlyaExecutionContext(resolvedExecutionType);

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [parentScope, setParentScope] = useState<ExecutionLawParentScope>(() =>
        defaultParentScope(isTakhlyaCtx),
    );
    const [leafFilter, setLeafFilter] = useState<ExecutionLawLeafFilter>(() =>
        isTakhlyaCtx ? TAKHLYA_DEFAULT_LEAF_ID : 'all_in_parent',
    );
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [articles, setArticles] = useState<ExecutionLawArticle[]>([]);
    const [articlesLoading, setArticlesLoading] = useState(() => !hasExecutionLawArticlesCached());
    const [articlesLoadError, setArticlesLoadError] = useState<string | null>(null);

    const loadArticles = useCallback(() => {
        let cancelled = false;

        if (hasExecutionLawArticlesCached()) {
            void loadExecutionLawArticlesRemote()
                .then((rows) => {
                    if (cancelled) return;
                    setArticles(rows);
                    setArticlesLoadError(null);
                    setArticlesLoading(false);
                })
                .catch((e) => {
                    if (cancelled) return;
                    setArticlesLoadError(
                        e instanceof Error ? e.message : 'تعذر تحميل مواد قانون التنفيذ من قاعدة البيانات.',
                    );
                    setArticlesLoading(false);
                });
            return () => {
                cancelled = true;
            };
        }

        void loadExecutionLawSeedData()
            .then((seed) => {
                if (cancelled || seed.length === 0) return;
                setArticles(seed);
                setArticlesLoading(false);
            })
            .catch(() => undefined);

        void loadExecutionLawArticlesRemote()
            .then((rows) => {
                if (cancelled) return;
                setArticles(rows);
                setArticlesLoadError(null);
            })
            .catch((e) => {
                if (cancelled) return;
                setArticlesLoadError(
                    e instanceof Error ? e.message : 'تعذر تحميل مواد قانون التنفيذ من قاعدة البيانات.',
                );
            })
            .finally(() => {
                if (!cancelled) setArticlesLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => loadArticles(), [loadArticles]);

    useEffect(() => {
        const onCacheInvalidated = () => loadArticles();
        window.addEventListener(EXECUTION_LAW_CACHE_INVALIDATED_EVENT, onCacheInvalidated);
        return () => window.removeEventListener(EXECUTION_LAW_CACHE_INVALIDATED_EVENT, onCacheInvalidated);
    }, [loadArticles]);

    const activeParent = useMemo(() => {
        if (parentScope === ALL_EXECUTION_ARTICLES_SCOPE) return null;
        return EXECUTION_LAW_HIERARCHY.find((p) => p.id === parentScope) ?? EXECUTION_LAW_HIERARCHY[0];
    }, [parentScope]);

    const selectParentScope = useCallback(
        (nextScope: ExecutionLawParentScope) => {
            if (nextScope === parentScope) return;
            setParentScope(nextScope);
            if (nextScope !== ALL_EXECUTION_ARTICLES_SCOPE) {
                setLeafFilter(defaultLeafForParent(nextScope));
            }
            scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
        },
        [parentScope],
    );

    const selectLeaf = useCallback((nextLeaf: ExecutionLawLeafFilter) => {
        setLeafFilter(nextLeaf);
        scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }, []);

    useEffect(() => {
        if (!lawGuideFileId) return;
        setSearchQuery('');
        scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }, [lawGuideFileId]);

    useEffect(() => {
        if (!lawGuideFileId || !isTakhlyaCtx) return;
        setParentScope(TAKHLYA_PARENT_ID);
        setLeafFilter(TAKHLYA_DEFAULT_LEAF_ID);
    }, [lawGuideFileId, isTakhlyaCtx]);

    const searchActive = Boolean(deferredSearchQuery.trim());
    const showLeafRail = !searchActive && parentScope !== ALL_EXECUTION_ARTICLES_SCOPE && activeParent;

    const filtered = useMemo(() => {
        if (searchActive) {
            return searchExecutionLawsGlobal(articles, deferredSearchQuery);
        }
        return filterExecutionLawsByScope(articles, parentScope, leafFilter, '');
    }, [searchActive, deferredSearchQuery, parentScope, leafFilter, articles]);

    const visibleArticleCount = useProgressiveListLength(filtered.length);
    const visibleArticles = useMemo(
        () => filtered.slice(0, visibleArticleCount),
        [filtered, visibleArticleCount],
    );

    const activeLeafLabel = useMemo(() => {
        if (searchActive) return 'نتائج البحث في جميع التصنيفات';
        if (parentScope === ALL_EXECUTION_ARTICLES_SCOPE) return 'كل مواد القانون — من المادة 1 إلى 130';
        if (leafFilter === 'all_in_parent') return `كل مواد: ${activeParent?.label ?? ''}`;
        const leaf = activeParent?.children.find((c) => c.id === leafFilter);
        return leaf ? `${activeParent?.label} · ${leaf.label}` : activeParent?.label ?? '';
    }, [activeParent, leafFilter, parentScope, searchActive]);

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 space-y-3 border-b border-slate-800/80 px-4 py-3">
                <div className="relative">
                    <Search
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                        aria-hidden
                    />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث برقم المادة أو كلمة…"
                        className="w-full rounded-xl border border-slate-600/40 bg-slate-900/60 py-2.5 pl-3 pr-10 text-right text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#E6C673]/45 focus:outline-none focus:ring-1 focus:ring-[#E6C673]/25"
                        aria-label="بحث في مواد قانون التنفيذ"
                    />
                </div>

                {!searchActive ? (
                    <>
                        <LawTaxonomyFilterRail label="التصنيف العام" scrollAccent="civil">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={parentScope === ALL_EXECUTION_ARTICLES_SCOPE}
                                onClick={() => selectParentScope(ALL_EXECUTION_ARTICLES_SCOPE)}
                                className={filterBtnClass(
                                    parentScope === ALL_EXECUTION_ARTICLES_SCOPE,
                                    PARENT_CHIP_ACTIVE,
                                    PARENT_CHIP_IDLE,
                                )}
                                data-testid="execution-law-filter-all-articles"
                            >
                                كل المواد
                            </button>
                            {EXECUTION_LAW_HIERARCHY.map((parent) => (
                                <button
                                    key={parent.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={parent.id === parentScope}
                                    onClick={() => selectParentScope(parent.id)}
                                    className={filterBtnClass(
                                        parent.id === parentScope,
                                        PARENT_CHIP_ACTIVE,
                                        PARENT_CHIP_IDLE,
                                    )}
                                >
                                    {parent.label}
                                </button>
                            ))}
                        </LawTaxonomyFilterRail>

                        {showLeafRail ? (
                            <LawTaxonomyFilterRail
                                label={`إجراءات: ${activeParent?.label ?? ''}`}
                                scrollAccent="civil"
                            >
                                <button
                                    type="button"
                                    onClick={() => selectLeaf('all_in_parent')}
                                    className={filterBtnClass(
                                        leafFilter === 'all_in_parent',
                                        LEAF_CHIP_ACTIVE,
                                        LEAF_CHIP_IDLE,
                                    )}
                                >
                                    كل مواد التبويب
                                </button>
                                {activeParent?.children.map((child) => (
                                    <button
                                        key={child.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={leafFilter === child.id}
                                        onClick={() => selectLeaf(child.id)}
                                        className={filterBtnClass(
                                            leafFilter === child.id,
                                            LEAF_CHIP_ACTIVE,
                                            LEAF_CHIP_IDLE,
                                        )}
                                    >
                                        {child.label}
                                    </button>
                                ))}
                            </LawTaxonomyFilterRail>
                        ) : null}
                    </>
                ) : null}

                <p className="text-center text-[10px] text-slate-500">
                    {activeLeafLabel}
                    {!articlesLoading && !articlesLoadError
                        ? ` — ${filtered.length} مادة`
                        : ''}
                </p>
            </div>

            <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 touch-pan-y [-webkit-overflow-scrolling:touch]"
            >
                {articlesLoading && articles.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">جاري تحميل مواد القانون…</p>
                ) : articlesLoadError && articles.length === 0 ? (
                    <p className="py-8 text-center text-sm text-rose-300/90">{articlesLoadError}</p>
                ) : filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                        لا نتائج مطابقة للبحث أو التصنيف.
                    </p>
                ) : (
                    <ul className="space-y-3 pb-6">
                        {visibleArticles.map((art) => (
                            <ExecutionLawArticleCard
                                key={art.number}
                                art={art}
                                searchQuery={deferredSearchQuery}
                            />
                        ))}
                        {visibleArticleCount < filtered.length ? (
                            <li className="py-2 text-center text-xs text-slate-500" aria-live="polite">
                                جاري تحميل بقية المواد… ({visibleArticleCount}/{filtered.length})
                            </li>
                        ) : null}
                    </ul>
                )}
            </div>
        </div>
    );
};
