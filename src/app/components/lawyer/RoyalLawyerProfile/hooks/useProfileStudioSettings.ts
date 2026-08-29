import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';
import type { createProfileSaveQueue } from '@/app/services/profile/profileSaveQueue';
import { useProfileStudioSheetLifecycle } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioSheetLifecycle';
import { useProfileStudioCustomizationSave } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioCustomizationSave';

export type { CloseProfileSettingsOptions } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioSheetLifecycle';

type UseProfileStudioSettingsArgs = {
    userId: string;
    isOwnProfile: boolean;
    profileRef: React.MutableRefObject<LawyerProfileData | null>;
    setProfile: (profile: LawyerProfileData) => void;
    enqueueProfileSave: ReturnType<typeof createProfileSaveQueue>;
};

/** واجهة استوديو الإعدادات — تركيب lifecycle + حفظ التخصيص */
export function useProfileStudioSettings({
    userId,
    isOwnProfile,
    profileRef,
    setProfile,
    enqueueProfileSave,
}: UseProfileStudioSettingsArgs) {
    const saveApi = useProfileStudioCustomizationSave({
        userId,
        isOwnProfile,
        profileRef,
        setProfile,
        enqueueProfileSave,
    });

    const sheet = useProfileStudioSheetLifecycle({
        isOwnProfile,
        userId,
        isSavingRef: saveApi.savingSettingsRef,
        bumpSavingAttempt: saveApi.bumpSavingAttempt,
        clearSavingUi: saveApi.clearSavingUi,
        invalidateSaveOnUserSwitch: saveApi.invalidateSaveOnUserSwitch,
    });

    return {
        settingsOpen: sheet.settingsOpen,
        savingSettings: saveApi.savingSettings,
        openSettings: sheet.openSettings,
        closeSettings: sheet.closeSettings,
        saveCustomization: saveApi.saveCustomization,
        registerStudioDiscard: sheet.registerStudioDiscard,
    };
}
