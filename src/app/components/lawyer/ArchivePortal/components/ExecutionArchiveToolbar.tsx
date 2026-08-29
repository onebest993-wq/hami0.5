import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { ExecutionArchiveFilterMark, ExecutionArchiveSearchMark } from '../executionArchiveMarks';
import type {
    ExecutionArchiveLifecycleMode,
    ExecutionDossierStatusFilter,
    ExecutionJurisdictionFilter,
    ExecutionPerspectiveFilter,
} from '../executionArchiveFilterPresentation';
import {
    EXECUTION_DOSSIER_STATUS_CHIP_DEFS,
    EXECUTION_DOSSIER_STATUS_LABELS,
    EXECUTION_JURISDICTION_LABELS,
    EXECUTION_JURISDICTION_TAB_DEFS,
    EXECUTION_PERSPECTIVE_LABELS,
    EXECUTION_PERSPECTIVE_TAB_DEFS,
} from '../executionArchiveFilterPresentation';
import {
    ARCHIVE_CHIP_BASE,
    ARCHIVE_TOOLBAR_LABEL,
} from '../archiveToolbarStyles';
import {
    EXECUTION_ARCHIVE_SEARCH_DECK,
    EXECUTION_ARCHIVE_SEARCH_GLYPH_SLOT,
    EXECUTION_ARCHIVE_SEARCH_ICON_CLUSTER,
    EXECUTION_ARCHIVE_SEARCH_ICON_SLOT,
    EXECUTION_ARCHIVE_SEARCH_SHELL,
    EXECUTION_CHIP_INACTIVE,
    EXECUTION_FILTER_CHIP_ACTIVE,
    EXECUTION_FILTER_TAB_ACTIVE,
    EXECUTION_SEGMENT_BTN_BASE,
    EXECUTION_SEGMENT_BTN_INACTIVE,
    EXECUTION_SEGMENT_SHELL,
} from '../executionArchiveVisualLite';
import { inertProps } from '@/app/utils/inertProps';

export type ExecutionArchiveFilter = ExecutionJurisdictionFilter;

export type ExecutionArchiveToolbarProps = {
    lifecycleMode: ExecutionArchiveLifecycleMode;
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    filterType: ExecutionJurisdictionFilter;
    onFilterTypeChange: (value: ExecutionJurisdictionFilter) => void;
    perspectiveFilter: ExecutionPerspectiveFilter;
    onPerspectiveFilterChange: (value: ExecutionPerspectiveFilter) => void;
    dossierStatusFilter: ExecutionDossierStatusFilter;
    onDossierStatusFilterChange: (value: ExecutionDossierStatusFilter) => void;
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
        <div className={`${EXECUTION_SEGMENT_SHELL} w-full`} role="tablist" aria-label={ariaLabel}>
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
                        className={`${EXECUTION_SEGMENT_BTN_BASE} inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 min-w-[4.25rem] shrink-0 ${
                            isActive ? EXECUTION_FILTER_TAB_ACTIVE : EXECUTION_SEGMENT_BTN_INACTIVE
                        }`}
                    >
                        <span>{tab.label}</span>
                        {typeof counts?.[tab.id] === 'number' ? (
                            <span
                                className={`min-w-[1.15rem] h-4 px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center tabular-nums ${
                                    isActive
                                        ? 'bg-[#F8F1DE]/18 text-[#F8F1DE]'
                                        : 'bg-white/10 text-white/55'
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

function searchFocusClass(isTrash: boolean, isArchived: boolean): string {
    if (isTrash) {
        return 'focus-within:border-rose-400/40 focus-within:shadow-[inset_0_0_0_1px_rgba(251,113,133,0.28)]';
    }
    if (isArchived) {
        return 'focus-within:border-amber-400/40 focus-within:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.28)]';
    }
    return 'focus-within:border-[#E6C673]/45 focus-within:shadow-[inset_0_0_0_1px_rgba(230,198,115,0.32)]';
}

export const ExecutionArchiveToolbar: React.FC<ExecutionArchiveToolbarProps> = ({
    lifecycleMode,
    searchQuery,
    onSearchQueryChange,
    filterType,
    onFilterTypeChange,
    perspectiveFilter,
    onPerspectiveFilterChange,
    dossierStatusFilter,
    onDossierStatusFilterChange,
    jurisdictionCounts,
}) => {
    const filtersPanelId = useId();
    const isTrash = lifecycleMode === 'trash';
    const isArchived = lifecycleMode === 'archived';

    const hasActiveFilters =
        dossierStatusFilter !== 'all' || filterType !== 'all' || perspectiveFilter !== 'all';
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    useEffect(() => {
        setFiltersExpanded(false);
    }, [lifecycleMode]);

    const searchPlaceholder =
        isTrash
            ? 'ابحث في سلة المهملات…'
            : isArchived
              ? 'ابحث في مخزن الأرشيف…'
              : 'ابحث برقم الإضبارة أو العنوان...';

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
        if (dossierStatusFilter !== 'all') {
            chips.push(EXECUTION_DOSSIER_STATUS_LABELS[dossierStatusFilter]);
        }
        if (filterType !== 'all') chips.push(EXECUTION_JURISDICTION_LABELS[filterType]);
        if (perspectiveFilter !== 'all') chips.push(EXECUTION_PERSPECTIVE_LABELS[perspectiveFilter]);
        return chips;
    }, [dossierStatusFilter, filterType, perspectiveFilter]);

    const toggleFilters = useCallback(() => {
        setFiltersExpanded((open) => !open);
    }, []);

    const showStatusFilters = !isTrash;
    const focusShell = searchFocusClass(isTrash, isArchived);

    return (
        <div
            className={EXECUTION_ARCHIVE_SEARCH_DECK}
            dir="rtl"
            data-testid="execution-archive-search-deck"
        >
            <div className={`${EXECUTION_ARCHIVE_SEARCH_SHELL} ${focusShell}`}>
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
                <div className={EXECUTION_ARCHIVE_SEARCH_ICON_CLUSTER}>
                    <button
                        type="button"
                        data-testid="execution-archive-filters-toggle"
                        aria-label={filtersExpanded ? 'إخفاء التصنيفات' : 'إظهار التصنيفات'}
                        aria-expanded={filtersExpanded}
                        aria-controls={filtersPanelId}
                        title="تصنيفات الإضبارة"
                        onClick={toggleFilters}
                        className={`${EXECUTION_ARCHIVE_SEARCH_ICON_SLOT} rounded-lg px-2 touch-manipulation ${
                            filtersExpanded || hasActiveFilters
                                ? 'bg-white/[0.1] text-white'
                                : 'text-slate-300'
                        }`}
                    >
                        <ExecutionArchiveFilterMark />
                    </button>
                    <span className={EXECUTION_ARCHIVE_SEARCH_GLYPH_SLOT} aria-hidden>
                        <ExecutionArchiveSearchMark />
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
                            className="rounded-md border border-white/16 bg-white/[0.1] px-2 py-0.5 text-[10px] font-bold text-white"
                        >
                            <span>{chip}</span>
                        </span>
                    ))}
                </button>
            ) : null}

            <div
                id={filtersPanelId}
                data-testid="execution-archive-filters-panel"
                className={filtersExpanded ? 'mt-2.5' : 'hidden'}
                aria-hidden={!filtersExpanded}
                {...inertProps(!filtersExpanded)}
            >
                <div className="space-y-2.5">
                    {showStatusFilters ? (
                        <FilterRow label="الحالة">
                            <div
                                className="flex flex-wrap items-center gap-2"
                                role="tablist"
                                aria-label="حالة الإضبارة التنفيذية"
                                data-testid="execution-archive-lifecycle-chips"
                            >
                                {EXECUTION_DOSSIER_STATUS_CHIP_DEFS.map((chip) => {
                                    const isActive = dossierStatusFilter === chip.id;
                                    return (
                                        <button
                                            key={chip.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            data-testid={`execution-archive-chip-${chip.id}`}
                                            onClick={() => onDossierStatusFilterChange(chip.id)}
                                            className={`${ARCHIVE_CHIP_BASE} ${
                                                isActive ? EXECUTION_FILTER_CHIP_ACTIVE : EXECUTION_CHIP_INACTIVE
                                            }`}
                                        >
                                            <span>{chip.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </FilterRow>
                    ) : null}
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
    );
};
