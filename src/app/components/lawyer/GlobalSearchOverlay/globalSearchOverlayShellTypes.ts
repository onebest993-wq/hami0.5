import type { KeyboardEvent, RefObject } from 'react';
import type { GroupedSearchResults, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';
import type { ClusterScanRecord } from '@/app/workspace/types';

type MotionPreset =
    | { initial: false; animate: Record<string, unknown>; exit: Record<string, unknown> }
    | {
          initial: Record<string, unknown>;
          animate: Record<string, unknown>;
          exit: Record<string, unknown>;
          transition: Record<string, unknown>;
      };

export type GlobalSearchOverlayShellProps = {
    open: boolean;
    onExitComplete?: () => void;
    onClose: () => void;
    overlayRef: RefObject<HTMLDivElement>;
    inputRef: RefObject<HTMLInputElement>;
    onKeyDownCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
    keyboardInset: number;
    sheetMotion?: MotionPreset;
    backdropMotion?: MotionPreset;
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
};
