import { useCallback, useMemo } from 'react';
import { Phone, MapPin } from 'lucide-react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import {
    filterActionsForVisitor,
    isProfileMetaFieldVisible,
    shouldApplyVisitorPrivacy,
} from '@/app/services/profile/profilePageCustomization';
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
    const applyVisitorPrivacy = shouldApplyVisitorPrivacy(isVisitor, settingsOpen);

    const handleSaveEdit = useCallback(() => {
        void saveProfile(isEditing ? previewCustomization : undefined);
    }, [isEditing, previewCustomization, saveProfile]);

    const visibleActions = useMemo(
        () =>
            filterActionsForVisitor(actions, privacy, !applyVisitorPrivacy).filter(
                (action) => action.value.trim().length > 0,
            ),
        [actions, privacy, applyVisitorPrivacy],
    );

    const showContactSection =
        !applyVisitorPrivacy || (privacy.showContactChannels && visibleActions.length > 0);
    const showGallerySection = !applyVisitorPrivacy || privacy.showGallery;
    const showCustomBlocks = !applyVisitorPrivacy || privacy.showCustomBlocks;

    const metaItems = useMemo(
        () =>
            [
                isProfileMetaFieldVisible(phonePublic, privacy.showPhoneMeta, isVisitor, settingsOpen)
                    ? {
                          icon: Phone,
                          label: 'الهاتف',
                          value: phonePublic!,
                          testId: 'profile-hero-meta-phone' as const,
                      }
                    : null,
                isProfileMetaFieldVisible(cityPublic, privacy.showCityMeta, isVisitor, settingsOpen)
                    ? {
                          icon: MapPin,
                          label: 'المدينة',
                          value: cityPublic!,
                          testId: 'profile-hero-meta-city' as const,
                      }
                    : null,
            ].filter(Boolean) as {
                icon: typeof Phone;
                label: string;
                value: string;
                testId: 'profile-hero-meta-phone' | 'profile-hero-meta-city';
            }[],
        [phonePublic, cityPublic, isVisitor, settingsOpen, privacy.showPhoneMeta, privacy.showCityMeta],
    );

    const showSyndicate = isProfileMetaFieldVisible(
        syndicateIdPublic,
        privacy.showSyndicate,
        isVisitor,
        settingsOpen,
    );

    return {
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
    };
}
