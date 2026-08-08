import React, { useEffect } from 'react';
import type { ForumProfileFollowState } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { LawyerProfileHeader, ProfileAction, ProfileGalleryItem } from '@/app/services/lawyer-cloud';
import type { EditDraft } from '../types';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { useAuthUser } from '@/app/context/AuthContext';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { prefetchProfileSettingsSheet } from '@/app/utils/lazyComponents';
import { useProfileContentModel } from '../hooks/useProfileContentModel';
import { useProfilePageAccess } from '../hooks/useProfilePageAccess';
import { ProfileCustomBlocks } from './ProfileCustomBlocks';
import { ProfileHeroSection } from './ProfileHeroSection';
import { ProfilePageAccessBlocked } from './ProfilePageAccessBlocked';
import { ProfileContactSection } from './ProfileContactSection';
import { ProfileGallerySection } from './ProfileGallerySection';
import { ProfileEditBar } from './ProfileEditBar';
import { ProfileSettingsSheetHost } from './ProfileSettingsSheetHost';

export interface ProfileContentProps {
    saving: boolean;
    isEditing: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    uploading: 'avatar' | 'gallery' | null;
    avatarRef: React.RefObject<HTMLInputElement | null>;
    galleryRef: React.RefObject<HTMLInputElement | null>;
    header: LawyerProfileHeader | undefined;
    actions: ProfileAction[];
    gallery: ProfileGalleryItem[];
    initials: string;
    displayNamePublic: string;
    cityPublic: string | undefined;
    phonePublic: string | undefined;
    syndicateIdPublic: string | undefined;
    startEdit: () => void;
    cancelEdit: () => void;
    saveProfile: (customizationOverride?: ProfilePageCustomization) => Promise<boolean>;
    uploadImage: (file: File, target: 'avatar' | 'gallery') => Promise<void>;
    addContactChannel: (type: ProfileAction['type']) => void;
    readOnly?: boolean;
    forumFollow?: ForumProfileFollowState;
    customization: ProfilePageCustomization;
    settingsOpen: boolean;
    savingSettings: boolean;
    profileUserId: string;
    openSettings: () => void;
    closeSettings: () => void;
    registerStudioDiscard?: (fn: (() => void) | null) => void;
    saveCustomization: (next: ProfilePageCustomization, options?: { silent?: boolean }) => Promise<boolean>;
    setPendingEditCustomization?: (next: ProfilePageCustomization | null) => void;
    committedGalleryPaths?: Array<string | undefined | null>;
    onGalleryViewerOpenChange?: (open: boolean) => void;
    onRegisterCloseGalleryViewer?: (close: (() => void) | null) => void;
    /** يُمرَّر من الشاشة — يخفي بوابات التعديل/المعرض عند keepAlive */
    screenActive?: boolean;
    pageHidden?: boolean;
    /** تبويب اللوحة — إخفاء شريط التنقل الداخلي */
    isScreenMode?: boolean;
}

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
}: ProfileContentProps) {
    const user = useAuthUser();
    const viewerId = resolveCalendarUserId(user?.id ?? null);

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

    const ornatePattern = displayCustomization.appearance.material === 'ornate';
    const showProfileBody = canView && !followCheckPending;

    useEffect(() => {
        if (!readOnly) prefetchProfileSettingsSheet();
    }, [readOnly]);

    return (
        <div data-testid="lawyer-profile" className="relative max-w-lg mx-auto">
            <ProfileHeroSection
                isEditing={isEditing}
                readOnly={readOnly}
                draft={draft}
                setDraft={setDraft}
                header={header}
                initials={initials}
                displayNamePublic={displayNamePublic}
                syndicateIdPublic={syndicateIdPublic}
                showSyndicate={Boolean(showSyndicate)}
                metaItems={showProfileBody ? metaItems : []}
                uploading={uploading}
                avatarRef={avatarRef}
                ornatePattern={ornatePattern}
                forumFollow={forumFollow}
                pageAccess={!readOnly ? pageAccess : undefined}
                pageAccessBusy={accessBusy}
                onCyclePageAccess={!readOnly ? () => void cyclePageAccess() : undefined}
                profileViewAllowed={canView}
                startEdit={startEdit}
                openSettings={openSettings}
                isScreenMode={isScreenMode}
            />

            {!showProfileBody && !followCheckPending ? (
                <ProfilePageAccessBlocked
                    pageAccess={pageAccess}
                    displayName={displayNamePublic}
                    forumFollow={forumFollow}
                    ornatePattern={ornatePattern}
                />
            ) : null}

            {showProfileBody ? (
            <div className="hami-profile-page-stack">
                {showContactSection ? (
                    <ProfileContactSection
                        isEditing={isEditing}
                        readOnly={readOnly}
                        draft={draft}
                        setDraft={setDraft}
                        actions={actions}
                        visibleActions={visibleActions}
                        ornatePattern={ornatePattern}
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
                        ornatePattern={ornatePattern}
                        screenActive={screenActive && !pageHidden}
                        onViewerOpenChange={onGalleryViewerOpenChange}
                        onRegisterCloseViewer={onRegisterCloseGalleryViewer}
                    />
                ) : null}
            </div>
            ) : null}

            {showProfileBody && showCustomBlocks ? (
                <ProfileCustomBlocks
                    blocks={displayCustomization.customBlocks}
                    editable={!readOnly && isEditing && !settingsOpen}
                    interactionsEnabled={
                        !readOnly &&
                        !settingsOpen &&
                        !isEditing &&
                        screenActive &&
                        !pageHidden
                    }
                    onBlocksLayoutChange={handleBlocksLayoutChange}
                />
            ) : null}

            {!readOnly ? (
                <>
                    <input
                        ref={avatarRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        data-testid="lawyer-profile-avatar-input"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadImage(f, 'avatar');
                            e.target.value = '';
                        }}
                    />
                    <input
                        ref={galleryRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        data-testid="lawyer-profile-gallery-input"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadImage(f, 'gallery');
                            e.target.value = '';
                        }}
                    />
                </>
            ) : null}

            <ProfileEditBar
                isEditing={isEditing}
                saving={saving}
                uploading={Boolean(uploading)}
                savingSettings={savingSettings}
                screenActive={screenActive && !pageHidden}
                onCancel={cancelEdit}
                onSave={() => void handleSaveEdit()}
            />

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
        </div>
    );
}
