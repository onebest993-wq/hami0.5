import { Phone } from '@/app/components/ui/icons/Phone';
import { MapPin } from '@/app/components/ui/icons/MapPin';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import type { ProfilePrivacySettings } from '@/app/services/profile/profilePageTypes';
import {
    filterActionsForVisitor,
    isProfileMetaFieldVisible,
    shouldApplyVisitorPrivacy,
} from '@/app/services/profile/profilePageAppearance';

export type ProfilePageViewMetaItem = {
    icon: typeof Phone;
    label: string;
    value: string;
    testId: 'profile-hero-meta-phone' | 'profile-hero-meta-city';
};

export type ProfilePageView = {
    visibleActions: ProfileAction[];
    showContactSection: boolean;
    showGallerySection: boolean;
    showCustomBlocks: boolean;
    metaItems: ProfilePageViewMetaItem[];
    showSyndicate: boolean;
};

type DeriveProfilePageViewArgs = {
    privacy: ProfilePrivacySettings;
    actions: ProfileAction[];
    phonePublic: string | undefined;
    cityPublic: string | undefined;
    syndicateIdPublic: string | undefined;
    isVisitor: boolean;
    settingsOpen: boolean;
};

/** اشتقاق العرض المشترك بين غطاء الفتح والشجرة الحية — بلا استوديو/متابعة */
export function deriveProfilePageView({
    privacy,
    actions,
    phonePublic,
    cityPublic,
    syndicateIdPublic,
    isVisitor,
    settingsOpen,
}: DeriveProfilePageViewArgs): ProfilePageView {
    const applyVisitorPrivacy = shouldApplyVisitorPrivacy(isVisitor, settingsOpen);
    const visibleActions = filterActionsForVisitor(actions, privacy, !applyVisitorPrivacy).filter(
        (action) => action.value.trim().length > 0,
    );
    const metaItems = [
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
    ].filter(Boolean) as ProfilePageViewMetaItem[];

    return {
        visibleActions,
        showContactSection:
            !applyVisitorPrivacy || (privacy.showContactChannels && visibleActions.length > 0),
        showGallerySection: !applyVisitorPrivacy || privacy.showGallery,
        showCustomBlocks: !applyVisitorPrivacy || privacy.showCustomBlocks,
        metaItems,
        showSyndicate: isProfileMetaFieldVisible(
            syndicateIdPublic,
            privacy.showSyndicate,
            isVisitor,
            settingsOpen,
        ),
    };
}
