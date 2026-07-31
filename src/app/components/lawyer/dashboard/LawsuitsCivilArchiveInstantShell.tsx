import React, { useEffect, useState } from 'react';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import {
    ArchiveDossierToolbar,
    type ArchiveDossierViewMode,
} from '@/app/components/lawyer/ArchivePortal/components/ArchiveDossierToolbar';
import { prefetchLawsuitArchiveContent } from '@/app/runtime/hubArchiveLoader';

const noop = () => undefined;

export type LawsuitShellLifecycleChrome = {
    lawsuitViewMode: 'active' | 'trash' | 'archived';
    setLawsuitViewMode: (mode: 'active' | 'trash' | 'archived') => void;
    unifiedArchivedCount: number;
    lawsuitTrashedCount: number;
    hasLawsuitLifecycle: boolean;
} | null;

type LawsuitsCivilArchiveInstantShellProps = {
    initialJurisdictionTab?: LawsuitJurisdictionTab;
    jurisdictionTab?: LawsuitJurisdictionTab;
    onJurisdictionTabChange?: (tab: LawsuitJurisdictionTab) => void;
    lifecycleChrome?: LawsuitShellLifecycleChrome;
    children?: React.ReactNode;
    searchOpen?: boolean;
    onSearchOpenChange?: (open: boolean) => void;
    searchQuery?: string;
    onSearchQueryChange?: (query: string) => void;
    viewMode?: ArchiveDossierViewMode;
    onViewModeChange?: (mode: ArchiveDossierViewMode) => void;
    onScrollParentRef?: (el: HTMLDivElement | null) => void;
};

/**
 * غلاف فوري لمخزن الدعاوى المضمّن — نفس هيكل ArchivePortal بدون انتظار chunk.
 */
export function LawsuitsCivilArchiveInstantShell({
    initialJurisdictionTab = 'all',
    jurisdictionTab: jurisdictionTabProp,
    onJurisdictionTabChange,
    lifecycleChrome = null,
    children,
    searchOpen: searchOpenProp,
    onSearchOpenChange,
    searchQuery: searchQueryProp,
    onSearchQueryChange,
    viewMode: viewModeProp,
    onViewModeChange,
    onScrollParentRef,
}: LawsuitsCivilArchiveInstantShellProps): React.ReactElement {
    const [internalJurisdictionTab, setInternalJurisdictionTab] =
        useState<LawsuitJurisdictionTab>(initialJurisdictionTab);
    const jurisdictionTab = jurisdictionTabProp ?? internalJurisdictionTab;
    const handleJurisdictionTabChange = (tab: LawsuitJurisdictionTab) => {
        if (jurisdictionTabProp === undefined) {
            setInternalJurisdictionTab(tab);
        }
        onJurisdictionTabChange?.(tab);
    };

    const [internalSearchOpen, setInternalSearchOpen] = useState(true);
    const [internalSearchQuery, setInternalSearchQuery] = useState('');
    const [internalViewMode, setInternalViewMode] = useState<ArchiveDossierViewMode>('grid');

    const searchOpen = searchOpenProp ?? internalSearchOpen;
    const searchQuery = searchQueryProp ?? internalSearchQuery;
    const viewMode = viewModeProp ?? internalViewMode;

    const setSearchOpen = (open: boolean) => {
        if (searchOpenProp === undefined) setInternalSearchOpen(open);
        onSearchOpenChange?.(open);
    };
    const setSearchQuery = (query: string) => {
        if (searchQueryProp === undefined) setInternalSearchQuery(query);
        onSearchQueryChange?.(query);
        if (query && !searchOpen) setSearchOpen(true);
    };
    const setViewMode = (mode: ArchiveDossierViewMode) => {
        if (viewModeProp === undefined) setInternalViewMode(mode);
        onViewModeChange?.(mode);
    };

    useEffect(() => {
        prefetchLawsuitArchiveContent();
    }, []);

    const hasChildren = children != null;
    const lawsuitViewMode = lifecycleChrome?.lawsuitViewMode ?? 'active';
    const setLawsuitViewMode = lifecycleChrome?.setLawsuitViewMode ?? noop;

    return (
        <div
            className="relative flex h-full min-h-0 flex-col bg-black/90 backdrop-blur-md font-['Tajawal']"
            {...(hasChildren ? {} : { 'aria-busy': true })}
            data-testid="lawsuits-civil-archive-instant-shell"
        >
            <ArchiveDossierToolbar
                showJurisdictionTabs
                jurisdictionTab={jurisdictionTab}
                onJurisdictionTabChange={handleJurisdictionTabChange}
                searchOpen={searchOpen}
                onToggleSearch={() => setSearchOpen(!searchOpen)}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchPlaceholder="ابحث برقم الإضبارة أو اسم الدعوى..."
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                lifecycleViewMode={lawsuitViewMode}
                onLifecycleViewModeChange={setLawsuitViewMode}
                archivedCount={lifecycleChrome?.unifiedArchivedCount ?? 0}
                trashedCount={lifecycleChrome?.lawsuitTrashedCount ?? 0}
            />

            <div
                ref={onScrollParentRef}
                className="flex-1 overflow-y-auto px-4 sm:px-5 lg:px-6 py-5 pb-[max(2rem,calc(5.25rem+env(safe-area-inset-bottom)))]"
            >
                {hasChildren ? (
                    children
                ) : (
                    <div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                        aria-busy="true"
                        aria-label="جاري تحميل الإضابير"
                    >
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 min-h-[132px] animate-pulse"
                                style={{ animationDelay: `${i * 50}ms` }}
                                aria-hidden
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="h-5 w-14 rounded-md bg-white/[0.08]" />
                                    <div className="h-5 w-5 rounded-full bg-white/[0.06]" />
                                </div>
                                <div className="h-4 w-[75%] rounded bg-white/[0.08] mb-2" />
                                <div className="h-3 w-[50%] rounded bg-white/[0.05] mb-4" />
                                <div className="h-3 w-[66%] rounded bg-white/[0.05]" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
