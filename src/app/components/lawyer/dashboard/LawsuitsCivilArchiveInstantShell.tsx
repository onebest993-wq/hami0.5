import React, { useEffect, useState } from 'react';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import {
    ArchiveDossierToolbar,
    type ArchiveDossierViewMode,
} from '@/app/components/lawyer/ArchivePortal/components/ArchiveDossierToolbar';
import {
    prefetchLawsuitArchiveContent,
    prefetchLawsuitArchiveHubModule,
} from '@/app/runtime/hubArchiveLoader';
import { LAWSUIT_ARCHIVE_SCROLL_REGION_CLASS } from '@/app/components/lawyer/ArchivePortal/lawsuitArchiveInstantLayout';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';

export type LawsuitShellLifecycleChrome = {
    lawsuitViewMode: 'active' | 'trash' | 'archived';
    setLawsuitViewMode: (mode: 'active' | 'trash' | 'archived') => void;
    unifiedArchivedCount: number;
    lawsuitTrashedCount: number;
} | null;

type LawsuitsCivilArchiveInstantShellProps = {
    initialJurisdictionTab?: LawsuitJurisdictionTab;
    jurisdictionTab?: LawsuitJurisdictionTab;
    onJurisdictionTabChange?: (tab: LawsuitJurisdictionTab) => void;
    lifecycleChrome?: LawsuitShellLifecycleChrome;
    children?: React.ReactNode;
    searchQuery?: string;
    onSearchQueryChange?: (query: string) => void;
    viewMode?: ArchiveDossierViewMode;
    onViewModeChange?: (mode: ArchiveDossierViewMode) => void;
    onScrollParentRef?: (el: HTMLDivElement | null) => void;
    filesHydrating?: boolean;
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
    searchQuery: searchQueryProp,
    onSearchQueryChange,
    viewMode: viewModeProp,
    onViewModeChange,
    onScrollParentRef,
    filesHydrating = false,
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

    const [internalSearchQuery, setInternalSearchQuery] = useState('');
    const [internalViewMode, setInternalViewMode] = useState<ArchiveDossierViewMode>('grid');

    const searchQuery = searchQueryProp ?? internalSearchQuery;
    const viewMode = viewModeProp ?? internalViewMode;

    const setSearchQuery = (query: string) => {
        if (searchQueryProp === undefined) setInternalSearchQuery(query);
        onSearchQueryChange?.(query);
    };
    const setViewMode = (mode: ArchiveDossierViewMode) => {
        if (viewModeProp === undefined) setInternalViewMode(mode);
        onViewModeChange?.(mode);
    };

    useEffect(() => {
        prefetchLawsuitArchiveContent();
        prefetchLawsuitArchiveHubModule();
    }, []);

    const keyboardInset = useMobileKeyboardInset(true);
    const hasChildren = children != null;
    const lifecycleReady = lifecycleChrome != null;

    return (
        <div
            className="relative flex h-full min-h-0 flex-col bg-[#0B1021] font-['Tajawal']"
            {...(hasChildren ? {} : { 'aria-busy': true })}
            data-testid="lawsuits-civil-archive-instant-shell"
            data-files-hydrating={filesHydrating ? '1' : '0'}
        >
            <ArchiveDossierToolbar
                showJurisdictionTabs
                jurisdictionTab={jurisdictionTab}
                onJurisdictionTabChange={handleJurisdictionTabChange}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchPlaceholder="ابحث برقم الإضبارة أو اسم الدعوى..."
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                lifecycleViewMode={lifecycleReady ? lifecycleChrome.lawsuitViewMode : undefined}
                onLifecycleViewModeChange={
                    lifecycleReady ? lifecycleChrome.setLawsuitViewMode : undefined
                }
                archivedCount={lifecycleChrome?.unifiedArchivedCount ?? 0}
                trashedCount={lifecycleChrome?.lawsuitTrashedCount ?? 0}
            />

            <div
                ref={onScrollParentRef}
                className={LAWSUIT_ARCHIVE_SCROLL_REGION_CLASS}
                style={keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined}
            >
                {hasChildren ? (
                    children
                ) : (
                    <p
                        className="px-3 py-8 text-center text-sm text-white/45"
                        data-testid="lawsuit-vault-quiet-status"
                    >
                        جاري تجهيز الإضابير…
                    </p>
                )}
            </div>
        </div>
    );
}
