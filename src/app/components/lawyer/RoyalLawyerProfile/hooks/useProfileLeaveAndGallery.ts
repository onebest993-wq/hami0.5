import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { isProfileStudioMarkedOpen } from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

type UseProfileLeaveAndGalleryArgs = {
    settingsOpen: boolean;
    closeSettings: (options?: { force?: boolean; soft?: boolean }) => boolean;
    isEditing: boolean;
    saveProfile: (customizationOverride?: ProfilePageCustomization) => Promise<boolean>;
    pendingEditCustomizationRef: MutableRefObject<ProfilePageCustomization | null>;
    onBack?: () => void;
};

export function useProfileLeaveAndGallery({
    settingsOpen,
    closeSettings,
    isEditing,
    saveProfile,
    pendingEditCustomizationRef,
    onBack,
}: UseProfileLeaveAndGalleryArgs) {
    const leaveInFlightRef = useRef(false);
    const [galleryViewerOpen, setGalleryViewerOpen] = useState(false);
    const galleryViewerOpenRef = useRef(false);
    const closeGalleryViewerRef = useRef<(() => void) | null>(null);

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
        if (settingsOpen || isProfileStudioMarkedOpen()) {
            if (!closeSettings()) return;
            return;
        }
        const shouldSaveEdit = isEditing;
        const override = shouldSaveEdit ? pendingEditCustomizationRef.current ?? undefined : undefined;
        if (shouldSaveEdit) {
            leaveInFlightRef.current = true;
            void saveProfile(override)
                .then((ok) => {
                    if (ok) onBack?.();
                })
                .finally(() => {
                    leaveInFlightRef.current = false;
                });
            return;
        }
        onBack?.();
    }, [
        closeGalleryViewer,
        settingsOpen,
        closeSettings,
        isEditing,
        saveProfile,
        pendingEditCustomizationRef,
        onBack,
    ]);

    return {
        galleryViewerOpen,
        galleryViewerOpenRef,
        closeGalleryViewer,
        onGalleryViewerOpenChange,
        onRegisterCloseGalleryViewer: registerCloseGalleryViewer,
        handleBackSafe,
    };
}
