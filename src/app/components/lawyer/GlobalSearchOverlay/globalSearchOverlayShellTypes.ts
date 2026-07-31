import type { KeyboardEvent, RefObject } from 'react';
import type { GroupedSearchResults, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';
import type { ClusterScanRecord } from '@/app/workspace/types';
import type { GlobalSearchScopeId } from '@/app/components/lawyer/GlobalSearchOverlay/searchScopes';

export type GlobalSearchOverlayShellProps = {
    open: boolean;
    /** إبقاء DOM مخفياً للتسخين — فتح فوري بلا إعادة تركيب */
    keepWarm?: boolean;
    onExitComplete?: () => void;
    onClose: () => void;
    overlayRef: RefObject<HTMLDivElement>;
    inputRef: RefObject<HTMLInputElement>;
    onKeyDownCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
    keyboardInset: number;
    resultsMaxHeight: string;
    query: string;
    setQuery: (value: string) => void;
    showEmptyState: boolean;
    headerBusy: boolean;
    isEnrichingIndex: boolean;
    recentSearches: string[];
    clearRecent: () => void;
    isSearching: boolean;
    isLoadingIndex: boolean;
    results: GroupedSearchResults | null;
    flatResults: GlobalSearchEntry[];
    pick: (entry: GlobalSearchEntry) => void;
    pinLookup: WorkspacePinLookupContext;
    scanIndexForPreview: ClusterScanRecord[];
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    searchScope?: GlobalSearchScopeId;
    onSearchScopeChange?: (scope: GlobalSearchScopeId) => void;
};
