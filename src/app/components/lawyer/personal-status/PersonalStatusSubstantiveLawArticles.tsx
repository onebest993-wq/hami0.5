import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from '@/app/components/ui/icons/Search';
import type { PersonalStatusLawCodeType } from '@/app/constants/personalStatusLawCatalog';
import {
    PERSONAL_STATUS_LAW_CACHE_INVALIDATED_EVENT,
    loadPersonalStatusLawArticles,
    type PersonalStatusLawArticle,
} from '@/app/utils/personalStatusLawRemoteCache';
import {
    isArabicLooseHighlightMatch,
    splitTextByArabicLooseHighlight,
} from '@/app/utils/executionLawArticleUtils';
import { formatLegalArticleTitle } from '@/app/components/lawyer/criminal-system/legalCodes/legalCodesConstants';
import {
    articleMatchesPersonalStatusLawTaxonomy,
    findPersonalStatusTaxonomyBranch,
    findPersonalStatusTaxonomyNode,
    findPersonalStatusTaxonomySection,
    getPersonalStatusLawTaxonomy,
} from '@/app/components/lawyer/personal-status/personalStatusLawTaxonomy';
import {
    LAW_TAXONOMY_FILTER_BTN,
    LawTaxonomyFilterRail,
} from '@/app/components/lawyer/shared/LawTaxonomyFilterRail';

const FILTER_BTN_ACTIVE = 'border-[#C4A574]/35 bg-[#C4A574]/10 text-[#C4A574]';
const FILTER_BTN_IDLE = 'border-white/[0.08] text-white/45 hover:text-white/65';

function filterBtnClass(active: boolean): string {
    return [LAW_TAXONOMY_FILTER_BTN, active ? FILTER_BTN_ACTIVE : FILTER_BTN_IDLE].join(' ');
}

function getHighlightedText(text: string, highlight: string): React.ReactNode {
    const parts = splitTextByArabicLooseHighlight(text, highlight);
    if (parts.length === 1) return parts[0];
    return parts.map((part, index) =>
        part && isArabicLooseHighlightMatch(part, highlight) ? (
            <mark key={index} className="bg-[#C4A574]/30 text-[#E8D5B0] font-bold px-1 rounded-sm">
                {part}
            </mark>
        ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
        ),
    );
}

const ArticleCard = memo(function ArticleCard({
    article,
    searchQuery,
}: {
    article: PersonalStatusLawArticle;
    searchQuery: string;
}) {
    return (
        <li className="rounded-lg border border-white/[0.07] bg-[#1a181a] p-3.5 text-right">
            <h3 className="text-sm font-bold leading-snug text-[#C4A574]">
                {formatLegalArticleTitle(article.articleNumber)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/72 whitespace-pre-line">
                {getHighlightedText(article.text, searchQuery)}
            </p>
        </li>
    );
});

export function PersonalStatusSubstantiveLawArticles({
    codeType,
}: {
    codeType: PersonalStatusLawCodeType;
}) {
    const [sectionId, setSectionId] = useState<string | null>(null);
    const [branchId, setBranchId] = useState<string | null>(null);
    const [nodeId, setNodeId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [articles, setArticles] = useState<PersonalStatusLawArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const taxonomy = getPersonalStatusLawTaxonomy(codeType);
    const activeSection = findPersonalStatusTaxonomySection(codeType, sectionId);
    const activeBranch = findPersonalStatusTaxonomyBranch(activeSection, branchId);
    const activeNode = findPersonalStatusTaxonomyNode(activeBranch, nodeId);

    const loadArticles = useCallback(() => {
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        void loadPersonalStatusLawArticles(codeType)
            .then((rows) => {
                if (cancelled) return;
                setArticles(rows);
            })
            .catch((e) => {
                if (cancelled) return;
                setArticles([]);
                setLoadError(
                    e instanceof Error ? e.message : 'تعذر تحميل المواد من قاعدة البيانات.',
                );
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [codeType]);

    useEffect(() => loadArticles(), [loadArticles]);

    useEffect(() => {
        const onInvalidated = () => {
            void loadArticles();
        };
        window.addEventListener(PERSONAL_STATUS_LAW_CACHE_INVALIDATED_EVENT, onInvalidated);
        return () =>
            window.removeEventListener(PERSONAL_STATUS_LAW_CACHE_INVALIDATED_EVENT, onInvalidated);
    }, [loadArticles]);

    useEffect(() => {
        setSectionId(null);
        setBranchId(null);
        setNodeId(null);
    }, [codeType]);

    const filteredArticles = useMemo(() => {
        const q = searchQuery.trim();
        return articles.filter((article) => {
            if (
                !articleMatchesPersonalStatusLawTaxonomy({
                    articleNumber: article.articleNumber,
                    codeType,
                    sectionId,
                    branchId,
                    nodeId,
                })
            ) {
                return false;
            }
            if (!q) return true;
            const hay = `${article.articleNumber} ${article.text}`;
            return isArabicLooseHighlightMatch(hay, q);
        });
    }, [articles, codeType, sectionId, branchId, nodeId, searchQuery]);

    const taxonomyPathLabel = useMemo(() => {
        if (activeNode) return activeNode.label;
        if (activeBranch) return activeBranch.label;
        if (activeSection) return activeSection.label;
        return null;
    }, [activeSection, activeBranch, activeNode]);

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <div className="relative shrink-0">
                <Search
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/25"
                    aria-hidden
                />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في المواد…"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#1a181a] py-2 pr-9 pl-3 text-sm text-white/88 outline-none focus:border-[#C4A574]/35"
                    aria-label="بحث في المواد القانونية"
                />
            </div>

            {taxonomy ? (
                <>
                    <LawTaxonomyFilterRail label="القسم العام">
                        <button
                            type="button"
                            onClick={() => {
                                setSectionId(null);
                                setBranchId(null);
                                setNodeId(null);
                            }}
                            className={filterBtnClass(!sectionId)}
                        >
                            الكل
                        </button>
                        {taxonomy.sections.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setSectionId(item.id);
                                    setBranchId(null);
                                    setNodeId(null);
                                }}
                                className={filterBtnClass(sectionId === item.id)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </LawTaxonomyFilterRail>

                    {activeSection ? (
                        <LawTaxonomyFilterRail label="التصنيف الخاص — فرع">
                            <button
                                type="button"
                                onClick={() => {
                                    setBranchId(null);
                                    setNodeId(null);
                                }}
                                className={filterBtnClass(!branchId)}
                            >
                                كل الفروع
                            </button>
                            {activeSection.branches.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setBranchId(item.id);
                                        setNodeId(null);
                                    }}
                                    className={filterBtnClass(branchId === item.id)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </LawTaxonomyFilterRail>
                    ) : null}

                    {activeBranch ? (
                        <LawTaxonomyFilterRail label="العقدة التفصيلية">
                            <button
                                type="button"
                                onClick={() => setNodeId(null)}
                                className={filterBtnClass(!nodeId)}
                            >
                                كل العقد
                            </button>
                            {activeBranch.nodes.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setNodeId(item.id)}
                                    className={filterBtnClass(nodeId === item.id)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </LawTaxonomyFilterRail>
                    ) : null}

                    {taxonomyPathLabel ? (
                        <p className="shrink-0 text-[10px] leading-relaxed text-white/50">
                            التصنيف الحالي: {taxonomyPathLabel}
                        </p>
                    ) : null}
                </>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y scrollbar-hide">
                {loading ? (
                    <p className="text-center text-sm text-white/35 py-8">جاري تحميل المواد…</p>
                ) : loadError ? (
                    <p className="text-center text-sm text-rose-300/80 py-8">{loadError}</p>
                ) : filteredArticles.length === 0 ? (
                    <p className="text-center text-sm text-white/35 py-8">
                        {taxonomy
                            ? 'لا توجد مواد في هذا التصنيف. جرّب مستوى أعلى أو «الكل».'
                            : 'لا توجد مواد محقونة بعد. أضفها من لوحة الإدارة → أحوال شخصية.'}
                    </p>
                ) : (
                    <ul className="space-y-2 pb-4">
                        {filteredArticles.map((article) => (
                            <ArticleCard key={article.id} article={article} searchQuery={searchQuery} />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
