import React from 'react';
import { LayoutGrid, List, Search } from 'lucide-react';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import {
    ARCHIVE_SEARCH_INPUT,
    ARCHIVE_SEGMENT_BTN_ACTIVE,
    ARCHIVE_SEGMENT_BTN_BASE,
    ARCHIVE_SEGMENT_BTN_CRIMINAL_ACTIVE,
    ARCHIVE_SEGMENT_BTN_INACTIVE,
    ARCHIVE_SEGMENT_SHELL,
    ARCHIVE_TOOLBAR_LABEL,
    ARCHIVE_TOOLBAR_SECTION,
} from '../archiveToolbarStyles';

export type ArchiveDossierViewMode = 'grid' | 'compact';

const JURISDICTION_TABS: { id: LawsuitJurisdictionTab; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'civil', label: 'القضاء المدني' },
    { id: 'personal', label: 'الأحوال الشخصية' },
    { id: 'criminal', label: 'جزائي' },
];

export type ArchiveDossierToolbarProps = {
    showJurisdictionTabs: boolean;
    jurisdictionTab: LawsuitJurisdictionTab;
    onJurisdictionTabChange: (value: LawsuitJurisdictionTab) => void;
    searchOpen: boolean;
    onToggleSearch: () => void;
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    searchPlaceholder?: string;
    viewMode: ArchiveDossierViewMode;
    onViewModeChange: (mode: ArchiveDossierViewMode) => void;
};

export const ArchiveDossierToolbar: React.FC<ArchiveDossierToolbarProps> = ({
    showJurisdictionTabs,
    jurisdictionTab,
    onJurisdictionTabChange,
    searchOpen,
    onToggleSearch,
    searchQuery,
    onSearchQueryChange,
    searchPlaceholder = 'ابحث في الإضابير…',
    viewMode,
    onViewModeChange,
}) => (
    <div className={`${ARCHIVE_TOOLBAR_SECTION} space-y-2.5`}>
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                <button
                    type="button"
                    onClick={onToggleSearch}
                    className={`${ARCHIVE_SEGMENT_BTN_BASE} inline-flex items-center gap-1.5 border ${
                        searchOpen
                            ? 'border-[#E6C673]/45 bg-[#E6C673]/12 text-[#E6C673]'
                            : 'border-white/10 bg-[#0B1021]/60 text-white/70 hover:text-white'
                    }`}
                >
                    <Search size={15} />
                    بحث
                </button>

                {showJurisdictionTabs ? (
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className={ARCHIVE_TOOLBAR_LABEL}>الاختصاص</span>
                        <div className={ARCHIVE_SEGMENT_SHELL} role="tablist" aria-label="فلترة اختصاص الدعوى">
                            {JURISDICTION_TABS.map((tab) => {
                                const isActive = jurisdictionTab === tab.id;
                                const isCriminal = tab.id === 'criminal';
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        data-testid={
                                            isCriminal ? 'archive-tab-criminal' : `archive-jurisdiction-${tab.id}`
                                        }
                                        onClick={() => onJurisdictionTabChange(tab.id)}
                                        className={`${ARCHIVE_SEGMENT_BTN_BASE} ${
                                            isActive
                                                ? isCriminal
                                                    ? ARCHIVE_SEGMENT_BTN_CRIMINAL_ACTIVE
                                                    : ARCHIVE_SEGMENT_BTN_ACTIVE
                                                : ARCHIVE_SEGMENT_BTN_INACTIVE
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
                <span className={ARCHIVE_TOOLBAR_LABEL}>العرض</span>
                <div className={`${ARCHIVE_SEGMENT_SHELL} p-0.5`}>
                    <button
                        type="button"
                        title="عرض شبكي"
                        onClick={() => onViewModeChange('grid')}
                        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                            viewMode === 'grid' ? 'bg-[#E6C673]/20 text-[#E6C673]' : 'text-white/50 hover:text-white'
                        }`}
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button
                        type="button"
                        title="عرض مضغوط"
                        onClick={() => onViewModeChange('compact')}
                        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                            viewMode === 'compact' ? 'bg-[#E6C673]/20 text-[#E6C673]' : 'text-white/50 hover:text-white'
                        }`}
                    >
                        <List size={16} />
                    </button>
                </div>
            </div>
        </div>

        {searchOpen ? (
            <div className="relative">
                <Search
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
                    size={17}
                />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className={ARCHIVE_SEARCH_INPUT}
                />
            </div>
        ) : null}
    </div>
);
