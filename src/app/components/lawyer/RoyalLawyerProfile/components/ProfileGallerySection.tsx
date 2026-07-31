import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileGalleryItem } from '@/app/services/lawyer-cloud';
import { PROFILE_THEME } from '../profileThemeClasses';
import { ProfileAvatarImage } from './ProfileAvatarImage';
import { ProfileGalleryViewer } from './ProfileGalleryViewer';
import { galleryItemImageStyle } from '../utils/profileSections';
import { discardUnsavedMediaPathUnlessCommitted } from '@/app/services/profile/editDraftMediaPaths';

export type ProfileGallerySectionProps = {
    isEditing: boolean;
    readOnly: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    gallery: ProfileGalleryItem[];
    /** مسارات المعرض المثبتة — لا تُحذف عند إزالة عنصر مسودة فقط */
    committedGalleryPaths?: Array<string | undefined | null>;
    uploading: 'avatar' | 'gallery' | null;
    galleryRef: React.RefObject<HTMLInputElement | null>;
    ornatePattern?: boolean;
    /** false عند إخفاء التبويب — أغلق المعرض فوراً */
    screenActive?: boolean;
    onViewerOpenChange?: (open: boolean) => void;
    onRegisterCloseViewer?: (close: (() => void) | null) => void;
};

type ViewerState =
    | { open: false }
    | { open: true; index: number; mode: 'view' | 'adjust' };

export const ProfileGallerySection = React.memo(function ProfileGallerySection({
    isEditing,
    readOnly,
    draft,
    setDraft,
    gallery,
    committedGalleryPaths = [],
    uploading,
    galleryRef,
    screenActive = true,
    onViewerOpenChange,
    onRegisterCloseViewer,
}: ProfileGallerySectionProps) {
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

    return (
        <section
            className="hami-profile-section hami-profile-gallery-frame"
            aria-labelledby="profile-gallery-heading"
        >
            <div className="hami-profile-section-head">
                <h2
                    id="profile-gallery-heading"
                    className="hami-profile-section-title hami-profile-section-title--display"
                >
                    المعرض
                </h2>
                {isEditing && !readOnly ? (
                    <button
                        type="button"
                        disabled={uploading === 'gallery'}
                        onClick={() => {
                            const input = galleryRef.current;
                            if (!input) return;
                            input.value = '';
                            input.click();
                        }}
                        className={`hami-profile-section-action min-h-[44px] ${PROFILE_THEME.accentBtn}`}
                        data-testid="lawyer-profile-gallery-upload"
                    >
                        <Camera size={14} />
                        {uploading === 'gallery' ? 'جاري الرفع...' : 'رفع'}
                    </button>
                ) : null}
            </div>

            {gallery.length === 0 ? (
                <p className="hami-profile-gallery-empty">لا توجد صوره للعرض</p>
            ) : (
                <div className="hami-profile-gallery-rail">
                    {gallery.map((item, i) => (
                        <div
                            key={item.storagePath?.trim() || item.url || `gallery-${i}`}
                            className="hami-profile-gallery-tile group"
                        >
                            <button
                                type="button"
                                className="hami-profile-gallery-tile__hit"
                                onClick={() => openViewer(i, 'view')}
                                aria-label="معاينة الصورة"
                                data-testid={`profile-gallery-tile-${i}`}
                            >
                                <ProfileAvatarImage
                                    src={item.url}
                                    alt={`صورة المعرض ${i + 1}`}
                                    style={galleryItemImageStyle(item)}
                                    lazy
                                    fallback={
                                        <span
                                            className="block w-full h-full bg-black/30"
                                            aria-hidden
                                        />
                                    }
                                />
                            </button>
                            {isEditing && draft ? (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        removeAt(i);
                                    }}
                                    className="absolute top-2 left-2 z-[2] min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-black/70 text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
                                    aria-label="حذف الصورة"
                                >
                                    <X size={14} />
                                </button>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}

            {activeItem ? (
                <ProfileGalleryViewer
                    item={activeItem}
                    open={viewer.open}
                    canAdjust={canAdjust}
                    initialMode={viewer.open ? viewer.mode : 'view'}
                    onClose={closeViewer}
                    onSaveAdjust={canAdjust ? saveAdjust : undefined}
                />
            ) : null}
        </section>
    );
});
