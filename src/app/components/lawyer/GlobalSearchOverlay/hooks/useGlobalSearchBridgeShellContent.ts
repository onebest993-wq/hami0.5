import { useCallback, useMemo, useState } from 'react';

import {
    GLOBAL_SEARCH_RESULTS_MAX_HEIGHT,
} from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayLayout';
import type { GlobalSearchOverlayShellContentProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { peekGlobalSearchDraftQuery, writeGlobalSearchDraftQuery } from '@/app/runtime/globalSearchDraftQuery';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';
import { readGlobalSearchRecentSearchesSync } from '@/app/services/search/readGlobalSearchRecentSearchesSync';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';

const EMPTY_PIN_LOOKUP: WorkspacePinLookupContext = {
    files: [],
    executionFiles: [],
    notes: [],
    tasks: [],
    urgentCases: [],
    criminalCases: [],
    threadingTransactions: [],
};

/** محتوى القشرة أثناء انتظار chunk البحث — نفس هندسة الكيبورد */
export function useGlobalSearchBridgeShellContent(userId: string | null, open: boolean): GlobalSearchOverlayShellContentProps {
    const keyboardInset = useMobileKeyboardInset(open, true);
    const [query, setQueryState] = useState(() => clampGlobalSearchQuery(peekGlobalSearchDraftQuery()));
    const recentSearches = useMemo(() => readGlobalSearchRecentSearchesSync(userId), [userId]);

    const setQuery = useCallback((value: string) => {
        const next = clampGlobalSearchQuery(value);
        setQueryState(next);
        writeGlobalSearchDraftQuery(next);
    }, []);

    return useMemo(
        () => ({
            onKeyDownCapture: () => undefined,
            keyboardInset,
            resultsMaxHeight: GLOBAL_SEARCH_RESULTS_MAX_HEIGHT,
            query,
            setQuery,
            showEmptyState: true,
            headerBusy: false,
            isEnrichingIndex: false,
            recentSearches,
            clearRecent: () => undefined,
            isSearching: false,
            isLoadingIndex: false,
            results: null,
            flatResults: [],
            pick: () => undefined,
            pinLookup: EMPTY_PIN_LOOKUP,
            scanIndexForPreview: [],
            activeIndex: -1,
            setActiveIndex: () => undefined,
        }),
        [keyboardInset, query, recentSearches, setQuery],
    );
}
