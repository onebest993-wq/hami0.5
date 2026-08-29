import { useEffect, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import type { ProfileGalleryItem } from '@/app/services/lawyer-cloud';

type GalleryViewerMode = 'view' | 'adjust';

type Args = {
    open: boolean;
    mode: GalleryViewerMode;
    initialMode: GalleryViewerMode;
    item: ProfileGalleryItem;
    dialogRef: RefObject<HTMLDivElement | null>;
    previouslyFocusedRef: MutableRefObject<HTMLElement | null>;
    setDraft: Dispatch<SetStateAction<ProfileGalleryItem>>;
    setMode: Dispatch<SetStateAction<GalleryViewerMode>>;
    onClose: () => void;
};

export function useProfileGalleryViewerFocusTrap({
    open,
    mode,
    initialMode,
    item,
    dialogRef,
    previouslyFocusedRef,
    setDraft,
    setMode,
    onClose,
}: Args) {
    useEffect(() => {
        if (!open) return;
        previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
        return () => {
            previouslyFocusedRef.current?.focus?.();
        };
    }, [open, previouslyFocusedRef]);

    useEffect(() => {
        if (!open) return;

        const collectFocusables = () => {
            const root = dialogRef.current;
            if (!root) return [] as HTMLElement[];
            const sheet = root.querySelector<HTMLElement>('.hami-profile-gallery-viewer__sheet');
            const scope = sheet ?? root;
            return Array.from(
                scope.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((el) => {
                if (el.classList.contains('hami-profile-gallery-viewer__backdrop')) return false;
                if (el.getAttribute('aria-hidden') === 'true') return false;
                if (el.offsetParent !== null) return true;
                if (!el.isConnected) return false;
                try {
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden') return false;
                } catch {
                    /* ignore */
                }
                return true;
            });
        };

        const focusables = collectFocusables();
        const initial =
            focusables.find((el) => el.getAttribute('aria-label') === 'إغلاق') ?? focusables[0] ?? null;
        window.requestAnimationFrame(() => initial?.focus());

        const exitAdjustOrClose = () => {
            if (mode === 'adjust' && initialMode !== 'adjust') {
                setDraft({
                    url: item.url,
                    focusX: item.focusX ?? 50,
                    focusY: item.focusY ?? 50,
                    zoom: item.zoom ?? 100,
                    ...(item.storagePath ? { storagePath: item.storagePath } : null),
                });
                setMode('view');
                return;
            }
            onClose();
        };

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                exitAdjustOrClose();
                return;
            }
            if (event.key !== 'Tab') return;
            const live = collectFocusables();
            const root = dialogRef.current;
            if (!root || live.length === 0) return;
            const first = live[0]!;
            const last = live[live.length - 1]!;
            const active = document.activeElement as HTMLElement | null;
            if (event.shiftKey) {
                if (active === first || !root.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (active === last || !root.contains(active)) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => {
            window.removeEventListener('keydown', onKey, true);
        };
    }, [open, mode, initialMode, item, onClose, dialogRef, setDraft, setMode]);
}
