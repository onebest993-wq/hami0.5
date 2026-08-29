import React, { lazy, Suspense } from 'react';
import { Camera } from '@/app/components/ui/icons/Camera';
import { X } from '@/app/components/ui/icons/X';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileGalleryItem } from '@/app/services/lawyer-cloud';
import { PROFILE_THEME } from '../profileThemeClasses';
import { ProfileAvatarImage } from './ProfileAvatarImage';
import { galleryItemImageStyle } from '@/app/services/profile/profileSections';
import { useProfileGallerySection } from '../hooks/useProfileGallerySection';

const ProfileGalleryViewerLazy = lazy(() =>
    import('./ProfileGalleryViewer').then((mod) => ({ default: mod.ProfileGalleryViewer })),
);

function prefetchProfileGalleryViewerChunk(): void {
    void import('./ProfileGalleryViewer');
}

type ProfileGallerySectionProps = {
    isEditing: boolean;
    readOnly: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    gallery: ProfileGalleryItem[];
    /** مسارات المعرض المثبتة — لا تُحذف عند إزالة عنصر مسودة فقط */
    committedGalleryPaths?: Array<string | undefined | null>;
    uploading: 'avatar' | 'gallery' | null;
    galleryRef: React.RefObject<HTMLInputElement | null>;
    /** false عند إخفاء التبويب — أغلق المعرض فوراً */
    screenActive?: boolean;
    onViewerOpenChange?: (open: boolean) => void;
    onRegisterCloseViewer?: (close: (() => void) | null) => void;
};

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
    const { viewer, canAdjust, activeItem, openViewer, closeViewer, saveAdjust, removeAt } =
        useProfileGallerySection({
            isEditing,
            readOnly,
            draft,
            setDraft,
            gallery,
            committedGalleryPaths,
            uploading,
            screenActive,
            onViewerOpenChange,
            onRegisterCloseViewer,
        });

    return (
        <section
            className="hami-profile-section hami-profile-gallery-frame"
            aria-labelledby="profile-gallery-heading"
            data-testid="lawyer-profile-gallery"
            data-empty={gallery.length === 0 ? 'true' : 'false'}
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
                <p className="hami-profile-gallery-empty">لا صور بعد</p>
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
                                onPointerDown={prefetchProfileGalleryViewerChunk}
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
                            {isEditing && draft && !readOnly ? (
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
                <Suspense fallback={null}>
                    <ProfileGalleryViewerLazy
                        item={activeItem}
                        open={viewer.open}
                        canAdjust={canAdjust}
                        initialMode={viewer.open ? viewer.mode : 'view'}
                        onClose={closeViewer}
                        onSaveAdjust={canAdjust ? saveAdjust : undefined}
                    />
                </Suspense>
            ) : null}
        </section>
    );
});
