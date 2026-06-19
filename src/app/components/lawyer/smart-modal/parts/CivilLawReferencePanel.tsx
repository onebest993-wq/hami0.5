import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
    CIVIL_LAW_CANONICAL_NAMES,
    type CivilLawCodeType,
} from '@/app/constants/iraqiLawCatalog';
import {
    CIVIL_LAW_CACHE_INVALIDATED_EVENT,
    loadCivilLawArticles,
    prefetchCivilLawArticles,
    type CivilLawArticle,
} from '@/app/utils/civilLawRemoteCache';
import {
    isArabicLooseHighlightMatch,
    splitTextByArabicLooseHighlight,
} from '@/app/utils/executionLawArticleUtils';
import { formatLegalArticleTitle } from '@/app/components/lawyer/criminal-system/legalCodes/legalCodesConstants';
import {
    articleMatchesCivilLawTaxonomy,
    findTaxonomyBranch,
    findTaxonomyNode,
    findTaxonomySection,
    getCivilLawTaxonomy,
} from './civilLawTaxonomy';
import {
    LAW_TAXONOMY_FILTER_BTN,
    LawTaxonomyFilterRail,
} from '@/app/components/lawyer/shared/LawTaxonomyFilterRail';

const TAB_OPTIONS: ReadonlyArray<{ id: CivilLawCodeType; label: string }> = [
    { id: 'civil_procedure', label: 'المرافعات المدنية' },
    { id: 'evidence', label: 'قانون الإثبات' },
];

type CivilLawReferenceVisualVariant = 'civil' | 'personal';

const CIVIL_FILTER_BTN_ACTIVE = 'border-sky-400/35 bg-sky-500/15 text-sky-200';
const CIVIL_FILTER_BTN_IDLE = 'border-white/10 text-slate-400 hover:text-slate-200';
const PERSONAL_FILTER_BTN_ACTIVE = 'border-[#C4A574]/35 bg-[#C4A574]/10 text-[#C4A574]';
const PERSONAL_FILTER_BTN_IDLE = 'border-white/[0.08] text-white/45 hover:text-white/65';

const FILTER_BTN_BASE = LAW_TAXONOMY_FILTER_BTN;

function filterBtnClass(active: boolean, visualVariant: CivilLawReferenceVisualVariant): string {
    const activeClass =
        visualVariant === 'personal' ? PERSONAL_FILTER_BTN_ACTIVE : CIVIL_FILTER_BTN_ACTIVE;
    const idleClass =
        visualVariant === 'personal' ? PERSONAL_FILTER_BTN_IDLE : CIVIL_FILTER_BTN_IDLE;
    return [FILTER_BTN_BASE, active ? activeClass : idleClass].join(' ');
}

function getHighlightedText(text: string, highlight: string): React.ReactNode {
    const parts = splitTextByArabicLooseHighlight(text, highlight);
    if (parts.length === 1) return parts[0];
    return parts.map((part, index) =>
        part && isArabicLooseHighlightMatch(part, highlight) ? (
            <mark key={index} className="bg-yellow-500/40 text-yellow-100 font-bold px-1 rounded-sm">
                {part}
            </mark>
        ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
        ),
    );
}

const CivilLawArticleCard = memo(function CivilLawArticleCard({
    article,
    searchQuery,
    visualVariant = 'civil',
}: {
    article: CivilLawArticle;
    searchQuery: string;
    visualVariant?: CivilLawReferenceVisualVariant;
}) {
    const cardClass =
        visualVariant === 'personal'
            ? 'rounded-lg border border-white/[0.07] bg-[#1a181a] p-3.5 text-right'
            : 'rounded-2xl border border-slate-700/40 bg-slate-900/35 p-4 text-right backdrop-blur-sm';
    const titleAccent =
        visualVariant === 'personal' ? 'text-[#C4A574]' : 'text-[#E6C673]/90';
    const bodyClass =
        visualVariant === 'personal' ? 'text-white/72' : 'text-slate-300';

    return (
        <li className={cardClass}>
            <h3 className="text-base font-black leading-snug text-slate-100">
                <span className={titleAccent}>{formatLegalArticleTitle(article.articleNumber)}</span>
            </h3>
            <p className={`mt-3 text-sm leading-relaxed whitespace-pre-line ${bodyClass}`}>
                {getHighlightedText(article.text, searchQuery)}
            </p>
        </li>
    );
});

export interface CivilLawReferencePanelProps {
    visualVariant?: CivilLawReferenceVisualVariant;
    forcedTab?: CivilLawCodeType;
    hideTabBar?: boolean;
    embedded?: boolean;
}

export function CivilLawReferencePanel({
    visualVariant = 'civil',
    forcedTab,
    hideTabBar = false,
    embedded = false,
}: CivilLawReferencePanelProps) {
    const [internalTab, setInternalTab] = useState<CivilLawCodeType>('civil_procedure');
    const activeTab = forcedTab ?? internalTab;
    const [sectionId, setSectionId] = useState<string | null>(null);
    const [branchId, setBranchId] = useState<string | null>(null);
    const [nodeId, setNodeId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [articles, setArticles] = useState<CivilLawArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const taxonomy = getCivilLawTaxonomy(activeTab);
    const activeSection = findTaxonomySection(activeTab, sectionId);
    const activeBranch = findTaxonomyBranch(activeSection, branchId);
    const activeNode = findTaxonomyNode(activeBranch, nodeId);

    const loadArticles = useCallback(() => {
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        void loadCivilLawArticles(activeTab)
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

    useEffect(() => {
        prefetchCivilLawArticles(['civil_procedure', 'evidence']);
        return loadArticles();
    }, [loadArticles]);

    useEffect(() => {
        const onInvalidated = () => {
            void loadArticles();
        };
        window.addEventListener(CIVIL_LAW_CACHE_INVALIDATED_EVENT, onInvalidated);
        return () => window.removeEventListener(CIVIL_LAW_CACHE_INVALIDATED_EVENT, onInvalidated);
    }, [loadArticles]);

    useEffect(() => {
        setSectionId(null);
        setBranchId(null);
        setNodeId(null);
    }, [activeTab]);

    const filteredArticles = useMemo(() => {
        const q = searchQuery.trim();
        return articles.filter((article) => {
            if (
                !articleMatchesCivilLawTaxonomy({
                    articleNumber: article.articleNumber,
                    codeType: activeTab,
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
    }, [articles, activeTab, sectionId, branchId, nodeId, searchQuery]);

    const taxonomyPathLabel = useMemo(() => {
        if (activeNode) return activeNode.label;
        if (activeBranch) return activeBranch.label;
        if (activeSection) return activeSection.label;
        return null;
    }, [activeSection, activeBranch, activeNode]);

    const tabActiveClass =
        visualVariant === 'personal'
            ? 'border-[#C4A574]/35 bg-[#C4A574]/10 text-[#C4A574]'
            : 'border-[#E6C673]/35 bg-[#E6C673]/15 text-[#E6C673]';
    const tabIdleClass =
        visualVariant === 'personal'
            ? 'border-white/[0.08] bg-white/[0.03] text-white/50 hover:border-white/[0.14]'
            : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/18';
    const searchClass =
        visualVariant === 'personal'
            ? 'w-full rounded-lg border border-white/[0.08] bg-[#1a181a] py-2.5 pr-10 pl-3 text-sm text-white/88 outline-none focus:border-[#C4A574]/35'
            : 'w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pr-10 pl-3 text-sm text-white outline-none focus:border-[#E6C673]/30';
    const taxonomyPathClass =
        visualVariant === 'personal' ? 'text-white/50' : 'text-sky-200/80';

    return (
        <div
            className={`flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden ${embedded ? '' : 'p-4'}`}
            dir="rtl"
        >
            {!hideTabBar ? (
            <div className="flex shrink-0 flex-wrap gap-2">
                {TAB_OPTIONS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setInternalTab(tab.id)}
                        className={[
                            'rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors',
                            activeTab === tab.id ? tabActiveClass : tabIdleClass,
                        ].join(' ')}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            ) : null}

            {!hideTabBar ? (
            <p className="shrink-0 text-[10px] text-white/40 leading-relaxed">
                {CIVIL_LAW_CANONICAL_NAMES[activeTab]}
            </p>
            ) : null}

            <div className="relative shrink-0">
                <Search
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30"
                    aria-hidden
                />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في المواد…"
                    className={searchClass}
                    aria-label="بحث في المواد القانونية"
                />
            </div>

            <LawTaxonomyFilterRail
                label="القسم العام"
                scrollAccent={visualVariant === 'personal' ? 'personal' : 'civil'}
            >
                <button
                    type="button"
                    onClick={() => {
                        setSectionId(null);
                        setBranchId(null);
                        setNodeId(null);
                    }}
                    className={filterBtnClass(!sectionId, visualVariant)}
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
                        className={filterBtnClass(sectionId === item.id, visualVariant)}
                    >
                        {item.label}
                    </button>
                ))}
            </LawTaxonomyFilterRail>

            {activeSection ? (
                <LawTaxonomyFilterRail
                    label="التصنيف الخاص — فرع"
                    scrollAccent={visualVariant === 'personal' ? 'personal' : 'civil'}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setBranchId(null);
                            setNodeId(null);
                        }}
                        className={filterBtnClass(!branchId, visualVariant)}
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
                            className={filterBtnClass(branchId === item.id, visualVariant)}
                        >
                            {item.label}
                        </button>
                    ))}
                </LawTaxonomyFilterRail>
            ) : null}

            {activeBranch ? (
                <LawTaxonomyFilterRail
                    label="العقدة التفصيلية"
                    scrollAccent={visualVariant === 'personal' ? 'personal' : 'civil'}
                >
                    <button
                        type="button"
                        onClick={() => setNodeId(null)}
                        className={filterBtnClass(!nodeId, visualVariant)}
                    >
                        كل العقد
                    </button>
                    {activeBranch.nodes.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setNodeId(item.id)}
                            className={filterBtnClass(nodeId === item.id, visualVariant)}
                        >
                            {item.label}
                        </button>
                    ))}
                </LawTaxonomyFilterRail>
            ) : null}

            {taxonomyPathLabel ? (
                <p className={`shrink-0 text-[10px] leading-relaxed ${taxonomyPathClass}`}>
                    التصنيف الحالي: {taxonomyPathLabel}
                </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y scrollbar-hide">
                {loading ? (
                    <p className="text-center text-sm text-white/40 py-8">جاري تحميل المواد…</p>
                ) : loadError ? (
                    <p className="text-center text-sm text-rose-300/90 py-8">{loadError}</p>
                ) : filteredArticles.length === 0 ? (
                    <p className="text-center text-sm text-white/40 py-8">
                        لا توجد مواد في هذا التصنيف. جرّب مستوى أعلى أو «الكل».
                    </p>
                ) : (
                    <ul className="space-y-3 pb-4">
                        {filteredArticles.map((article) => (
                            <CivilLawArticleCard
                                key={article.id}
                                article={article}
                                searchQuery={searchQuery}
                                visualVariant={visualVariant}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
