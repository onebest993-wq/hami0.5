import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import type {
    GlobalSearchEntry,
    GlobalSearchNavigate,
    GroupedSearchResults,
} from '@/app/services/globalSearchIndex';
import { flattenGroupedResults } from '@/app/components/lawyer/GlobalSearchOverlay/utils/flattenGroupedResults';
import { useSearchKeyboard } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchKeyboard';

type MotionPreset =
    | { initial: false; animate: Record<string, unknown>; exit: Record<string, unknown> }
    | {
          initial: Record<string, unknown>;
          animate: Record<string, unknown>;
          exit: Record<string, unknown>;
          transition: Record<string, unknown>;
      };

export function useGlobalSearchOverlayChrome(
    overlayOpen: boolean,
    results: GroupedSearchResults | null,
    onClose: () => void,
    onNavigatePick: (navigate: GlobalSearchNavigate, label: string) => void,
) {
    const reduceMotion = useReduceMotion();
    const keyboardInset = useMobileKeyboardInset();
    const overlayRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
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
        overlayOpen,
        overlayRef,
        flatResults,
        activeIndex,
        setActiveIndex,
        onClose,
        pick,
    );

    const backdropMotion: MotionPreset = reduceMotion
        ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0, pointerEvents: 'none' as const } }
        : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0, pointerEvents: 'none' as const },
              transition: { duration: 0.18 },
          };

    const sheetMotion: MotionPreset = reduceMotion
        ? { initial: false, animate: { y: 0, opacity: 1 }, exit: { opacity: 0, pointerEvents: 'none' as const } }
        : {
              initial: { y: '100%', opacity: 0.6 },
              animate: { y: 0, opacity: 1 },
              exit: { y: '100%', opacity: 0, pointerEvents: 'none' as const },
              transition: { type: 'spring', stiffness: 460, damping: 38, mass: 0.78 },
          };

    const resultsMaxHeight =
        keyboardInset > 0
            ? `min(calc(62dvh - ${Math.min(keyboardInset, 200)}px), ${560 - Math.min(keyboardInset, 200)}px)`
            : 'min(62dvh, 560px)';

    return {
        overlayRef: overlayRef as RefObject<HTMLDivElement>,
        inputRef: inputRef as RefObject<HTMLInputElement>,
        activeIndex,
        setActiveIndex,
        flatResults,
        pick,
        onKeyDownCapture,
        keyboardInset,
        sheetMotion,
        backdropMotion,
        resultsMaxHeight,
    };
}
