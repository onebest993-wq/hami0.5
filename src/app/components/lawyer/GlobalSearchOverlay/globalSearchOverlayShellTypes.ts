import type { KeyboardEvent, RefObject } from 'react';
import type { GroupedSearchResults, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';
import type { ClusterScanRecord } from '@/app/workspace/types';
import type { GlobalSearchScopeId } from '@/app/components/lawyer/GlobalSearchOverlay/searchScopes';
import type { GlobalSearchUiState } from '@/app/components/lawyer/GlobalSearchOverlay/utils/searchUiState';

export type GlobalSearchOverlayShellContentProps = {
    onKeyDownCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
    keyboardInset: number;
    query: string;
    setQuery: (value: string) => void;
    showEmptyState: boolean;
    headerBusy: boolean;
    isEnrichingIndex: boolean;
    recentSearches: string[];
    clearRecent: () => void;
    searchUiState?: GlobalSearchUiState;
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

export type GlobalSearchOverlayShellProps = GlobalSearchOverlayShellContentProps & {
    open: boolean;
    /** إبقاء DOM مخفياً للتسخين — فتح فوري بلا إعادة تركيب */
    keepWarm?: boolean;
    onExitComplete?: () => void;
    onClose: () => void;
    overlayRef: RefObject<HTMLDivElement>;
    inputRef: RefObject<HTMLInputElement>;
    /** false أثناء فتح الورقة — يمنع autofocus والكيبورد المبكر على الموبايل */
    focusArmed?: boolean;
};

export type GlobalSearchOverlayDialogChromeProps = Pick<
    GlobalSearchOverlayShellProps,
    | 'open'
    | 'onClose'
    | 'inputRef'
    | 'query'
    | 'setQuery'
    | 'showEmptyState'
    | 'headerBusy'
    | 'recentSearches'
    | 'clearRecent'
    | 'searchUiState'
    | 'results'
    | 'flatResults'
    | 'pick'
    | 'pinLookup'
    | 'scanIndexForPreview'
    | 'activeIndex'
    | 'setActiveIndex'
    | 'searchScope'
    | 'onSearchScopeChange'
    | 'focusArmed'
    | 'keyboardInset'
>;

