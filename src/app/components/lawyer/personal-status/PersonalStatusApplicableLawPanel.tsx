import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { PersonalApplicableLaw } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import {
    PERSONAL_APPLICABLE_LAW_SOURCES,
    type PersonalApplicableLawSource,
} from '@/app/components/lawyer/personal-status/personalStatusLawRegistry';
import {
    PERSONAL_STATUS_LAW_CACHE_INVALIDATED_EVENT,
    loadPersonalStatusLawArticles,
    prefetchPersonalStatusLawArticles,
    type PersonalStatusLawArticle,
} from '@/app/utils/personalStatusLawRemoteCache';
import {
    isArabicLooseHighlightMatch,
    splitTextByArabicLooseHighlight,
} from '@/app/utils/executionLawArticleUtils';
import { formatLegalArticleTitle } from '@/app/components/lawyer/criminal-system/legalCodes/legalCodesConstants';
import type { PersonalStatusLawCodeType } from '@/app/constants/personalStatusLawCatalog';

function getHighlightedText(text: string, highlight: string): React.ReactNode {
    const parts = splitTextByArabicLooseHighlight(text, highlight);
    if (parts.length === 1) return parts[0];
    return parts.map((part, index) =>
        part && isArabicLooseHighlightMatch(part, highlight) ? (
            <mark key={index} className="bg-violet-400/35 text-violet-100 font-bold px-1 rounded-sm">
                {part}
            </mark>
        ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
        ),
    );
}

const PersonalStatusArticleCard = memo(function PersonalStatusArticleCard({
    article,
    searchQuery,
}: {
    article: PersonalStatusLawArticle;
    searchQuery: string;
}) {
    return (
        <li className="rounded-2xl border border-violet-300/20 bg-gradient-to-l from-violet-400/[0.07] via-[#1a1018]/50 to-rose-400/[0.04] p-4 text-right shadow-[0_8px_28px_rgba(0,0,0,0.22)] ring-1 ring-inset ring-violet-200/10">
            <h3 className="text-base font-black leading-snug text-violet-50">
                <span className="text-rose-200/90">{formatLegalArticleTitle(article.articleNumber)}</span>
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-violet-100/75 whitespace-pre-line">
                {getHighlightedText(article.text, searchQuery)}
            </p>
        </li>
    );
});

function useVisibleLawSources(applicableLaw: PersonalApplicableLaw | '' | undefined) {
    const sources = useMemo(() => {
        if (!applicableLaw) return [] as PersonalApplicableLawSource[];
        return [...PERSONAL_APPLICABLE_LAW_SOURCES[applicableLaw]];
    }, [applicableLaw]);

    const [visibleSources, setVisibleSources] = useState<PersonalApplicableLawSource[]>(sources);
    const [resolved, setResolved] = useState(false);

    useEffect(() => {
        if (sources.length === 0) {
            setVisibleSources([]);
            setResolved(true);
            return;
        }

        let cancelled = false;
        setResolved(false);
        prefetchPersonalStatusLawArticles(sources.map((s) => s.codeType));

        void Promise.all(
            sources.map(async (source) => {
                const rows = await loadPersonalStatusLawArticles(source.codeType);
                return { source, count: rows.length };
            }),
        )
            .then((results) => {
                if (cancelled) return;
                const next = results
                    .filter(({ source, count }) => !source.hideWhenEmpty || count > 0)
                    .map(({ source }) => source);
                setVisibleSources(next.length > 0 ? next : sources.slice(0, 1));
            })
            .catch(() => {
                if (!cancelled) setVisibleSources(sources);
            })
            .finally(() => {
                if (!cancelled) setResolved(true);
            });

        return () => {
            cancelled = true;
        };
    }, [sources]);

    return { visibleSources, resolved };
}

export interface PersonalStatusApplicableLawPanelProps {
    applicableLaw: PersonalApplicableLaw | '' | undefined;
}

export function PersonalStatusApplicableLawPanel({
    applicableLaw,
}: PersonalStatusApplicableLawPanelProps) {
    const { visibleSources, resolved } = useVisibleLawSources(applicableLaw);
    const [activeTab, setActiveTab] = useState<PersonalStatusLawCodeType | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [articles, setArticles] = useState<PersonalStatusLawArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (visibleSources.length === 0) {
            setActiveTab(null);
            return;
        }
        setActiveTab((prev) =>
            prev && visibleSources.some((s) => s.codeType === prev)
                ? prev
                : visibleSources[0].codeType,
        );
    }, [visibleSources]);

    const loadArticles = useCallback(() => {
        if (!activeTab) return () => {};
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        void loadPersonalStatusLawArticles(activeTab)
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
    }, [activeTab]);

    useEffect(() => loadArticles(), [loadArticles]);

    useEffect(() => {
        const onInvalidated = () => {
            void loadArticles();
        };
        window.addEventListener(PERSONAL_STATUS_LAW_CACHE_INVALIDATED_EVENT, onInvalidated);
        return () =>
            window.removeEventListener(PERSONAL_STATUS_LAW_CACHE_INVALIDATED_EVENT, onInvalidated);
    }, [loadArticles]);

    const filteredArticles = useMemo(() => {
        const q = searchQuery.trim();
        if (!q) return articles;
        return articles.filter((article) => {
            const hay = `${article.articleNumber} ${article.text}`;
            return isArabicLooseHighlightMatch(hay, q);
        });
    }, [articles, searchQuery]);

    const activeSource = visibleSources.find((s) => s.codeType === activeTab);

    if (!applicableLaw) {
        return (
            <p className="text-center text-sm text-violet-200/50 py-10">
                لم يُحدَّد القانون المطبق على هذا الملف.
            </p>
        );
    }

    if (!resolved) {
        return <p className="text-center text-sm text-violet-200/50 py-10">جاري تجهيز المصادر…</p>;
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4" dir="rtl">
            {visibleSources.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                    {visibleSources.map((source) => (
                        <button
                            key={source.codeType}
                            type="button"
                            onClick={() => setActiveTab(source.codeType)}
                            className={[
                                'rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors',
                                activeTab === source.codeType
                                    ? 'border-rose-300/35 bg-rose-400/15 text-rose-100'
                                    : 'border-violet-300/15 bg-violet-400/[0.06] text-violet-200/70 hover:border-violet-300/30',
                            ].join(' ')}
                        >
                            {source.label}
                        </button>
                    ))}
                </div>
            ) : activeSource ? (
                <p className="text-[11px] font-bold text-rose-100/90">{activeSource.label}</p>
            ) : null}

            <div className="relative">
                <Search
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-violet-200/30"
                    aria-hidden
                />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في المواد…"
                    className="w-full rounded-xl border border-violet-300/15 bg-violet-400/[0.06] py-2.5 pr-10 pl-3 text-sm text-violet-50 outline-none focus:border-rose-300/30"
                    aria-label="بحث في المواد القانونية"
                />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
                {loading ? (
                    <p className="text-center text-sm text-violet-200/45 py-8">جاري تحميل المواد…</p>
                ) : loadError ? (
                    <p className="text-center text-sm text-rose-300/90 py-8">{loadError}</p>
                ) : filteredArticles.length === 0 ? (
                    <p className="text-center text-sm text-violet-200/45 py-8">
                        لا توجد مواد محقونة بعد. أضف المواد من لوحة الإدارة → أحوال شخصية.
                    </p>
                ) : (
                    <ul className="space-y-3 pb-4">
                        {filteredArticles.map((article) => (
                            <PersonalStatusArticleCard
                                key={article.id}
                                article={article}
                                searchQuery={searchQuery}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
