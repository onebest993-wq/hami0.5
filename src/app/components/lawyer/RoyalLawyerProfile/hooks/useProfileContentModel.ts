import { useCallback, useMemo } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { deriveProfilePageView } from './deriveProfilePageView';
import { useProfileDisplayCustomization } from './useProfileDisplayCustomization';
import type { ProfileAction } from '@/app/services/lawyer-cloud';

type UseProfileContentModelArgs = {
    readOnly: boolean;
    isEditing: boolean;
    settingsOpen: boolean;
    customization: ProfilePageCustomization;
    saveCustomization: (next: ProfilePageCustomization, options?: { silent?: boolean }) => Promise<boolean>;
    saveProfile: (customizationOverride?: ProfilePageCustomization) => Promise<boolean>;
    actions: ProfileAction[];
    phonePublic: string | undefined;
    cityPublic: string | undefined;
    syndicateIdPublic: string | undefined;
    onPendingEditCustomizationChange?: (next: ProfilePageCustomization | null) => void;
};

/** منطق العرض/الخصوصية لصفحة الملف — منفصل عن JSX */
export function useProfileContentModel({
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
    onPendingEditCustomizationChange,
}: UseProfileContentModelArgs) {
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
        onPreviewCustomizationSync: onPendingEditCustomizationChange,
    });

    const privacy = displayCustomization.privacy;

    const handleSaveEdit = useCallback(() => {
        void saveProfile(isEditing ? previewCustomization : undefined);
    }, [isEditing, previewCustomization, saveProfile]);

    const view = useMemo(
        () =>
            deriveProfilePageView({
                privacy,
                actions,
                phonePublic,
                cityPublic,
                syndicateIdPublic,
                isVisitor,
                settingsOpen,
            }),
        [privacy, actions, phonePublic, cityPublic, syndicateIdPublic, isVisitor, settingsOpen],
    );

    return {
        displayCustomization,
        handleSettingsDraftChange,
        handleSettingsSave,
        handleBlocksLayoutChange,
        handleSaveEdit,
        ...view,
    };
}
