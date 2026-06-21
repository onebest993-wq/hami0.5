import React from 'react';
import { Search } from 'lucide-react';
import type {
    ExecutionArchiveLifecycleMode,
    ExecutionJurisdictionFilter,
    ExecutionPerspectiveFilter,
} from '../executionArchiveFilterUtils';
import {
    EXECUTION_JURISDICTION_TAB_DEFS,
    EXECUTION_PERSPECTIVE_TAB_DEFS,
} from '../executionArchiveFilterUtils';
import {
    ARCHIVE_FILTER_DECK,
    ARCHIVE_SEARCH_INPUT,
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

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 sm:gap-3">
            <span className={`${ARCHIVE_TOOLBAR_LABEL} sm:text-left`}>{label}</span>
            <div className="min-w-0">{children}</div>
        </div>
    );
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
    const isTrash = lifecycleMode === 'trash';

    return (
        <div className={`${ARCHIVE_TOOLBAR_SECTION} space-y-3`} dir="rtl">
            <div className="relative">
                <Search
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
                    size={17}
                />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    placeholder={
                        isTrash
                            ? 'ابحث في سلة المهملات…'
                            : 'ابحث برقم الإضبارة، اسم الدائن، المدين، أو نوع المطالبة…'
                    }
                    className={`${ARCHIVE_SEARCH_INPUT} ${
                        isTrash ? 'focus:border-rose-400/40 focus:ring-rose-400/10' : ''
                    }`}
                />
            </div>

            <div className={ARCHIVE_FILTER_DECK}>
                <FilterGroup label="الاختصاص">
                    <FilterTabList
                        tabs={EXECUTION_JURISDICTION_TAB_DEFS}
                        activeId={filterType}
                        onChange={onFilterTypeChange}
                        ariaLabel={isTrash ? 'فلترة اختصاص سلة المهملات' : 'فلترة اختصاص الإضبارة'}
                        testIdPrefix="execution-archive-filter"
                        counts={jurisdictionCounts}
                    />
                </FilterGroup>
                <div className="h-px bg-white/[0.05]" aria-hidden />
                <FilterGroup label="التمثيل">
                    <FilterTabList
                        tabs={EXECUTION_PERSPECTIVE_TAB_DEFS}
                        activeId={perspectiveFilter}
                        onChange={onPerspectiveFilterChange}
                        ariaLabel={isTrash ? 'فلترة تمثيل سلة المهملات' : 'فلترة تمثيل المحامي'}
                        testIdPrefix="execution-archive-perspective"
                    />
                </FilterGroup>
            </div>
        </div>
    );
};
