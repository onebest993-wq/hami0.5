import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileGalleryItem } from '@/app/services/lawyer-cloud';
import { discardUnsavedMediaPathUnlessCommitted } from '@/app/services/profile/editDraftMediaPaths';

type ViewerState =
    | { open: false }
    | { open: true; index: number; mode: 'view' | 'adjust' };

type UseProfileGallerySectionArgs = {
    isEditing: boolean;
    readOnly: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    gallery: ProfileGalleryItem[];
    committedGalleryPaths?: Array<string | undefined | null>;
    uploading: 'avatar' | 'gallery' | null;
    screenActive?: boolean;
    onViewerOpenChange?: (open: boolean) => void;
    onRegisterCloseViewer?: (close: (() => void) | null) => void;
};

export function useProfileGallerySection({
    isEditing,
    readOnly,
    draft,
    setDraft,
    gallery,
    committedGalleryPaths = [],
    uploading,
    screenActive = true,
    onViewerOpenChange,
    onRegisterCloseViewer,
}: UseProfileGallerySectionArgs) {
    const [viewer, setViewer] = useState<ViewerState>({ open: false });
    const prevLenRef = useRef(gallery.length);
    const prevUploadingRef = useRef(uploading);
    const canAdjust = isEditing && !readOnly && Boolean(draft);

    useEffect(() => {
        if (screenActive) return;
        setViewer({ open: false });
        onViewerOpenChange?.(false);
    }, [screenActive, onViewerOpenChange]);

    const openViewer = useCallback(
        (index: number, mode: 'view' | 'adjust' = 'view') => {
            setViewer({ open: true, index, mode });
            onViewerOpenChange?.(true);
        },
        [onViewerOpenChange],
    );

    const closeViewer = useCallback(() => {
        setViewer({ open: false });
        onViewerOpenChange?.(false);
    }, [onViewerOpenChange]);

    useEffect(() => {
        onRegisterCloseViewer?.(closeViewer);
        return () => onRegisterCloseViewer?.(null);
    }, [closeViewer, onRegisterCloseViewer]);

    useEffect(() => {
        if (viewer.open && (viewer.index < 0 || viewer.index >= gallery.length)) {
            closeViewer();
        }
    }, [viewer, gallery.length, closeViewer]);

    useEffect(() => {
        const wasUploadingGallery = prevUploadingRef.current === 'gallery';
        const finishedUpload = wasUploadingGallery && uploading !== 'gallery';
        const grew = gallery.length > prevLenRef.current;
        prevLenRef.current = gallery.length;
        prevUploadingRef.current = uploading;

        if (finishedUpload && grew && canAdjust && gallery.length > 0 && !viewer.open) {
            openViewer(gallery.length - 1, 'adjust');
        }
    }, [gallery.length, uploading, canAdjust, openViewer, viewer.open]);

    const saveAdjust = useCallback(
        (next: ProfileGalleryItem) => {
            if (!viewer.open) return;
            const index = viewer.index;
            setDraft((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    gallery: prev.gallery.map((item, idx) => (idx === index ? { ...item, ...next } : item)),
                };
            });
        },
        [setDraft, viewer],
    );

    const removeAt = useCallback(
        (index: number) => {
            if (viewer.open && viewer.index === index) closeViewer();
            else if (viewer.open && viewer.index > index) {
                setViewer({ open: true, index: viewer.index - 1, mode: viewer.mode });
            }
            setDraft((prev) => {
                if (!prev) return prev;
                const removed = prev.gallery[index];
                discardUnsavedMediaPathUnlessCommitted(removed?.storagePath, committedGalleryPaths);
                return {
                    ...prev,
                    gallery: prev.gallery.filter((_, idx) => idx !== index),
                };
            });
        },
        [setDraft, viewer, closeViewer, committedGalleryPaths],
    );

    const activeItem = viewer.open ? gallery[viewer.index] : null;

    return {
        viewer,
        canAdjust,
        activeItem,
        openViewer,
        closeViewer,
        saveAdjust,
        removeAt,
    };
}
