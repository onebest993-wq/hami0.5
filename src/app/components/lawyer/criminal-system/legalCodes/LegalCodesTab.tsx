/* @refresh reset */
import React, {
    startTransition,
    useCallback,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    articleMatchesProcedureLawFilter,
    clearProcedureFilterPin,
    readProcedureFilterPin,
    writeProcedureFilterPin,
} from '../lawFilters';
import {
    articleMatchesJuvenileLawFilter,
    clearJuvenileFilterPin,
    readJuvenileFilterPin,
    writeJuvenileFilterPin,
} from '../juvenileLawFilters';
import {
    articleMatchesPenalLawFilter,
    clearPenalFilterPin,
    readPenalFilterPin,
    writePenalFilterPin,
} from '../penalLawFilters';
import {
    extractArticleSortNumber,
    LEGAL_ARTICLES_PAGE_SIZE,
    LEGAL_CODES_PINNED_IDS_KEY,
    type LegalCodeArticle,
    type LegalCodeType,
} from './legalCodesConstants';
import {
    getAllCachedLegalCodeArticles,
    getCachedLegalCodeArticles,
    loadLegalCodeArticles,
    mergeLegalCodeArticlesForTab,
    prefetchLegalCodeArticles,
} from './legalCodesDataCache';
import { LegalCodesEditorSection } from './LegalCodesEditorSection';
import { LegalCodesEmptySection } from './LegalCodesEmptySection';
import { LegalCodesListSection } from './LegalCodesListSection';
import { LegalCodesSearchFiltersSection } from './LegalCodesSearchFiltersSection';

export type LegalCodesTabProps = {
    /** يظهر تبويب قانون رعاية الأحداث عند وجود متهم حدث أو مشتكٍ/مجني عليه حدث. */
    showJuvenileLawTab?: boolean;
};

export function LegalCodesTab({ showJuvenileLawTab = false }: LegalCodesTabProps) {
    const [legalCodeTab, setLegalCodeTab] = useState<LegalCodeType>('penal');
    const [legalCodeSearch, setLegalCodeSearch] = useState('');
    const deferredSearch = useDeferredValue(legalCodeSearch);
    const initialProcedureFilterPin = readProcedureFilterPin();
    const initialJuvenileFilterPin = readJuvenileFilterPin();
    const initialPenalFilterPin = readPenalFilterPin();
    const [procedureGeneralFilter, setProcedureGeneralFilter] = useState<string | null>(
        initialProcedureFilterPin?.general ?? null,
    );
    const [procedureSubFilter, setProcedureSubFilter] = useState<string | null>(
        initialProcedureFilterPin?.sub ?? null,
    );
    const [penalGeneralFilter, setPenalGeneralFilter] = useState<string | null>(
        initialPenalFilterPin?.general ?? null,
    );
    const [penalSubFilter, setPenalSubFilter] = useState<string | null>(
        initialPenalFilterPin?.sub ?? null,
    );
    const [juvenileGeneralFilter, setJuvenileGeneralFilter] = useState<string | null>(
        initialJuvenileFilterPin?.general ?? null,
    );
    const [juvenileSubFilter, setJuvenileSubFilter] = useState<string | null>(
        initialJuvenileFilterPin?.sub ?? null,
    );
    const [pinnedLegalArticleIds, setPinnedLegalArticleIds] = useState<string[]>([]);
    const [isLegalCodesCatalogOpen, setIsLegalCodesCatalogOpen] = useState(true);
    const [visibleLegalArticlesCount, setVisibleLegalArticlesCount] = useState(LEGAL_ARTICLES_PAGE_SIZE);
    const [legalCodeArticles, setLegalCodeArticles] = useState<LegalCodeArticle[]>(() =>
        getAllCachedLegalCodeArticles(),
    );
    const [legalCodesLoadError, setLegalCodesLoadError] = useState('');
    const [isLegalCodesLoading, setIsLegalCodesLoading] = useState(
        () => !getCachedLegalCodeArticles('penal'),
    );
    const loadSeqRef = useRef(0);

    const prefetchTabs = useMemo(
        (): LegalCodeType[] =>
            showJuvenileLawTab ? ['penal', 'procedure', 'juvenile'] : ['penal', 'procedure'],
        [showJuvenileLawTab],
    );

    useEffect(() => {
        const seq = ++loadSeqRef.current;
        prefetchLegalCodeArticles(prefetchTabs);

        const cached = getCachedLegalCodeArticles(legalCodeTab);
        if (cached) {
            setLegalCodeArticles((prev) => mergeLegalCodeArticlesForTab(prev, legalCodeTab, cached));
            setIsLegalCodesLoading(false);
            setLegalCodesLoadError('');
        } else {
            setIsLegalCodesLoading(true);
            setLegalCodesLoadError('');
        }

        void loadLegalCodeArticles(legalCodeTab)
            .then((mapped) => {
                if (seq !== loadSeqRef.current) return;
                startTransition(() => {
                    setLegalCodeArticles((prev) => mergeLegalCodeArticlesForTab(prev, legalCodeTab, mapped));
                });
            })
            .catch((e) => {
                if (seq !== loadSeqRef.current) return;
                setLegalCodesLoadError(e instanceof Error ? e.message : 'تعذر تحميل متون القوانين.');
            })
            .finally(() => {
                if (seq === loadSeqRef.current) setIsLegalCodesLoading(false);
            });

        for (const tab of prefetchTabs) {
            if (tab === legalCodeTab || getCachedLegalCodeArticles(tab)) continue;
            void loadLegalCodeArticles(tab)
                .then((mapped) => {
                    if (seq !== loadSeqRef.current) return;
                    startTransition(() => {
                        setLegalCodeArticles((prev) => mergeLegalCodeArticlesForTab(prev, tab, mapped));
                    });
                })
                .catch(() => {
                    /* prefetch — errors surface when tab is opened */
                });
        }
    }, [legalCodeTab, prefetchTabs]);

    useEffect(() => {
        if (!showJuvenileLawTab && legalCodeTab === 'juvenile') {
            setLegalCodeTab('penal');
        }
    }, [showJuvenileLawTab, legalCodeTab]);

    const legalCodeTabOptions = useMemo(
        () =>
            (
                [
                    ['penal', 'قانون العقوبات'],
                    ['procedure', 'أصول المحاكمات الجزائية'],
                    ...(showJuvenileLawTab
                        ? ([['juvenile', 'قانون رعاية الأحداث']] as const)
                        : []),
                ] as const
            ).slice(),
        [showJuvenileLawTab],
    );

    const searchHighlightQuery = deferredSearch.trim();

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(LEGAL_CODES_PINNED_IDS_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                setPinnedLegalArticleIds(parsed.map((v) => String(v)).filter(Boolean));
            }
        } catch {
            /* ignore malformed localStorage */
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(LEGAL_CODES_PINNED_IDS_KEY, JSON.stringify(pinnedLegalArticleIds));
    }, [pinnedLegalArticleIds]);

    const filteredLegalCodeArticles = useMemo(() => {
        const q = deferredSearch.trim();
        const filtered = legalCodeArticles.filter((a) => {
            if (a.codeType !== legalCodeTab) return false;
            if (legalCodeTab === 'procedure') {
                if (
                    !articleMatchesProcedureLawFilter(
                        a.articleNumber,
                        procedureGeneralFilter,
                        procedureSubFilter,
                    )
                ) {
                    return false;
                }
            } else if (legalCodeTab === 'penal') {
                if (
                    !articleMatchesPenalLawFilter(
                        a.articleNumber,
                        penalGeneralFilter,
                        penalSubFilter,
                    )
                ) {
                    return false;
                }
            } else if (legalCodeTab === 'juvenile') {
                if (
                    !articleMatchesJuvenileLawFilter(
                        a.articleNumber,
                        juvenileGeneralFilter,
                        juvenileSubFilter,
                    )
                ) {
                    return false;
                }
            }
            if (!q) return true;
            return a.articleNumber.includes(q) || a.text.includes(q) || String(a.lawName ?? '').includes(q);
        });
        return filtered.slice().sort((a, b) => {
            const aNum = extractArticleSortNumber(a.articleNumber);
            const bNum = extractArticleSortNumber(b.articleNumber);
            if (aNum !== bNum) return aNum - bNum;
            return String(a.articleNumber).localeCompare(String(b.articleNumber), 'ar');
        });
    }, [
        deferredSearch,
        legalCodeArticles,
        legalCodeTab,
        procedureGeneralFilter,
        procedureSubFilter,
        penalGeneralFilter,
        penalSubFilter,
        juvenileGeneralFilter,
        juvenileSubFilter,
    ]);

    const pinnedFilteredLegalArticles = useMemo(() => {
        const pinned = new Set(pinnedLegalArticleIds);
        return filteredLegalCodeArticles.filter((a) => pinned.has(a.id));
    }, [filteredLegalCodeArticles, pinnedLegalArticleIds]);

    const unpinnedFilteredLegalArticles = useMemo(() => {
        const pinned = new Set(pinnedLegalArticleIds);
        return filteredLegalCodeArticles.filter((a) => !pinned.has(a.id));
    }, [filteredLegalCodeArticles, pinnedLegalArticleIds]);

    const visibleUnpinnedLegalArticles = useMemo(
        () => unpinnedFilteredLegalArticles.slice(0, visibleLegalArticlesCount),
        [unpinnedFilteredLegalArticles, visibleLegalArticlesCount],
    );

    useEffect(() => {
        setVisibleLegalArticlesCount(LEGAL_ARTICLES_PAGE_SIZE);
    }, [
        legalCodeTab,
        deferredSearch,
        procedureGeneralFilter,
        procedureSubFilter,
        penalGeneralFilter,
        penalSubFilter,
        juvenileGeneralFilter,
        juvenileSubFilter,
    ]);

    useEffect(() => {
        if (legalCodeTab !== 'penal') return;
        if (!penalGeneralFilter) {
            clearPenalFilterPin();
            return;
        }
        writePenalFilterPin({
            general: penalGeneralFilter,
            sub: penalSubFilter,
        });
    }, [legalCodeTab, penalGeneralFilter, penalSubFilter]);

    useEffect(() => {
        if (legalCodeTab !== 'procedure') return;
        if (!procedureGeneralFilter) {
            clearProcedureFilterPin();
            return;
        }
        writeProcedureFilterPin({
            general: procedureGeneralFilter,
            sub: procedureSubFilter,
        });
    }, [legalCodeTab, procedureGeneralFilter, procedureSubFilter]);

    useEffect(() => {
        if (legalCodeTab !== 'juvenile') return;
        if (!juvenileGeneralFilter) {
            clearJuvenileFilterPin();
            return;
        }
        writeJuvenileFilterPin({
            general: juvenileGeneralFilter,
            sub: juvenileSubFilter,
        });
    }, [legalCodeTab, juvenileGeneralFilter, juvenileSubFilter]);

    const togglePinLegalArticle = useCallback((articleId: string) => {
        setPinnedLegalArticleIds((prev) =>
            prev.includes(articleId) ? prev.filter((id) => id !== articleId) : [...prev, articleId],
        );
    }, []);

    const isSearchPending = deferredSearch !== legalCodeSearch;
    const hasCurrentTabArticles = legalCodeArticles.some((a) => a.codeType === legalCodeTab);
    const showLegalCodesLoading = isLegalCodesLoading && !hasCurrentTabArticles;
    const showEmptySection =
        showLegalCodesLoading || Boolean(legalCodesLoadError) || filteredLegalCodeArticles.length === 0;

    return (
        <div
            key="criminal-tab-legal-codes-v2"
            className="flex min-w-0 flex-col p-4 max-w-5xl mx-auto w-full gap-4 print:text-black"
        >
            <LegalCodesSearchFiltersSection
                legalCodeSearch={legalCodeSearch}
                onLegalCodeSearchChange={setLegalCodeSearch}
                legalCodeTabOptions={legalCodeTabOptions}
                legalCodeTab={legalCodeTab}
                onLegalCodeTabChange={setLegalCodeTab}
                penalGeneralFilter={penalGeneralFilter}
                penalSubFilter={penalSubFilter}
                onPenalGeneralFilterChange={setPenalGeneralFilter}
                onPenalSubFilterChange={setPenalSubFilter}
                procedureGeneralFilter={procedureGeneralFilter}
                procedureSubFilter={procedureSubFilter}
                onProcedureGeneralFilterChange={setProcedureGeneralFilter}
                onProcedureSubFilterChange={setProcedureSubFilter}
                juvenileGeneralFilter={juvenileGeneralFilter}
                juvenileSubFilter={juvenileSubFilter}
                onJuvenileGeneralFilterChange={setJuvenileGeneralFilter}
                onJuvenileSubFilterChange={setJuvenileSubFilter}
            />
            {showEmptySection ? (
                <LegalCodesEmptySection
                    showLoading={showLegalCodesLoading}
                    loadError={legalCodesLoadError}
                    isEmpty={filteredLegalCodeArticles.length === 0}
                />
            ) : (
                <div className={`space-y-4 ${isSearchPending ? 'opacity-80' : ''}`}>
                    <LegalCodesListSection
                        articles={pinnedFilteredLegalArticles}
                        searchHighlightQuery={searchHighlightQuery}
                        onTogglePin={togglePinLegalArticle}
                    />
                    <LegalCodesEditorSection
                        isOpen={isLegalCodesCatalogOpen}
                        onToggleOpen={() => setIsLegalCodesCatalogOpen((v) => !v)}
                        unpinnedTotalCount={unpinnedFilteredLegalArticles.length}
                        pinnedCount={pinnedFilteredLegalArticles.length}
                        visibleArticles={visibleUnpinnedLegalArticles}
                        searchHighlightQuery={searchHighlightQuery}
                        onLoadMore={() =>
                            setVisibleLegalArticlesCount((v) => v + LEGAL_ARTICLES_PAGE_SIZE)
                        }
                    />
                </div>
            )}
        </div>
    );
}
