import React from 'react';
import {
    GLOBAL_SEARCH_BACKDROP_CLASS,
    GLOBAL_SEARCH_DIALOG_CHROME_CLASS,
    GLOBAL_SEARCH_LAYER_CLASS,
    GlobalSearchOverlayDialogChrome,
} from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayDialogChrome';
import type { GlobalSearchOverlayShellProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';
import { useOverlayCloseArm } from '@/app/hooks/useOverlayCloseArm';
import { inertProps } from '@/app/utils/inertProps';

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
}: GlobalSearchOverlayShellProps) {
    const wasOpenRef = React.useRef(open);
    const layerRef = React.useRef<HTMLDivElement | null>(null);
    const { requestClose } = useOverlayCloseArm(open);

    React.useEffect(() => {
        if (wasOpenRef.current && !open) {
            onExitComplete?.();
        }
        wasOpenRef.current = open;
    }, [open, onExitComplete]);

    /* يزيل بقايا conceal/reveal على الـ DOM حتى لا يبقى input «hidden» لـ a11y/Playwright */
    React.useLayoutEffect(() => {
        const el = layerRef.current;
        if (!el) return;
        if (open) {
            el.style.setProperty('visibility', 'visible');
            el.style.setProperty('pointer-events', 'auto');
            el.setAttribute('data-search-open', 'true');
            el.removeAttribute('aria-hidden');
            el.removeAttribute('inert');
        } else if (keepWarm) {
            el.style.setProperty('visibility', 'hidden');
            el.style.setProperty('pointer-events', 'none');
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
            style={{
                visibility: hidden ? 'hidden' : 'visible',
                pointerEvents: hidden ? 'none' : 'auto',
            }}
            {...inertProps(hidden)}
        >
            <button
                type="button"
                aria-label="إغلاق البحث"
                tabIndex={hidden ? -1 : 0}
                className={GLOBAL_SEARCH_BACKDROP_CLASS}
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
                style={{
                    paddingBottom:
                        keyboardInset > 0 ? `max(8px, ${keyboardInset}px)` : undefined,
                }}
                className={GLOBAL_SEARCH_DIALOG_CHROME_CLASS}
                onClick={(e) => e.stopPropagation()}
            >
                <GlobalSearchOverlayDialogChrome {...chromeProps} />
            </div>
        </div>
    );
}
