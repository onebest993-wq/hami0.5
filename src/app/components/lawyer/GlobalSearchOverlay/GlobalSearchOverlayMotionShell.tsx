import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
    GLOBAL_SEARCH_DIALOG_CHROME_CLASS,
    GlobalSearchOverlayDialogChrome,
} from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayDialogChrome';
import type { GlobalSearchOverlayShellProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';

export function GlobalSearchOverlayMotionShell({
    open,
    onExitComplete,
    onClose,
    overlayRef,
    inputRef,
    onKeyDownCapture,
    keyboardInset,
    sheetMotion,
    backdropMotion,
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
}: GlobalSearchOverlayShellProps) {
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
        sheetMotion,
        backdropMotion,
    };

    return (
        <AnimatePresence onExitComplete={onExitComplete}>
            {open ? (
                <motion.div
                    key="global-search-layer"
                    initial={backdropMotion.initial}
                    animate={backdropMotion.animate}
                    exit={backdropMotion.exit}
                    transition={'transition' in backdropMotion ? backdropMotion.transition : undefined}
                    className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-start sm:items-center sm:px-4 sm:pt-[10vh] sm:pb-8 overscroll-none"
                    role="presentation"
                >
                    <motion.button
                        type="button"
                        aria-label="إغلاق البحث"
                        className="absolute inset-0 bg-[#010308]/75 backdrop-blur-[18px]"
                        initial={backdropMotion.initial}
                        animate={backdropMotion.animate}
                        exit={backdropMotion.exit}
                        transition={'transition' in backdropMotion ? backdropMotion.transition : undefined}
                        onClick={onClose}
                    />

                    <motion.div
                        role="dialog"
                        aria-label="بحث شامل"
                        aria-modal="true"
                        aria-busy={isEnrichingIndex || undefined}
                        data-testid="global-search-overlay"
                        ref={overlayRef}
                        onKeyDownCapture={onKeyDownCapture}
                        initial={sheetMotion.initial}
                        animate={sheetMotion.animate}
                        exit={sheetMotion.exit}
                        transition={'transition' in sheetMotion ? sheetMotion.transition : undefined}
                        style={{ marginBottom: keyboardInset > 0 ? keyboardInset : undefined }}
                        className={GLOBAL_SEARCH_DIALOG_CHROME_CLASS}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GlobalSearchOverlayDialogChrome {...chromeProps} />
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
