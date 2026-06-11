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
    isLegalEntityPerspectiveAllowed,
} from '../executionArchiveFilterUtils';

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
        <div
            className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1"
            role="tablist"
            aria-label={ariaLabel}
        >
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
                        className={`h-9 min-w-[4.25rem] rounded-lg px-3 text-xs font-bold transition-all whitespace-nowrap inline-flex items-center justify-center gap-1 ${
                            isActive
                                ? 'bg-[#E6C673] text-[#0B1021] shadow-[0_2px_12px_rgba(230,198,115,0.25)]'
                                : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        <span>{tab.label}</span>
                        {typeof counts?.[tab.id] === 'number' ? (
                            <span
                                className={`mr-1.5 min-w-[1.1rem] h-4 px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center ${
                                    isActive
                                        ? 'bg-[#0B1021]/15 text-[#0B1021]'
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
    const perspectiveTabs = EXECUTION_PERSPECTIVE_TAB_DEFS.filter(
        (tab) => tab.id !== 'legal_entity' || isLegalEntityPerspectiveAllowed(filterType)
    );

    return (
        <div className="px-8 pt-4 pb-3 border-b border-white/5 space-y-3" dir="rtl">
            <div className="flex flex-wrap items-center gap-2">
                <FilterTabList
                    tabs={EXECUTION_JURISDICTION_TAB_DEFS}
                    activeId={filterType}
                    onChange={onFilterTypeChange}
                    ariaLabel={
                        isTrash ? 'فلترة اختصاص سلة المهملات' : 'فلترة اختصاص الإضبارة'
                    }
                    testIdPrefix="execution-archive-filter"
                    counts={jurisdictionCounts}
                />
                <FilterTabList
                    tabs={perspectiveTabs}
                    activeId={perspectiveFilter}
                    onChange={onPerspectiveFilterChange}
                    ariaLabel={isTrash ? 'فلترة تمثيل سلة المهملات' : 'فلترة تمثيل المحامي'}
                    testIdPrefix="execution-archive-perspective"
                />
            </div>
            <div className="relative">
                <Search
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                    size={18}
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
                    className={`w-full h-11 pr-12 pl-4 rounded-xl border text-sm text-white placeholder:text-white/40 backdrop-blur-md transition-all focus:outline-none ${
                        isTrash
                            ? 'border-white/10 bg-white/[0.04] focus:border-rose-400/40'
                            : 'border-white/10 bg-white/5 focus:border-[#E6C673]/50'
                    }`}
                />
            </div>
        </div>
    );
};
