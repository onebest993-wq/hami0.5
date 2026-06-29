import React, { useCallback, useEffect, useMemo } from 'react';
import { Phone, MapPin } from 'lucide-react';
import type { ForumProfileFollowState } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { LawyerProfileHeader, ProfileAction } from '@/app/services/lawyer-cloud';
import type { EditDraft } from '../types';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { filterActionsForVisitor } from '@/app/services/profile/profilePageCustomization';
import { prefetchProfileSettingsSheet } from '@/app/utils/lazyComponents';
import { useProfileDisplayCustomization } from '../hooks/useProfileDisplayCustomization';
import { ProfileCustomBlocks } from './ProfileCustomBlocks';
import { ProfileHeroSection } from './ProfileHeroSection';
import { ProfileContactSection } from './ProfileContactSection';
import { ProfileGallerySection } from './ProfileGallerySection';
import { ProfileEditBar } from './ProfileEditBar';
import { ProfileSettingsSheetHost } from './ProfileSettingsSheetHost';

export interface ProfileContentProps {
    loading: boolean;
    saving: boolean;
    isEditing: boolean;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    uploading: 'avatar' | 'gallery' | null;
    avatarRef: React.RefObject<HTMLInputElement | null>;
    galleryRef: React.RefObject<HTMLInputElement | null>;
    header: LawyerProfileHeader | undefined;
    actions: ProfileAction[];
    gallery: string[];
    initials: string;
    displayNamePublic: string;
    titlePublic: string | undefined;
    emailPublic: string;
    cityPublic: string | undefined;
    phonePublic: string | undefined;
    syndicateIdPublic: string | undefined;
    startEdit: () => void;
    cancelEdit: () => void;
    saveProfile: (customizationOverride?: ProfilePageCustomization) => Promise<void>;
    ensureEditDraft: () => EditDraft | null;
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
    saveCustomization: (next: ProfilePageCustomization, options?: { silent?: boolean }) => Promise<boolean>;
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
    saveCustomization,
}: ProfileContentProps) {
    const isVisitor = readOnly;

    const {
        displayCustomization,
        previewCustomization,
        handleSettingsDraftChange,
        handleSettingsSave,
        handleBlocksLayoutChange,
    } = useProfileDisplayCustomization({
        customization,
        isEditing,
        settingsOpen,
        saveCustomization,
    });

    const privacy = displayCustomization.privacy;
    const ornatePattern = displayCustomization.appearance.material === 'ornate';

    const handleSaveEdit = useCallback(async () => {
        await saveProfile(isEditing ? previewCustomization : undefined);
    }, [isEditing, previewCustomization, saveProfile]);

    const visibleActions = useMemo(
        () => filterActionsForVisitor(actions, privacy, !isVisitor),
        [actions, privacy, isVisitor],
    );
    const showContactSection = !isVisitor || (privacy.showContactChannels && visibleActions.length > 0);
    const showGallerySection = !isVisitor || privacy.showGallery;
    const showCustomBlocks = !isVisitor || privacy.showCustomBlocks;

    const metaItems = useMemo(
        () =>
            [
                phonePublic && (!isVisitor || privacy.showPhoneMeta)
                    ? { icon: Phone, label: 'الهاتف', value: phonePublic }
                    : null,
                cityPublic && (!isVisitor || privacy.showCityMeta)
                    ? { icon: MapPin, label: 'المدينة', value: cityPublic }
                    : null,
            ].filter(Boolean) as { icon: typeof Phone; label: string; value: string }[],
        [phonePublic, cityPublic, isVisitor, privacy.showPhoneMeta, privacy.showCityMeta],
    );

    const showSyndicate = syndicateIdPublic && (!isVisitor || privacy.showSyndicate);

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
                showSyndicate={showSyndicate}
                metaItems={metaItems}
                uploading={uploading}
                avatarRef={avatarRef}
                ornatePattern={ornatePattern}
                forumFollow={forumFollow}
                settingsOpen={settingsOpen}
                startEdit={startEdit}
                openSettings={openSettings}
            />

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
                        uploading={uploading}
                        galleryRef={galleryRef}
                        ornatePattern={ornatePattern}
                    />
                ) : null}
            </div>

            {showCustomBlocks ? (
                <ProfileCustomBlocks
                    blocks={displayCustomization.customBlocks}
                    editable={!readOnly && isEditing && !settingsOpen}
                    onBlocksLayoutChange={handleBlocksLayoutChange}
                />
            ) : null}

            {!readOnly ? (
                <>
                    <input
                        ref={avatarRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
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
                        className="hidden"
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
                savingSettings={savingSettings}
                onCancel={cancelEdit}
                onSave={() => void handleSaveEdit()}
            />

            {!readOnly ? (
                <ProfileSettingsSheetHost
                    open={settingsOpen}
                    onClose={closeSettings}
                    customization={customization}
                    actions={actions}
                    userId={profileUserId}
                    onSave={handleSettingsSave}
                    onDraftChange={handleSettingsDraftChange}
                    saving={savingSettings}
                />
            ) : null}
        </div>
    );
}
