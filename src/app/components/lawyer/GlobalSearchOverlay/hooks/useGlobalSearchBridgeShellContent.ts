import { useCallback, useMemo, useState } from 'react';

import type { GlobalSearchOverlayShellContentProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { peekGlobalSearchDraftQuery, writeGlobalSearchDraftQuery } from '@/app/runtime/globalSearchDraftQuery';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';
import { peekGlobalSearchRecentSearches } from '@/app/services/search/globalSearchRecentsPeekLite';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';

const EMPTY_PIN_LOOKUP: WorkspacePinLookupContext = {
    files: [],
    executionFiles: [],
    lawsuitFiles: [],
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
    const recentSearches = useMemo(() => peekGlobalSearchRecentSearches(userId), [userId]);

    const setQuery = useCallback((value: string) => {
        const next = clampGlobalSearchQuery(value);
        setQueryState(next);
        writeGlobalSearchDraftQuery(next);
    }, []);

    return useMemo(
        () => ({
            onKeyDownCapture: () => undefined,
            keyboardInset,
            query,
            setQuery,
            showEmptyState: true,
            headerBusy: false,
            isEnrichingIndex: false,
            recentSearches,
            clearRecent: () => undefined,
            searchUiState: 'idle' as const,
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
