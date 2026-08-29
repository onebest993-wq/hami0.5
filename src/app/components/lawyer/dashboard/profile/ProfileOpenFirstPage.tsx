import React, { useCallback, useMemo } from 'react';
import { ProfileFirstPaintTree } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileFirstPaintTree';
import { ProfilePageSurfaceFrame } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfilePageSurfaceFrame';
import { useProfileOpenFirstPageModel } from '@/app/components/lawyer/dashboard/profile/useProfileOpenFirstPageModel';
import { deriveProfilePageView } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/deriveProfilePageView';
import {
    nextProfilePageAccess,
    resolveProfilePageAccess,
} from '@/app/services/profile/profilePageAccess';

type ProfileOpenFirstPageProps = {
    userId: string | null;
    onBack: () => void;
};

/**
 * الصفحة المهنية الكاملة من الهوية/الكاش — ليست قشرة ناقصة.
 * بلا شجرة حية / مضيف استوديو / برميل lazyComponents.
 */
export function ProfileOpenFirstPage({
    userId,
    onBack,
}: ProfileOpenFirstPageProps): React.ReactElement {
    const model = useProfileOpenFirstPageModel(userId, onBack);
    const { customization, saveCustomization, actions, phonePublic, cityPublic, syndicateIdPublic } =
        model;
    const pageAccess = resolveProfilePageAccess(customization.privacy);
    const view = useMemo(
        () =>
            deriveProfilePageView({
                privacy: customization.privacy,
                actions,
                phonePublic,
                cityPublic,
                syndicateIdPublic,
                isVisitor: false,
                settingsOpen: false,
            }),
        [customization.privacy, actions, phonePublic, cityPublic, syndicateIdPublic],
    );

    const onCyclePageAccess = useCallback(() => {
        const next = nextProfilePageAccess(pageAccess);
        void saveCustomization({
            ...customization,
            privacy: { ...customization.privacy, pageAccess: next },
        });
    }, [saveCustomization, customization, pageAccess]);

    return (
        <ProfilePageSurfaceFrame appearance={customization.appearance} openFirstPage>
            <ProfileFirstPaintTree
                saving={model.saving}
                isEditing={model.isEditing}
                draft={model.draft}
                setDraft={model.setDraft}
                uploading={model.uploading}
                avatarRef={model.avatarRef}
                galleryRef={model.galleryRef}
                header={model.header}
                actions={actions}
                gallery={model.gallery}
                initials={model.initials}
                displayNamePublic={model.displayNamePublic}
                syndicateIdPublic={syndicateIdPublic}
                startEdit={model.startEdit}
                cancelEdit={model.cancelEdit}
                addContactChannel={model.addContactChannel}
                readOnly={model.readOnly}
                customization={customization}
                settingsOpen={false}
                openSettings={model.openSettings}
                committedGalleryPaths={model.committedGalleryPaths}
                screenActive
                pageHidden={false}
                isScreenMode
                onBack={onBack}
                displayNamePolicy={null}
                profileUserId={model.profileUserId}
                visibleActions={view.visibleActions}
                showContactSection={view.showContactSection}
                showGallerySection={view.showGallerySection}
                showCustomBlocks={view.showCustomBlocks}
                metaItems={view.metaItems}
                showSyndicate={view.showSyndicate}
                pageAccess={pageAccess}
                onCyclePageAccess={onCyclePageAccess}
                armEditOnPointerDown
                onSaveEdit={() => undefined}
                onBlocksLayoutChange={() => undefined}
                peekAccredited
            />
        </ProfilePageSurfaceFrame>
    );
}
