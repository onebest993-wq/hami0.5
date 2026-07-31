import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    GLOBAL_SEARCH_BACKDROP_CLASS,
    GLOBAL_SEARCH_DIALOG_CHROME_CLASS,
    GLOBAL_SEARCH_LAYER_CLASS,
    GlobalSearchOverlayDialogChrome,
} from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayDialogChrome';
import { writeGlobalSearchDraftQuery } from '@/app/runtime/globalSearchDraftQuery';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { useOverlayCloseArm } from '@/app/hooks/useOverlayCloseArm';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
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

type GlobalSearchInstantShellProps = {
    onClose?: () => void;
    /** أثناء keepAlive مغلق — لا تُرسم الطبقة */
    open?: boolean;
    userId?: string | null;
};

/**
 * قشرة بحث = نفس DialogChrome النهائي أثناء انتظار chunk — بلا وميض هيكل/ألوان.
 */
export function GlobalSearchInstantShell({
    onClose,
    open = true,
    userId = null,
}: GlobalSearchInstantShellProps): React.ReactElement | null {
    const inputRef = useRef<HTMLInputElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState('');
    const [recentSearches] = useState(() => readGlobalSearchRecentSearchesSync(userId));
    const close = onClose ?? (() => undefined);
    const { requestClose } = useOverlayCloseArm(open);
    const keyboardInset = useMobileKeyboardInset();

    useBodyScrollLock(open);

    const onQueryChange = (value: string) => {
        const next = clampGlobalSearchQuery(value);
        setQuery(next);
        writeGlobalSearchDraftQuery(next);
    };

    const resultsMaxHeight = useMemo(
        () =>
            keyboardInset > 0
                ? `min(calc(62dvh - ${Math.min(keyboardInset, 200)}px), ${560 - Math.min(keyboardInset, 200)}px)`
                : 'min(62dvh, 560px)',
        [keyboardInset],
    );

    useEffect(() => {
        if (!open || !onClose) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose, open]);

    useEffect(() => {
        if (!open || !onClose) return;
        return registerNativeBackHandler(() => {
            onClose();
            return true;
        });
    }, [onClose, open]);

    if (!open) return null;

    return (
        <div
            className={GLOBAL_SEARCH_LAYER_CLASS}
            role="presentation"
            data-search-instant="true"
            data-search-open={open ? 'true' : 'false'}
        >
            <button
                type="button"
                aria-label="إغلاق البحث"
                className={GLOBAL_SEARCH_BACKDROP_CLASS}
                onClick={() => requestClose(close)}
            />
            <div
                role="dialog"
                aria-label="بحث شامل"
                aria-modal="true"
                data-testid="global-search-overlay"
                data-search-instant-shell="true"
                className={GLOBAL_SEARCH_DIALOG_CHROME_CLASS}
                style={{
                    paddingBottom:
                        keyboardInset > 0 ? `max(8px, ${keyboardInset}px)` : undefined,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <GlobalSearchOverlayDialogChrome
                    open={open}
                    onClose={close}
                    overlayRef={overlayRef}
                    inputRef={inputRef}
                    onKeyDownCapture={() => undefined}
                    keyboardInset={keyboardInset}
                    resultsMaxHeight={resultsMaxHeight}
                    query={query}
                    setQuery={onQueryChange}
                    showEmptyState
                    headerBusy={false}
                    isEnrichingIndex={false}
                    recentSearches={recentSearches}
                    clearRecent={() => undefined}                    isSearching={false}
                    isLoadingIndex={false}
                    results={null}
                    flatResults={[]}
                    pick={() => undefined}
                    pinLookup={EMPTY_PIN_LOOKUP}
                    scanIndexForPreview={[]}
                    activeIndex={-1}
                    setActiveIndex={() => undefined}
                />
            </div>
        </div>
    );
}
