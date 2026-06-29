import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type {
    ExecutionArchiveLifecycleMode,
    ExecutionJurisdictionFilter,
    ExecutionPerspectiveFilter,
} from '../executionArchiveFilterUtils';
import {
    EXECUTION_JURISDICTION_LABELS,
    EXECUTION_JURISDICTION_TAB_DEFS,
    EXECUTION_PERSPECTIVE_LABELS,
    EXECUTION_PERSPECTIVE_TAB_DEFS,
} from '../executionArchiveFilterUtils';
import {
    ARCHIVE_FILTER_DECK,
    ARCHIVE_SEGMENT_BTN_ACTIVE,
    ARCHIVE_SEGMENT_BTN_BASE,
    ARCHIVE_SEGMENT_BTN_INACTIVE,
    ARCHIVE_SEGMENT_SHELL,
    ARCHIVE_TOOLBAR_LABEL,
    ARCHIVE_TOOLBAR_SECTION,
} from '../archiveToolbarStyles';

export type ExecutionArchiveFilter = ExecutionJurisdictionFilter;

export type ExecutionArchiveToolbarProps = {
    lifecycleMode: ExecutionArchiveLifecycleMode;
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    filterType: ExecutionJurisdictionFilter;
    onFilterTypeChange: (value: ExecutionJurisdictionFilter) => void;
    perspectiveFilter: ExecutionPerspectiveFilter;
    onPerspectiveFilterChange: (value: ExecutionPerspectiveFilter) => void;
    jurisdictionCounts?: Partial<Record<ExecutionJurisdictionFilter, number>>;
};

function FilterTabList<T extends string>({
    tabs,
    activeId,
    onChange,
    ariaLabel,
    testIdPrefix,
    counts,
}: {
    tabs: { id: T; label: string }[];
    activeId: T;
    onChange: (id: T) => void;
    ariaLabel: string;
    testIdPrefix: string;
    counts?: Partial<Record<T, number>>;
}) {
    return (
        <div className={`${ARCHIVE_SEGMENT_SHELL} w-full`} role="tablist" aria-label={ariaLabel}>
            {tabs.map((tab) => {
                const isActive = activeId === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        data-testid={`${testIdPrefix}-${tab.id}`}
                        onClick={() => onChange(tab.id)}
                        className={`${ARCHIVE_SEGMENT_BTN_BASE} inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 min-w-[4.25rem] shrink-0 ${
                            isActive ? ARCHIVE_SEGMENT_BTN_ACTIVE : ARCHIVE_SEGMENT_BTN_INACTIVE
                        }`}
                    >
                        <span>{tab.label}</span>
                        {typeof counts?.[tab.id] === 'number' ? (
                            <span
                                className={`min-w-[1.15rem] h-4 px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center tabular-nums ${
                                    isActive ? 'bg-[#0B1021]/15 text-[#0B1021]' : 'bg-white/10 text-white/55'
                                }`}
                            >
                                {counts[tab.id]! > 99 ? '99+' : counts[tab.id]}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}

function FilterRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
            <span className={`${ARCHIVE_TOOLBAR_LABEL} sm:w-[3.25rem] sm:shrink-0`}>{label}</span>
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}

function focusToneClass(isTrash: boolean, isArchived: boolean): string {
    if (isTrash) return 'focus-within:border-rose-400/40 focus-within:ring-rose-400/10';
    if (isArchived) return 'focus-within:border-amber-400/40 focus-within:ring-amber-400/10';
    return 'focus-within:border-[#E6C673]/45 focus-within:ring-[#E6C673]/15';
}

export const ExecutionArchiveToolbar: React.FC<ExecutionArchiveToolbarProps> = ({
    lifecycleMode,
    searchQuery,
    onSearchQueryChange,
    filterType,
    onFilterTypeChange,
    perspectiveFilter,
    onPerspectiveFilterChange,
    jurisdictionCounts,
}) => {
    const filtersPanelId = useId();
    const isTrash = lifecycleMode === 'trash';
    const isArchived = lifecycleMode === 'archived';

    const hasActiveFilters = filterType !== 'all' || perspectiveFilter !== 'all';
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    useEffect(() => {
        if (!hasActiveFilters) setFiltersExpanded(false);
    }, [lifecycleMode, hasActiveFilters]);

    const searchPlaceholder = isTrash
        ? 'ابحث في سلة المهملات…'
        : isArchived
          ? 'ابحث في مخزن الأرشيف…'
          : 'ابحث في الإضابير…';

    const jurisdictionAria = isTrash
        ? 'فلترة اختصاص سلة المهملات'
        : isArchived
          ? 'فلترة اختصاص الأرشيف'
          : 'فلترة اختصاص الإضبارة';

    const perspectiveAria = isTrash
        ? 'فلترة تمثيل سلة المهملات'
        : isArchived
          ? 'فلترة تمثيل الأرشيف'
          : 'فلترة تمثيل المحامي';

    const activeFilterChips = useMemo(() => {
        const chips: string[] = [];
        if (filterType !== 'all') chips.push(EXECUTION_JURISDICTION_LABELS[filterType]);
        if (perspectiveFilter !== 'all') chips.push(EXECUTION_PERSPECTIVE_LABELS[perspectiveFilter]);
        return chips;
    }, [filterType, perspectiveFilter]);

    const toggleFilters = useCallback(() => {
        setFiltersExpanded((open) => !open);
    }, []);

    const focusShell = focusToneClass(isTrash, isArchived);

    return (
        <div className={ARCHIVE_TOOLBAR_SECTION} dir="rtl">
            <div className={ARCHIVE_FILTER_DECK} data-testid="execution-archive-search-deck">
                <div
                    className={`flex h-10 w-full items-stretch overflow-hidden rounded-xl border border-white/10 bg-[#0B1021]/80 transition-all focus-within:ring-1 ${focusShell}`}
                >
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        data-testid="execution-archive-search"
                        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white placeholder:text-white/35 outline-none"
                        aria-controls={filtersPanelId}
                        aria-expanded={filtersExpanded}
                    />
                    <div className="flex shrink-0 items-center gap-0.5 border-r border-white/10 px-1.5">
                        <button
                            type="button"
                            data-testid="execution-archive-filters-toggle"
                            aria-label={filtersExpanded ? 'إخفاء التصنيفات' : 'إظهار التصنيفات'}
                            aria-expanded={filtersExpanded}
                            aria-controls={filtersPanelId}
                            onClick={toggleFilters}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                filtersExpanded || hasActiveFilters
                                    ? 'bg-[#E6C673]/15 text-[#E6C673]'
                                    : 'text-white/45 hover:bg-white/[0.08] hover:text-white/80'
                            }`}
                        >
                            <ChevronDown
                                size={16}
                                strokeWidth={2.25}
                                className={`transition-transform duration-200 ${
                                    filtersExpanded ? 'rotate-180' : ''
                                }`}
                            />
                        </button>
                        <span
                            className="flex h-8 w-8 items-center justify-center text-white/35 pointer-events-none"
                            aria-hidden
                        >
                            <Search size={17} />
                        </span>
                    </div>
                </div>

                {!filtersExpanded && hasActiveFilters ? (
                    <button
                        type="button"
                        onClick={() => setFiltersExpanded(true)}
                        className="mt-2 flex w-full flex-wrap items-center gap-1.5 text-right"
                        data-testid="execution-archive-active-filters-summary"
                    >
                        <span className="text-[10px] font-bold text-white/40">مفعّل:</span>
                        {activeFilterChips.map((chip) => (
                            <span
                                key={chip}
                                className="rounded-full border border-[#E6C673]/30 bg-[#E6C673]/10 px-2 py-0.5 text-[10px] font-bold text-[#E6C673]/90"
                            >
                                {chip}
                            </span>
                        ))}
                    </button>
                ) : null}

                <div
                    id={filtersPanelId}
                    data-testid="execution-archive-filters-panel"
                    className={`grid transition-[grid-template-rows,opacity,margin,padding] duration-200 ease-out ${
                        filtersExpanded
                            ? 'mt-2.5 grid-rows-[1fr] border-t border-white/[0.06] pt-2.5 opacity-100'
                            : 'grid-rows-[0fr] opacity-0'
                    }`}
                    aria-hidden={!filtersExpanded}
                >
                    <div className="min-h-0 space-y-2 overflow-hidden">
                        <FilterRow label="الاختصاص">
                            <FilterTabList
                                tabs={EXECUTION_JURISDICTION_TAB_DEFS}
                                activeId={filterType}
                                onChange={onFilterTypeChange}
                                ariaLabel={jurisdictionAria}
                                testIdPrefix="execution-archive-filter"
                                counts={jurisdictionCounts}
                            />
                        </FilterRow>
                        <FilterRow label="التمثيل">
                            <FilterTabList
                                tabs={EXECUTION_PERSPECTIVE_TAB_DEFS}
                                activeId={perspectiveFilter}
                                onChange={onPerspectiveFilterChange}
                                ariaLabel={perspectiveAria}
                                testIdPrefix="execution-archive-perspective"
                            />
                        </FilterRow>
                    </div>
                </div>
            </div>
        </div>
    );
};
