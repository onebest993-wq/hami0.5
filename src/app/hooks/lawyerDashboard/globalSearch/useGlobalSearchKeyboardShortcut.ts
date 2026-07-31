import { useEffect } from 'react';
import type { MutableRefObject } from 'react';

/** اختصار Ctrl/Cmd+K — فتح/إغلاق البحث الشامل. */
export function useGlobalSearchKeyboardShortcut(
    showGlobalSearchRef: MutableRefObject<boolean>,
    openGlobalSearch: () => void,
    closeGlobalSearch: () => void,
): void {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const isSearchChord =
                (e.ctrlKey || e.metaKey) &&
                !e.altKey &&
                (e.code === 'KeyK' || e.key.toLowerCase() === 'k');
            if (!isSearchChord) return;
            e.preventDefault();
            if (showGlobalSearchRef.current) {
                closeGlobalSearch();
                return;
            }
            openGlobalSearch();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [closeGlobalSearch, openGlobalSearch, showGlobalSearchRef]);
}
