import React from 'react';
import { useAuthUser } from '@/app/context/authHooks';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { useProfileContentModel } from '../hooks/useProfileContentModel';
import { useProfilePageAccess } from '../hooks/useProfilePageAccess';
import { ProfileFirstPaintTree } from './ProfileFirstPaintTree';
import { ProfilePageAccessBlocked } from './ProfilePageAccessBlocked';
import { ProfileSettingsSheetHost } from './ProfileSettingsSheetHost';
import { ProfileContentFileInputs } from './ProfileContentFileInputs';
import type { ProfileContentProps } from './ProfileContentProps';
import { useAccreditedLawyerMark } from '@/app/hooks/useAccreditedLawyerMark';

export type { ProfileContentProps } from './ProfileContentProps';

export function ProfileContent({
    saving,
    isEditing,
    draft,
    setDraft,
    uploading,
    avatarRef,
    galleryRef,
    header,
    actions,
    gallery,
    initials,
    displayNamePublic,
    cityPublic,
    phonePublic,
    syndicateIdPublic,
    startEdit,
    cancelEdit,
    saveProfile,
    uploadImage,
    addContactChannel,
    readOnly = false,
    forumFollow,
    customization,
    settingsOpen,
    savingSettings,
    profileUserId,
    openSettings,
    closeSettings,
    registerStudioDiscard,
    saveCustomization,
    setPendingEditCustomization,
    committedGalleryPaths = [],
    onGalleryViewerOpenChange,
    onRegisterCloseGalleryViewer,
    screenActive = true,
    pageHidden = false,
    isScreenMode = false,
    onBack,
    displayNamePolicy = null,
}: ProfileContentProps) {
    const user = useAuthUser();
    const viewerId = resolveCalendarUserId(user?.id ?? null);
    const subjectId = (profileUserId || user?.id || '').trim();
    const accredited = useAccreditedLawyerMark(subjectId);

    const {
        pageAccess,
        canView,
        followCheckPending,
        accessBusy,
        cyclePageAccess,
    } = useProfilePageAccess({
        isOwnProfile: !readOnly,
        profileUserId,
        viewerId,
        customization,
        forumFollowIsFollowing: forumFollow?.isFollowing,
        saveCustomization,
    });

    const {
        displayCustomization,
        handleSettingsDraftChange,
        handleSettingsSave,
        handleBlocksLayoutChange,
        handleSaveEdit,
        visibleActions,
        showContactSection,
        showGallerySection,
        showCustomBlocks,
        metaItems,
        showSyndicate,
    } = useProfileContentModel({
        readOnly,
        isEditing,
        settingsOpen,
        customization,
        saveCustomization,
        saveProfile,
        actions,
        phonePublic,
        cityPublic,
        syndicateIdPublic,
        onPendingEditCustomizationChange: setPendingEditCustomization,
    });

    const showBlocked = !canView && !followCheckPending;
    const ornatePattern = displayCustomization.appearance.material === 'ornate';

    return (
        <ProfileFirstPaintTree
            saving={saving}
            isEditing={isEditing}
            draft={draft}
            setDraft={setDraft}
            uploading={uploading}
            avatarRef={avatarRef}
            galleryRef={galleryRef}
            header={header}
            actions={actions}
            gallery={gallery}
            initials={initials}
            displayNamePublic={displayNamePublic}
            syndicateIdPublic={syndicateIdPublic}
            startEdit={startEdit}
            cancelEdit={cancelEdit}
            addContactChannel={addContactChannel}
            readOnly={readOnly}
            forumFollow={forumFollow}
            customization={displayCustomization}
            settingsOpen={settingsOpen}
            openSettings={openSettings}
            committedGalleryPaths={committedGalleryPaths}
            onGalleryViewerOpenChange={onGalleryViewerOpenChange}
            onRegisterCloseGalleryViewer={onRegisterCloseGalleryViewer}
            screenActive={screenActive}
            pageHidden={pageHidden}
            isScreenMode={isScreenMode}
            onBack={onBack}
            displayNamePolicy={displayNamePolicy}
            profileUserId={profileUserId}
            visibleActions={visibleActions}
            showContactSection={showContactSection}
            showGallerySection={showGallerySection}
            showCustomBlocks={showCustomBlocks}
            metaItems={metaItems}
            showSyndicate={showSyndicate}
            pageAccess={pageAccess}
            pageAccessBusy={accessBusy}
            onCyclePageAccess={!readOnly ? () => void cyclePageAccess() : undefined}
            accredited={accredited}
            armEditOnPointerDown={false}
            onSaveEdit={() => void handleSaveEdit()}
            onBlocksLayoutChange={handleBlocksLayoutChange}
            canView={canView}
            followCheckPending={followCheckPending}
        >
            {showBlocked ? (
                <ProfilePageAccessBlocked
                    pageAccess={pageAccess}
                    displayName={displayNamePublic}
                    forumFollow={forumFollow}
                    ornatePattern={ornatePattern}
                />
            ) : null}
            {!readOnly ? (
                <ProfileContentFileInputs
                    avatarRef={avatarRef}
                    galleryRef={galleryRef}
                    uploadImage={uploadImage}
                />
            ) : null}
            {!readOnly ? (
                <ProfileSettingsSheetHost
                    open={settingsOpen}
                    onClose={closeSettings}
                    onRegisterDiscard={registerStudioDiscard}
                    customization={customization}
                    userId={profileUserId}
                    onSave={handleSettingsSave}
                    onDraftChange={handleSettingsDraftChange}
                    saving={savingSettings}
                />
            ) : null}
        </ProfileFirstPaintTree>
    );
}
