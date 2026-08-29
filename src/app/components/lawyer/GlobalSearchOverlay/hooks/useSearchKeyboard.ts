import { useCallback, type RefObject } from 'react';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function listGlobalSearchFocusables(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
        if (!el.isConnected) return false;
        if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
    });
}

export function useSearchKeyboard(
    overlayRef: RefObject<HTMLDivElement | null>,
    flatResults: GlobalSearchEntry[],
    activeIndex: number,
    setActiveIndex: React.Dispatch<React.SetStateAction<number>>,
    onPick: (entry: GlobalSearchEntry) => void,
) {
    const focusResultAt = useCallback(
        (index: number) => {
            const root = overlayRef.current;
            if (!root) return;
            const el = root.querySelector<HTMLButtonElement>(`button[data-search-result-index="${index}"]`);
            if (!el) return;
            el.focus();
            el.scrollIntoView?.({ block: 'nearest' });
        },
        [overlayRef],
    );

    const onKeyDownCapture = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') return;

            if (e.key === 'Tab') {
                const root = overlayRef.current;
                if (!root) return;
                const focusables = listGlobalSearchFocusables(root);
                if (focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                const active = document.activeElement as HTMLElement | null;
                if (e.shiftKey) {
                    if (active === first || !root.contains(active)) {
                        e.preventDefault();
                        last.focus();
                    }
                } else if (active === last) {
                    e.preventDefault();
                    first.focus();
                }
                return;
            }

            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            const isTextEntry =
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                target?.isContentEditable === true;

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                if (!flatResults.length) return;
                e.preventDefault();
                setActiveIndex((prev) => {
                    const next =
                        e.key === 'ArrowDown'
                            ? Math.min(flatResults.length - 1, Math.max(0, prev + 1))
                            : Math.max(0, prev - 1);
                    queueMicrotask(() => focusResultAt(next));
                    return next;
                });
                return;
            }

            if (e.key === 'Enter') {
                if (isTextEntry && activeIndex < 0) return;
                if (activeIndex >= 0 && activeIndex < flatResults.length) {
                    e.preventDefault();
                    onPick(flatResults[activeIndex]);
                }
            }
        },
        [activeIndex, flatResults, focusResultAt, onPick, overlayRef, setActiveIndex],
    );

    return { onKeyDownCapture };
}
