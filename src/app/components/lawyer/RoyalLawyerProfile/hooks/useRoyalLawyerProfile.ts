import { useEffect, useMemo } from 'react';
import { useAuthUser } from '@/app/context/AuthContext';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { resolveLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import { getActions, getGallery } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileSections';
import type { RoyalLawyerProfileProps } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { useProfileLoader } from './useProfileLoader';
import { useProfileEditSession } from './useProfileEditSession';
import { useProfileMediaUpload } from './useProfileMediaUpload';
import { useProfileStudioSettings } from './useProfileStudioSettings';
import { useProfileScreenEscape } from './useProfileScreenEscape';
import { useProfileLifecycle } from './useProfileLifecycle';

export function useRoyalLawyerProfile(options: RoyalLawyerProfileProps = {}) {
    const user = useAuthUser();
    const viewerId = resolveCalendarUserId(user?.id ?? null);
    const profileUserId = options.targetUserId?.trim() || viewerId;
    const isOwnProfile = profileUserId === viewerId;
    const userId = profileUserId;
    const email = user?.email || '';
    const userMeta = user?.user_metadata;

    const { profile, setProfile, profileRef, loading, customization } = useProfileLoader(
        profileUserId,
        viewerId,
        isOwnProfile,
        (userMeta ?? {}) as Record<string, unknown>,
        options.displayNameHint,
    );

    const {
        isEditing,
        setIsEditing,
        draft,
        setDraft,
        saving,
        startEdit,
        cancelEdit,
        saveProfile,
        ensureEditDraft,
        stageAvatarInDraft,
        addContactChannel,
        enqueueProfileSave,
    } = useProfileEditSession({
        userId,
        isOwnProfile,
        profile,
        setProfile,
        profileRef,
    });

    useEffect(() => {
        setIsEditing(false);
        setDraft(null);
    }, [profileUserId, setDraft, setIsEditing]);

    const { uploading, avatarRef, galleryRef, uploadImage } = useProfileMediaUpload({
        userId,
        isOwnProfile,
        profile,
        setProfile,
        draft,
        setDraft,
        setIsEditing,
        stageAvatarInDraft,
    });

    const { settingsOpen, savingSettings, openSettings, closeSettings, saveCustomization } =
        useProfileStudioSettings({
            userId,
            isOwnProfile,
            profileRef,
            setProfile,
            enqueueProfileSave,
        });

    const header = isEditing && draft ? draft.header : profile?.header;
    const actions = isEditing
        ? (draft?.actions ?? [])
        : profile
          ? getActions(profile.sections)
          : [];
    const gallery = isEditing ? (draft?.gallery ?? []) : profile ? getGallery(profile.sections) : [];

    const displayName = resolveLawyerDisplayName(header?.name, userId, (userMeta ?? {}) as Record<string, unknown>);
    const initials = displayName.charAt(0) || 'ح';

    useProfileLifecycle({
        profileUserId: userId,
        loading,
        hasHeader: Boolean(header?.name?.trim()),
        isOwnProfile,
        perfOpenEpoch: options.perfOpenEpoch,
    });

    useProfileScreenEscape({
        enabled: Boolean(options.isScreenMode && options.onBack),
        settingsOpen,
        isEditing,
        onCloseSettings: closeSettings,
        onCancelEdit: cancelEdit,
        onBack: options.onBack,
    });

    const publicFields = useMemo(
        () => ({
            displayNamePublic: displayName,
            titlePublic: header?.title,
            emailPublic: email,
            cityPublic: header?.city,
            phonePublic: header?.phone,
            syndicateIdPublic: header?.syndicateId,
        }),
        [displayName, header, email],
    );

    return {
        isOwnProfile,
        loading,
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
        ...publicFields,
        startEdit,
        cancelEdit,
        saveProfile,
        ensureEditDraft,
        uploadImage,
        addContactChannel,
        customization,
        settingsOpen,
        savingSettings,
        openSettings,
        closeSettings,
        saveCustomization,
        profileUserId,
    };
}
