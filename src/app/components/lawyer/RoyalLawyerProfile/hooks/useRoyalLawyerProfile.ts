import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { useAuthUser } from '@/app/context/AuthContext';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { resolveLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import { clearLiveProfileAppearance } from '@/app/services/profile/profileThemeRuntime';
import { getActions, getGallery } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileSections';
import type { RoyalLawyerProfileProps } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
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
    const userMeta = user?.user_metadata;
    /** تخطيط الكتل أثناء التحرير — يُمرَّر عند الحفظ التلقائي بالمغادرة */
    const pendingEditCustomizationRef = useRef<ProfilePageCustomization | null>(null);
    const invalidateUploadsRef = useRef<() => void>(() => {});

    const { profile, setProfile, profileRef, loading, loadError, reloadProfile, customization } =
        useProfileLoader(
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
        onEditPersistStart: () => invalidateUploadsRef.current(),
    });

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

    useEffect(() => {
        cancelEditSafe();
        /* soft: بلا flushSync — الاستدعاء من useEffect يُطلق تحذير React */
        closeSettings({ force: true, soft: true });
        pendingEditCustomizationRef.current = null;
        /* مزامنة فورية — الـ import الديناميكي كان يصفّر مظهراً أحدث بعد تبديل الملف */
        clearLiveProfileAppearance();
    }, [profileUserId, cancelEditSafe, closeSettings]);

    const header = isEditing && draft ? draft.header : profile?.header;
    const actions = isEditing
        ? (draft?.actions ?? [])
        : profile
          ? getActions(profile.sections)
          : [];
    const gallery = isEditing ? (draft?.gallery ?? []) : profile ? getGallery(profile.sections) : [];

    const displayName = resolveLawyerDisplayName(header?.name, userId, (userMeta ?? {}) as Record<string, unknown>);
    const initials = displayName.charAt(0) || 'ح';

    const { isShellReady } = useProfileLifecycle({
        profileUserId: userId,
        loading,
        hasHeader: Boolean(profile),
        isOwnProfile,
        perfOpenEpoch: options.perfOpenEpoch,
    });

    const leaveInFlightRef = useRef(false);
    const [galleryViewerOpen, setGalleryViewerOpen] = useState(false);
    const galleryViewerOpenRef = useRef(false);
    const closeGalleryViewerRef = useRef<(() => void) | null>(null);

    const setPendingEditCustomization = useCallback((next: ProfilePageCustomization | null) => {
        pendingEditCustomizationRef.current = next;
    }, []);

    const closeGalleryViewer = useCallback(() => {
        closeGalleryViewerRef.current?.();
    }, []);

    const registerCloseGalleryViewer = useCallback((close: (() => void) | null) => {
        closeGalleryViewerRef.current = close;
    }, []);

    const onGalleryViewerOpenChange = useCallback((open: boolean) => {
        galleryViewerOpenRef.current = open;
        setGalleryViewerOpen(open);
    }, []);

    const handleBackSafe = useCallback(() => {
        if (leaveInFlightRef.current) return;
        if (galleryViewerOpenRef.current) {
            closeGalleryViewer();
            return;
        }
        if (settingsOpen) {
            if (!closeSettings()) return;
            return;
        }
        const shouldSaveEdit = isEditing;
        const override = shouldSaveEdit ? pendingEditCustomizationRef.current ?? undefined : undefined;
        if (shouldSaveEdit) {
            leaveInFlightRef.current = true;
            void saveProfile(override)
                .then((ok) => {
                    if (ok) options.onBack?.();
                })
                .finally(() => {
                    leaveInFlightRef.current = false;
                });
            return;
        }
        options.onBack?.();
    }, [closeGalleryViewer, settingsOpen, closeSettings, isEditing, saveProfile, options]);

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
        onRegisterCloseGalleryViewer: registerCloseGalleryViewer,
        committedGalleryPaths,
    };
}
