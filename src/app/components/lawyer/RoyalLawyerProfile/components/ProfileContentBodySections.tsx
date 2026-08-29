import React, { lazy, Suspense } from 'react';
import type { ProfileAction, ProfileGalleryItem } from '@/app/services/lawyer-cloud';
import type { EditDraft } from '../types';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { ProfileContactSection } from './ProfileContactSection';
import { ProfileGallerySection } from './ProfileGallerySection';

const ProfileCustomBlocksLazy = lazy(() =>
    import('./ProfileCustomBlocks').then((mod) => ({ default: mod.ProfileCustomBlocks })),
);

type ProfileContentBodySectionsProps = {
    showContactSection: boolean;
    showGallerySection: boolean;
    showCustomBlocks: boolean;
    isEditing: boolean;
    readOnly: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    actions: ProfileAction[];
    visibleActions: ProfileAction[];
    gallery: ProfileGalleryItem[];
    committedGalleryPaths: Array<string | undefined | null>;
    uploading: 'avatar' | 'gallery' | null;
    galleryRef: React.RefObject<HTMLInputElement | null>;
    screenActive: boolean;
    pageHidden: boolean;
    settingsOpen: boolean;
    customBlocks: ProfilePageCustomization['customBlocks'];
    addContactChannel: (type: ProfileAction['type']) => void;
    onBlocksLayoutChange: (blocks: ProfilePageCustomization['customBlocks']) => void;
    onGalleryViewerOpenChange?: (open: boolean) => void;
    onRegisterCloseGalleryViewer?: (close: (() => void) | null) => void;
};

/** كتل ظاهرة أو وضع تحرير — لا نُركّب شجرة السحب/الإطارات على صفحة فارغة */
export function shouldMountProfileCustomBlocks(
    showCustomBlocks: boolean,
    isEditing: boolean,
    blockCount: number,
): boolean {
    if (!showCustomBlocks) return false;
    return isEditing || blockCount > 0;
}

export function ProfileContentBodySections({
    showContactSection,
    showGallerySection,
    showCustomBlocks,
    isEditing,
    readOnly,
    draft,
    setDraft,
    actions,
    visibleActions,
    gallery,
    committedGalleryPaths,
    uploading,
    galleryRef,
    screenActive,
    pageHidden,
    settingsOpen,
    customBlocks,
    addContactChannel,
    onBlocksLayoutChange,
    onGalleryViewerOpenChange,
    onRegisterCloseGalleryViewer,
}: ProfileContentBodySectionsProps) {
    const mountBlocks = shouldMountProfileCustomBlocks(
        showCustomBlocks,
        isEditing,
        customBlocks.length,
    );

    return (
        <>
            <div className="hami-profile-page-stack" data-profile-page-body>
                {showContactSection ? (
                    <ProfileContactSection
                        isEditing={isEditing}
                        readOnly={readOnly}
                        draft={draft}
                        setDraft={setDraft}
                        actions={actions}
                        visibleActions={visibleActions}
                        addContactChannel={addContactChannel}
                    />
                ) : null}

                {showGallerySection ? (
                    <ProfileGallerySection
                        isEditing={isEditing}
                        readOnly={readOnly}
                        draft={draft}
                        setDraft={setDraft}
                        gallery={gallery}
                        committedGalleryPaths={committedGalleryPaths}
                        uploading={uploading}
                        galleryRef={galleryRef}
                        screenActive={screenActive && !pageHidden}
                        onViewerOpenChange={onGalleryViewerOpenChange}
                        onRegisterCloseViewer={onRegisterCloseGalleryViewer}
                    />
                ) : null}
            </div>

            {mountBlocks ? (
                <Suspense
                    fallback={
                        <div data-profile-blocks-pending hidden aria-hidden />
                    }
                >
                    <ProfileCustomBlocksLazy
                        blocks={customBlocks}
                        editable={!readOnly && isEditing && !settingsOpen}
                        interactionsEnabled={
                            !readOnly &&
                            !settingsOpen &&
                            !isEditing &&
                            screenActive &&
                            !pageHidden
                        }
                        onBlocksLayoutChange={onBlocksLayoutChange}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
