import React from 'react';
import {
    GLOBAL_SEARCH_BACKDROP_CLASS,
    GLOBAL_SEARCH_DIALOG_CHROME_CLASS,
    GLOBAL_SEARCH_LAYER_CLASS,
    GlobalSearchOverlayDialogChrome,
} from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayDialogChrome';
import '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlay.css';
import type { GlobalSearchOverlayShellProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';
import { useOverlayCloseArm } from '@/app/hooks/useOverlayCloseArm';
import { inertProps } from '@/app/utils/inertProps';
import { clearGlobalSearchLayerImperativeStyles } from '@/app/runtime/globalSearchInstantPaint';
import { resolveGlobalSearchSheetStyle } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayLayout';

/** غلاف ثابت — keepWarm يبقي DOM مخفياً لفتح فوري بلا إعادة تركيب */
export function GlobalSearchOverlayStaticShell({
    open,
    keepWarm = false,
    onExitComplete,
    onClose,
    overlayRef,
    inputRef,
    onKeyDownCapture,
    keyboardInset,
    resultsMaxHeight,
    query,
    setQuery,
    showEmptyState,
    headerBusy,
    isEnrichingIndex,
    recentSearches,
    clearRecent,
    isSearching,
    isLoadingIndex,
    results,
    flatResults,
    pick,
    pinLookup,
    scanIndexForPreview,
    activeIndex,
    setActiveIndex,
    searchScope,
    onSearchScopeChange,
    focusArmed = true,
}: GlobalSearchOverlayShellProps) {
    const wasOpenRef = React.useRef(open);
    const layerRef = React.useRef<HTMLDivElement | null>(null);
    const { requestClose } = useOverlayCloseArm(open);
    const backdropArmed = open;

    React.useEffect(() => {
        if (wasOpenRef.current && !open) {
            onExitComplete?.();
        }
        wasOpenRef.current = open;
    }, [open, onExitComplete]);

    /* يزيل بقايا conceal/reveal على الـ DOM — CSS + React يتحكمان بالرؤية */
    React.useLayoutEffect(() => {
        const el = layerRef.current;
        if (!el) return;
        clearGlobalSearchLayerImperativeStyles(el);
        if (open) {
            el.setAttribute('data-search-open', 'true');
            el.removeAttribute('aria-hidden');
            el.removeAttribute('inert');
        } else if (keepWarm) {
            el.setAttribute('data-search-open', 'false');
            el.setAttribute('aria-hidden', 'true');
            el.setAttribute('inert', '');
        }
    }, [open, keepWarm]);

    if (!open && !keepWarm) return null;

    const chromeProps = {
        open,
        onClose,
        overlayRef,
        inputRef,
        onKeyDownCapture,
        keyboardInset,
        resultsMaxHeight,
        query,
        setQuery,
        showEmptyState,
        headerBusy,
        isEnrichingIndex,
        recentSearches,
        clearRecent,
        isSearching,
        isLoadingIndex,
        results,
        flatResults,
        pick,
        pinLookup,
        scanIndexForPreview,
        activeIndex,
        setActiveIndex,
        searchScope,
        onSearchScopeChange,
        focusArmed,
    };

    const hidden = !open;

    return (
        <div
            ref={layerRef}
            className={GLOBAL_SEARCH_LAYER_CLASS}
            role="presentation"
            aria-hidden={hidden || undefined}
            data-search-warm={keepWarm ? 'true' : undefined}
            data-search-open={open ? 'true' : 'false'}
            {...inertProps(hidden)}
        >
            <button
                type="button"
                aria-label="إغلاق البحث"
                tabIndex={hidden ? -1 : 0}
                className={GLOBAL_SEARCH_BACKDROP_CLASS}
                style={{ pointerEvents: hidden || !backdropArmed ? 'none' : 'auto' }}
                onClick={() => requestClose(onClose)}
            />

            <div
                role="dialog"
                aria-label="بحث شامل"
                aria-modal={open ? true : undefined}
                aria-busy={isEnrichingIndex || undefined}
                data-testid="global-search-overlay"
                ref={overlayRef}
                onKeyDownCapture={onKeyDownCapture}
                style={resolveGlobalSearchSheetStyle(keyboardInset)}
                className={GLOBAL_SEARCH_DIALOG_CHROME_CLASS}
                onClick={(e) => e.stopPropagation()}
            >
                <GlobalSearchOverlayDialogChrome {...chromeProps} />
            </div>
        </div>
    );
}
