import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import type {
    GlobalSearchEntry,
    GlobalSearchNavigate,
    GroupedSearchResults,
} from '@/app/services/globalSearchIndex';
import { flattenGroupedResults } from '@/app/components/lawyer/GlobalSearchOverlay/utils/flattenGroupedResults';
import { useSearchKeyboard } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchKeyboard';

export function useGlobalSearchOverlayChrome(
    overlayOpen: boolean,
    results: GroupedSearchResults | null,
    onNavigatePick: (navigate: GlobalSearchNavigate, label: string) => void,
    options?: {
        overlayRef?: RefObject<HTMLDivElement | null>;
        inputRef?: RefObject<HTMLInputElement | null>;
        keyboardInsetEnabled?: boolean;
    },
) {
    const keyboardInsetEnabled = options?.keyboardInsetEnabled ?? overlayOpen;
    const keyboardInset = useMobileKeyboardInset(keyboardInsetEnabled, true);
    const internalOverlayRef = useRef<HTMLDivElement>(null);
    const internalInputRef = useRef<HTMLInputElement>(null);
    const overlayRef = options?.overlayRef ?? internalOverlayRef;
    const inputRef = options?.inputRef ?? internalInputRef;
    const [activeIndex, setActiveIndex] = useState(-1);

    const flatResults = useMemo(() => {
        if (!results?.hasResults) return [];
        return flattenGroupedResults(results);
    }, [results]);

    useEffect(() => {
        if (!overlayOpen) {
            setActiveIndex(-1);
        }
    }, [overlayOpen]);

    useEffect(() => {
        if (!flatResults.length) {
            setActiveIndex(-1);
            return;
        }
        setActiveIndex((prev) => {
            if (prev >= 0 && prev < flatResults.length) return prev;
            return 0;
        });
    }, [flatResults.length]);

    const pick = useCallback(
        (entry: GlobalSearchEntry) => onNavigatePick(entry.navigate, entry.title),
        [onNavigatePick],
    );

    const { onKeyDownCapture } = useSearchKeyboard(
        overlayRef,
        flatResults,
        activeIndex,
        setActiveIndex,
        pick,
    );

    return {
        overlayRef: overlayRef as RefObject<HTMLDivElement>,
        inputRef: inputRef as RefObject<HTMLInputElement>,
        activeIndex,
        setActiveIndex,
        flatResults,
        pick,
        onKeyDownCapture,
        keyboardInset,
    };
}
