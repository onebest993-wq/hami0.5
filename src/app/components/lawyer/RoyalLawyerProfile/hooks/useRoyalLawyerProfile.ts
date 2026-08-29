import { useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { useAuthUser } from '@/app/context/authHooks';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { resolveLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import { clearLiveProfileAppearance } from '@/app/services/profile/profileThemeRuntime';
import { getActions, getGallery } from '@/app/services/profile/profileSections';
import type { RoyalLawyerProfileProps } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { useProfileLoader } from './useProfileLoader';
import { useProfileEditSession } from './useProfileEditSession';
import { useProfileMediaUpload } from './useProfileMediaUpload';
import { useProfileStudioSettings } from './useProfileStudioSettings';
import { useProfileScreenEscape } from './useProfileScreenEscape';
import { useProfileLifecycle } from './useProfileLifecycle';
import { useProfileLeaveAndGallery } from './useProfileLeaveAndGallery';
import { useOwnDisplayNamePolicy } from './useOwnDisplayNamePolicy';
import {
    consumeProfileCoverCustomization,
    consumeProfileCoverEdit,
    consumeProfileCoverStudio,
    subscribeProfileCoverIntents,
    resetProfileCoverIntents,
} from '@/app/components/lawyer/dashboard/profile/profileCoverIntents';

export function useRoyalLawyerProfile(options: RoyalLawyerProfileProps = {}) {
    const user = useAuthUser();
    const viewerId = resolveCalendarUserId(user?.id ?? null);
    const profileUserId = options.targetUserId?.trim() || viewerId;
    const isOwnProfile = profileUserId === viewerId;
    const userId = profileUserId;
    const userMeta = user?.user_metadata;
    /** تخطيط الكتل أثناء التحرير — يُمرَّر عند الحفظ التلقائي بالمغادرة */
    const pendingEditCustomizationRef = useRef<ProfilePageCustomization | null>(null);
    const invalidateUploadsRef = useRef<() => void>(() => {});
    const closeGalleryOnPersistRef = useRef<() => void>(() => {});
    const lastResetUserIdRef = useRef<string | null>(null);

    const { profile, setProfile, profileRef, loading, loadError, reloadProfile, customization } =
        useProfileLoader(
            profileUserId,
            viewerId,
            isOwnProfile,
            (userMeta ?? {}) as Record<string, unknown>,
            options.displayNameHint,
            options.screenActive !== false,
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
        onEditPersistStart: () => {
            invalidateUploadsRef.current();
            closeGalleryOnPersistRef.current();
        },
    });

    const displayNamePolicy = useOwnDisplayNamePolicy(
        isOwnProfile && options.screenActive !== false,
        isEditing ? 1 : 0,
    );

    const { uploading, avatarRef, galleryRef, uploadImage, invalidateUploads } = useProfileMediaUpload({
        userId,
        isOwnProfile,
        profile,
        setProfile,
        draft,
        setDraft,
        setIsEditing,
        stageAvatarInDraft,
    });
    invalidateUploadsRef.current = invalidateUploads;

    const { settingsOpen, savingSettings, openSettings, closeSettings, saveCustomization, registerStudioDiscard } =
        useProfileStudioSettings({
            userId,
            isOwnProfile,
            profileRef,
            setProfile,
            enqueueProfileSave,
        });

    const cancelEditSafe = useCallback(() => {
        invalidateUploads();
        cancelEdit();
    }, [cancelEdit, invalidateUploads]);

    const cancelEditSafeRef = useRef(cancelEditSafe);
    cancelEditSafeRef.current = cancelEditSafe;
    const closeSettingsRef = useRef(closeSettings);
    closeSettingsRef.current = closeSettings;

    useLayoutEffect(() => {
        const prev = lastResetUserIdRef.current;
        const switched = prev !== null && prev !== profileUserId;
        const first = prev === null;
        lastResetUserIdRef.current = profileUserId;
        if (switched) {
            resetProfileCoverIntents();
            cancelEditSafeRef.current();
            closeSettingsRef.current({ force: true, soft: true });
            pendingEditCustomizationRef.current = null;
            clearLiveProfileAppearance();
            return;
        }
        if (first) clearLiveProfileAppearance();
    }, [profileUserId]);

    const header = isEditing && draft ? draft.header : profile?.header;
    const actions = isEditing
        ? (draft?.actions ?? [])
        : profile
          ? getActions(profile.sections)
          : [];
    const gallery = isEditing ? (draft?.gallery ?? []) : profile ? getGallery(profile.sections) : [];

    const displayName = resolveLawyerDisplayName(
        (isOwnProfile && displayNamePolicy?.fullName) || header?.name,
        userId,
        (userMeta ?? {}) as Record<string, unknown>,
    );
    const initials = displayName.charAt(0) || 'ح';

    const { isShellReady } = useProfileLifecycle({
        profileUserId: userId,
        loading,
        hasHeader: Boolean(profile),
        isOwnProfile,
        perfOpenEpoch: options.perfOpenEpoch,
    });

    const setPendingEditCustomization = useCallback((next: ProfilePageCustomization | null) => {
        pendingEditCustomizationRef.current = next;
    }, []);

    const {
        galleryViewerOpen,
        galleryViewerOpenRef,
        closeGalleryViewer,
        onGalleryViewerOpenChange,
        onRegisterCloseGalleryViewer,
        handleBackSafe,
    } = useProfileLeaveAndGallery({
        settingsOpen,
        closeSettings,
        isEditing,
        saveProfile,
        pendingEditCustomizationRef,
        onBack: options.onBack,
    });
    closeGalleryOnPersistRef.current = closeGalleryViewer;

    useProfileScreenEscape({
        enabled: Boolean(options.isScreenMode && options.onBack && options.screenActive !== false),
        settingsOpen,
        savingSettings,
        galleryOpen: galleryViewerOpen,
        galleryOpenRef: galleryViewerOpenRef,
        isEditing,
        onCloseSettings: closeSettings,
        onCloseGallery: closeGalleryViewer,
        onLeaveProfile: handleBackSafe,
    });

    const startEditSafe = useCallback((): boolean => {
        if (settingsOpen && !closeSettings()) return false;
        startEdit();
        return true;
    }, [settingsOpen, closeSettings, startEdit]);

    useLayoutEffect(() => {
        if (options.screenActive === false) return undefined;
        const consume = () => {
            if (consumeProfileCoverEdit()) startEditSafe();
            if (consumeProfileCoverStudio()) openSettings();
            const pendingCustom = consumeProfileCoverCustomization();
            if (pendingCustom) void saveCustomization(pendingCustom, { silent: true });
        };
        consume();
        return subscribeProfileCoverIntents(consume);
    }, [options.screenActive, startEditSafe, openSettings, saveCustomization]);

    const publicFields = useMemo(
        () => ({
            displayNamePublic: displayName,
            titlePublic: header?.title,
            cityPublic: header?.city,
            phonePublic: header?.phone,
            syndicateIdPublic: header?.syndicateId,
        }),
        [displayName, header],
    );

    const committedGalleryPaths = useMemo(
        () => getGallery(profile?.sections ?? []).map((item) => item.storagePath),
        [profile?.sections],
    );

    return {
        isOwnProfile,
        loading,
        loadError,
        reloadProfile,
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
        startEdit: startEditSafe,
        cancelEdit: cancelEditSafe,
        saveProfile,
        ensureEditDraft,
        uploadImage,
        addContactChannel,
        customization,
        settingsOpen,
        savingSettings,
        openSettings,
        closeSettings,
        registerStudioDiscard,
        saveCustomization,
        setPendingEditCustomization,
        profileUserId,
        handleBack: handleBackSafe,
        paintReady: !loading,
        contentReady: isShellReady && !loadError,
        onGalleryViewerOpenChange,
        onRegisterCloseGalleryViewer,
        committedGalleryPaths,
        displayNamePolicy,
    };
}
