import React from 'react';
import { LayoutGrid, List, Search } from 'lucide-react';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';

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
    <div className="px-8 pt-4 pb-2 space-y-3 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={onToggleSearch}
                className={`h-10 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    searchOpen
                        ? 'border-[#E6C673]/50 bg-[#E6C673]/15 text-[#E6C673]'
                        : 'border-white/15 bg-white/5 text-white/70 hover:text-white'
                }`}
            >
                <Search size={16} />
                بحث
            </button>
            {showJurisdictionTabs ? (
                <div
                    className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1"
                    role="tablist"
                    aria-label="فلترة اختصاص الدعوى"
                >
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
                                className={`h-9 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                    isActive
                                        ? isCriminal
                                            ? 'bg-red-600/90 text-white'
                                            : 'bg-[#E6C673] text-[#0B1021]'
                                        : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {isCriminal ? `🔨 ${tab.label}` : tab.label}
                            </button>
                        );
                    })}
                </div>
            ) : null}
            <div className="flex items-center gap-1 mr-auto rounded-xl border border-white/10 p-0.5 bg-white/5">
                <button
                    type="button"
                    title="عرض شبكي"
                    onClick={() => onViewModeChange('grid')}
                    className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
                        viewMode === 'grid' ? 'bg-[#E6C673]/20 text-[#E6C673]' : 'text-white/50 hover:text-white'
                    }`}
                >
                    <LayoutGrid size={16} />
                </button>
                <button
                    type="button"
                    title="عرض مضغوط"
                    onClick={() => onViewModeChange('compact')}
                    className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
                        viewMode === 'compact' ? 'bg-[#E6C673]/20 text-[#E6C673]' : 'text-white/50 hover:text-white'
                    }`}
                >
                    <List size={16} />
                </button>
            </div>
        </div>
        {searchOpen ? (
            <div className="relative">
                <Search
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                    size={18}
                />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full h-11 pr-12 pl-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#E6C673]/50"
                />
            </div>
        ) : null}
    </div>
);
