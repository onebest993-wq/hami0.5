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
import { ChevronDown, ChevronLeft, ChevronRight, Pin, X } from 'lucide-react';
import {
    articleMatchesProcedureLawFilter,
    clearProcedureFilterPin,
    formatSubArticlesLabel,
    LAW_FILTER_GENERAL_KEYS,
    LAW_FILTERS,
    readProcedureFilterPin,
    writeProcedureFilterPin,
} from '../lawFilters';
import {
    articleMatchesJuvenileLawFilter,
    clearJuvenileFilterPin,
    JUVENILE_LAW_FILTER_GENERAL_KEYS,
    JUVENILE_LAW_FILTERS,
    readJuvenileFilterPin,
    writeJuvenileFilterPin,
} from '../juvenileLawFilters';
import {
    articleMatchesPenalLawFilter,
    clearPenalFilterPin,
    PENAL_LAW_FILTER_GENERAL_KEYS,
    PENAL_LAW_FILTERS,
    readPenalFilterPin,
    writePenalFilterPin,
} from '../penalLawFilters';
import {
    extractArticleSortNumber,
    formatLegalArticleTitle,
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
import { LegalSearchHighlightedText } from './legalCodesSearchHighlight';

function getHorizontalScrollState(el: HTMLElement) {
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    if (max <= 2) {
        return { max: 0, offset: 0, atStart: true, atEnd: true, thumbLeft: 0, thumbWidth: 100 };
    }
    const offset = Math.min(max, Math.max(0, el.scrollLeft));
    const viewRatio = el.clientWidth / el.scrollWidth;
    const thumbWidth = Math.max(viewRatio * 100, 10);
    const travel = 100 - thumbWidth;
    const thumbLeft = max > 0 ? (offset / max) * travel : 0;
    return {
        max,
        offset,
        atStart: offset <= 2,
        atEnd: offset >= max - 2,
        thumbLeft,
        thumbWidth,
    };
}

function HorizontalScrollRail({
    children,
    shellClassName = '',
}: {
    children: React.ReactNode;
    shellClassName?: string;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrollState, setScrollState] = useState({
        canScroll: false,
        atStart: true,
        atEnd: true,
        thumbLeft: 0,
        thumbWidth: 100,
    });

    const syncScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const next = getHorizontalScrollState(el);
        setScrollState({
            canScroll: next.max > 2,
            atStart: next.atStart,
            atEnd: next.atEnd,
            thumbLeft: next.thumbLeft,
            thumbWidth: next.thumbWidth,
        });
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        syncScrollState();
        const ro = new ResizeObserver(syncScrollState);
        ro.observe(el);
        el.addEventListener('scroll', syncScrollState, { passive: true });
        return () => {
            ro.disconnect();
            el.removeEventListener('scroll', syncScrollState);
        };
    }, [syncScrollState, children]);

    const scrollByStep = useCallback((direction: 1 | -1) => {
        const el = scrollRef.current;
        if (!el) return;
        const step = Math.max(140, Math.round(el.clientWidth * 0.62));
        el.scrollBy({ left: direction * step, behavior: 'smooth' });
    }, []);

    const jumpToTrack = useCallback((clientX: number, trackEl: HTMLDivElement) => {
        const el = scrollRef.current;
        if (!el) return;
        const { max } = getHorizontalScrollState(el);
        if (max <= 0) return;
        const rect = trackEl.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        el.scrollTo({ left: ratio * max, behavior: 'smooth' });
    }, []);

    const navBtnClass =
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-[#E6C673]/75 backdrop-blur-sm transition hover:border-[#E6C673]/22 hover:bg-[#E6C673]/[0.07] hover:text-[#E6C673] disabled:pointer-events-none disabled:opacity-25';

    return (
        <div className={`relative min-w-0 w-full ${shellClassName}`}>
            <div dir="rtl" className="flex items-center gap-1">
                {scrollState.canScroll ? (
                    <button
                        type="button"
                        aria-label="التمرير لليمين"
                        disabled={scrollState.atStart}
                        onClick={() => scrollByStep(-1)}
                        className={navBtnClass}
                    >
                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                ) : null}

                <div
                    ref={scrollRef}
                    dir="ltr"
                    className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth py-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    <div dir="rtl" className="inline-flex w-max max-w-none flex-nowrap items-center gap-1.5 px-0.5">
                        {children}
                    </div>
                </div>

                {scrollState.canScroll ? (
                    <button
                        type="button"
                        aria-label="التمرير لليسار"
                        disabled={scrollState.atEnd}
                        onClick={() => scrollByStep(1)}
                        className={navBtnClass}
                    >
                        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                ) : null}
            </div>

            {scrollState.canScroll ? (
                <div
                    role="presentation"
                    className="relative mx-7 mt-1 h-[2px] cursor-pointer rounded-full bg-white/[0.06]"
                    onClick={(e) => jumpToTrack(e.clientX, e.currentTarget)}
                >
                    <div
                        className="pointer-events-none absolute top-0 h-[2px] rounded-full bg-[#E6C673]/50 shadow-[0_0_8px_rgba(230,198,115,0.22)] transition-[left,width] duration-200 ease-out"
                        style={{
                            left: `${scrollState.thumbLeft}%`,
                            width: `${scrollState.thumbWidth}%`,
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
}

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

    const filterChipIdle =
        'shrink-0 inline-flex items-center whitespace-nowrap rounded-full border border-transparent bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/50 backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.06] hover:text-white/75';
    const filterChipActive =
        'shrink-0 inline-flex items-center whitespace-nowrap rounded-full border border-[#E6C673]/20 bg-[#E6C673]/[0.08] px-2.5 py-1 text-[10px] font-semibold text-[#E6C673] backdrop-blur-sm shadow-[0_0_16px_rgba(230,198,115,0.06)]';
    const glassNavShell =
        'relative min-w-0 w-full rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] backdrop-blur-xl shadow-[0_8px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06)] px-1';
    const lawTabActive =
        'rounded-xl border border-[#E6C673]/22 bg-[#E6C673]/10 px-4 py-2 text-sm font-bold text-[#E6C673] backdrop-blur-md shadow-[0_0_22px_rgba(230,198,115,0.14)] transition';
    const lawTabIdle =
        'rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-white/50 transition hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-white/75';

    return (
        <div
            key="criminal-tab-legal-codes-v2"
            className="flex min-w-0 flex-col p-6 max-w-5xl mx-auto w-full gap-4 print:text-black"
        >
            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={legalCodeSearch}
                        onChange={(e) => setLegalCodeSearch(e.target.value)}
                        placeholder="بحث برقم المادة أو كلمة مفتاحية..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                    />
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
                {legalCodeTabOptions.map(([tab, label]) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => startTransition(() => setLegalCodeTab(tab))}
                        className={legalCodeTab === tab ? lawTabActive : lawTabIdle}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {legalCodeTab === 'penal' ? (
                <div className={`${glassNavShell} space-y-1`}>
                    <HorizontalScrollRail>
                        <button
                            type="button"
                            onClick={() => {
                                setPenalGeneralFilter(null);
                                setPenalSubFilter(null);
                            }}
                            className={!penalGeneralFilter ? filterChipActive : filterChipIdle}
                        >
                            الكل
                        </button>
                        {PENAL_LAW_FILTER_GENERAL_KEYS.map((generalKey) => {
                            const entry = PENAL_LAW_FILTERS[generalKey];
                            const isActive = penalGeneralFilter === generalKey;
                            return (
                                <button
                                    key={generalKey}
                                    type="button"
                                    onClick={() => {
                                        setPenalGeneralFilter(generalKey);
                                        setPenalSubFilter(null);
                                    }}
                                    className={isActive ? filterChipActive : filterChipIdle}
                                >
                                    <span className="font-bold">{generalKey}</span>
                                </button>
                            );
                        })}
                    </HorizontalScrollRail>
                    {penalGeneralFilter &&
                    Object.keys(PENAL_LAW_FILTERS[penalGeneralFilter]?.sub ?? {}).length > 0 ? (
                        <div className="border-t border-white/[0.05] pt-1">
                            <HorizontalScrollRail>
                                <button
                                    type="button"
                                    onClick={() => setPenalSubFilter(null)}
                                    className={!penalSubFilter ? filterChipActive : filterChipIdle}
                                >
                                    <span className="font-bold">كل القسم</span>
                                    <span className="mr-1 font-medium tabular-nums opacity-70">
                                        {PENAL_LAW_FILTERS[penalGeneralFilter].range[0]}–
                                        {PENAL_LAW_FILTERS[penalGeneralFilter].range[1]}
                                    </span>
                                </button>
                                {Object.entries(PENAL_LAW_FILTERS[penalGeneralFilter].sub).map(
                                    ([subKey, subNums]) => {
                                        const isActive = penalSubFilter === subKey;
                                        return (
                                            <button
                                                key={subKey}
                                                type="button"
                                                onClick={() => setPenalSubFilter(subKey)}
                                                className={isActive ? filterChipActive : filterChipIdle}
                                            >
                                                <span className="font-bold">{subKey}</span>
                                                <span className="mx-0.5 font-medium tabular-nums opacity-70">
                                                    ·{formatSubArticlesLabel(subNums)}
                                                </span>
                                            </button>
                                        );
                                    },
                                )}
                            </HorizontalScrollRail>
                        </div>
                    ) : null}
                </div>
            ) : legalCodeTab === 'procedure' ? (
                <div className={`${glassNavShell} space-y-1`}>
                    <HorizontalScrollRail>
                        <button
                            type="button"
                            onClick={() => {
                                setProcedureGeneralFilter(null);
                                setProcedureSubFilter(null);
                            }}
                            className={!procedureGeneralFilter ? filterChipActive : filterChipIdle}
                        >
                            الكل
                        </button>
                        {LAW_FILTER_GENERAL_KEYS.map((generalKey) => {
                            const entry = LAW_FILTERS[generalKey];
                            const isActive = procedureGeneralFilter === generalKey;
                            return (
                                <button
                                    key={generalKey}
                                    type="button"
                                    onClick={() => {
                                        setProcedureGeneralFilter(generalKey);
                                        setProcedureSubFilter(null);
                                    }}
                                    className={isActive ? filterChipActive : filterChipIdle}
                                >
                                    <span className="font-bold">{generalKey}</span>
                                    <span className="mr-1 font-medium tabular-nums opacity-70">
                                        {entry.range[0]}–{entry.range[1]}
                                    </span>
                                </button>
                            );
                        })}
                    </HorizontalScrollRail>
                    {procedureGeneralFilter &&
                    Object.keys(LAW_FILTERS[procedureGeneralFilter]?.sub ?? {}).length > 0 ? (
                        <div className="border-t border-white/[0.05] pt-1">
                            <HorizontalScrollRail>
                                <button
                                    type="button"
                                    onClick={() => setProcedureSubFilter(null)}
                                    className={!procedureSubFilter ? filterChipActive : filterChipIdle}
                                >
                                    <span className="font-bold">كل القسم</span>
                                    <span className="mr-1 font-medium tabular-nums opacity-70">
                                        {LAW_FILTERS[procedureGeneralFilter].range[0]}–
                                        {LAW_FILTERS[procedureGeneralFilter].range[1]}
                                    </span>
                                </button>
                                {Object.entries(LAW_FILTERS[procedureGeneralFilter].sub).map(
                                    ([subKey, subNums]) => {
                                        const isActive = procedureSubFilter === subKey;
                                        return (
                                            <button
                                                key={subKey}
                                                type="button"
                                                onClick={() => setProcedureSubFilter(subKey)}
                                                className={isActive ? filterChipActive : filterChipIdle}
                                            >
                                                <span className="font-bold">{subKey}</span>
                                                <span className="mx-0.5 font-medium tabular-nums opacity-70">
                                                    ·{formatSubArticlesLabel(subNums)}
                                                </span>
                                            </button>
                                        );
                                    },
                                )}
                            </HorizontalScrollRail>
                        </div>
                    ) : null}
                </div>
            ) : legalCodeTab === 'juvenile' ? (
                <div className={`${glassNavShell} space-y-1`}>
                    <HorizontalScrollRail>
                        <button
                            type="button"
                            onClick={() => {
                                setJuvenileGeneralFilter(null);
                                setJuvenileSubFilter(null);
                            }}
                            className={!juvenileGeneralFilter ? filterChipActive : filterChipIdle}
                        >
                            الكل
                        </button>
                        {JUVENILE_LAW_FILTER_GENERAL_KEYS.map((generalKey) => {
                            const entry = JUVENILE_LAW_FILTERS[generalKey];
                            const isActive = juvenileGeneralFilter === generalKey;
                            return (
                                <button
                                    key={generalKey}
                                    type="button"
                                    onClick={() => {
                                        setJuvenileGeneralFilter(generalKey);
                                        setJuvenileSubFilter(null);
                                    }}
                                    className={isActive ? filterChipActive : filterChipIdle}
                                >
                                    <span className="font-bold">{generalKey}</span>
                                    <span className="mr-1 font-medium tabular-nums opacity-70">
                                        {entry.range[0]}–{entry.range[1]}
                                    </span>
                                </button>
                            );
                        })}
                    </HorizontalScrollRail>
                    {juvenileGeneralFilter &&
                    Object.keys(JUVENILE_LAW_FILTERS[juvenileGeneralFilter]?.sub ?? {}).length > 0 ? (
                        <div className="border-t border-white/[0.05] pt-1">
                            <HorizontalScrollRail>
                                {Object.entries(JUVENILE_LAW_FILTERS[juvenileGeneralFilter].sub).map(
                                    ([subKey, subNums]) => {
                                        const isActive = juvenileSubFilter === subKey;
                                        return (
                                            <button
                                                key={subKey}
                                                type="button"
                                                onClick={() => setJuvenileSubFilter(subKey)}
                                                className={isActive ? filterChipActive : filterChipIdle}
                                            >
                                                <span className="font-bold">{subKey}</span>
                                                <span className="mx-0.5 font-medium tabular-nums opacity-70">
                                                    ·{formatSubArticlesLabel(subNums)}
                                                </span>
                                            </button>
                                        );
                                    },
                                )}
                            </HorizontalScrollRail>
                        </div>
                    ) : null}
                </div>
            ) : null}
            {showLegalCodesLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm font-bold text-white/65 text-center">
                    جاري تحميل المتون القانونية...
                </div>
            ) : legalCodesLoadError ? (
                <div className="rounded-2xl border border-red-500/35 bg-red-500/10 p-6 text-sm font-bold text-red-200 text-center">
                    تعذر تحميل المتون القانونية: {legalCodesLoadError}
                </div>
            ) : filteredLegalCodeArticles.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm font-bold text-white/65 text-center">
                    لا توجد مواد قانونية محقونة بعد في هذا القسم.
                </div>
            ) : (
                <div className={`space-y-4 ${isSearchPending ? 'opacity-80' : ''}`}>
                    {pinnedFilteredLegalArticles.length > 0 ? (
                        <div className="overflow-hidden rounded-2xl border border-[#E6C673]/25 bg-gradient-to-l from-[#E6C673]/10 to-white/[0.03] p-3 backdrop-blur-xl shadow-[0_8px_28px_rgba(230,198,115,0.08)]">
                            <div className="mb-3 flex items-center gap-2">
                                <Pin className="h-4 w-4 fill-[#E6C673] text-[#E6C673]" />
                                <span className="text-sm font-black text-[#E6C673]">المواد المثبتة</span>
                            </div>
                            <div className="space-y-3">
                                {pinnedFilteredLegalArticles.map((a) => (
                                    <div
                                        key={`pinned-${a.id}`}
                                        className="rounded-xl border border-[#E6C673]/30 bg-black/25 p-4 backdrop-blur-md"
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <span className="text-sm font-black text-[#E6C673]">
                                                <LegalSearchHighlightedText
                                                    text={formatLegalArticleTitle(a.articleNumber)}
                                                    query={searchHighlightQuery}
                                                />
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => togglePinLegalArticle(a.id)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/60 hover:border-red-400/40 hover:text-red-300"
                                                title="إلغاء التثبيت"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="max-h-56 overflow-y-auto text-sm leading-relaxed text-white/90 whitespace-pre-wrap">
                                            <LegalSearchHighlightedText
                                                text={a.text}
                                                query={searchHighlightQuery}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md">
                        <button
                            type="button"
                            onClick={() => setIsLegalCodesCatalogOpen((v) => !v)}
                            className="flex w-full items-center justify-between gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3 text-right transition hover:bg-white/[0.04]"
                        >
                            <span className="text-sm font-bold text-white/85">
                                جميع المواد
                                <span className="mr-2 text-xs font-medium text-white/45">
                                    ({unpinnedFilteredLegalArticles.length})
                                </span>
                            </span>
                            <ChevronDown
                                className={`h-5 w-5 shrink-0 text-[#E6C673] transition-transform ${isLegalCodesCatalogOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {isLegalCodesCatalogOpen ? (
                            <div className="space-y-2 p-3">
                                {visibleUnpinnedLegalArticles.length === 0 ? (
                                    <p className="py-4 text-center text-xs font-bold text-white/50">
                                        {unpinnedFilteredLegalArticles.length === 0 &&
                                        pinnedFilteredLegalArticles.length > 0
                                            ? 'كل المواد الحالية مثبتة في الأعلى.'
                                            : 'لا توجد مواد لعرضها.'}
                                    </p>
                                ) : (
                                    visibleUnpinnedLegalArticles.map((a) => (
                                        <div
                                            key={a.id}
                                            className="rounded-xl border border-white/10 bg-black/20 p-3"
                                        >
                                            <div className="mb-2 text-xs font-black text-[#E6C673]">
                                                <LegalSearchHighlightedText
                                                    text={formatLegalArticleTitle(a.articleNumber)}
                                                    query={searchHighlightQuery}
                                                />
                                            </div>
                                            <div className="text-sm leading-relaxed text-white/88 whitespace-pre-wrap">
                                                <LegalSearchHighlightedText
                                                    text={a.text}
                                                    query={searchHighlightQuery}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                                {unpinnedFilteredLegalArticles.length > visibleUnpinnedLegalArticles.length ? (
                                    <div className="flex justify-center pt-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setVisibleLegalArticlesCount(
                                                    (v) => v + LEGAL_ARTICLES_PAGE_SIZE,
                                                )
                                            }
                                            className="rounded-lg border border-[#E6C673]/30 px-4 py-2 text-xs font-bold text-[#E6C673] hover:bg-[#E6C673]/10"
                                        >
                                            تحميل المزيد
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
