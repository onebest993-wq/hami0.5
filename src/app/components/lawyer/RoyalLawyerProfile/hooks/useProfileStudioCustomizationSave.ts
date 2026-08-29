import { useCallback, useRef, useState } from 'react';
import {
    normalizeProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';
import { setProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import type { createProfileSaveQueue } from '@/app/services/profile/profileSaveQueue';
import { canOpenProfileStudio } from '@/app/services/profile/profileShellPolicy';
import { profileMediaPathsRemovedFrom } from '@/app/services/profile/profileMediaPaths';
import { scheduleRemoveProfileMediaPaths } from '@/app/services/profile/editDraftMediaPaths';
import { notifyProfileUpdated } from './profileEditPersist';

type Args = {
    userId: string;
    isOwnProfile: boolean;
    profileRef: React.MutableRefObject<LawyerProfileData | null>;
    setProfile: (profile: LawyerProfileData) => void;
    enqueueProfileSave: ReturnType<typeof createProfileSaveQueue>;
};

/** حفظ تخصيص صفحة الملف من الاستوديو — منفصل عن فتح/إغلاق الورقة */
export function useProfileStudioCustomizationSave({
    userId,
    isOwnProfile,
    profileRef,
    setProfile,
    enqueueProfileSave,
}: Args) {
    const [savingSettings, setSavingSettings] = useState(false);
    const saveEpochRef = useRef(0);
    const savingAttemptRef = useRef(0);
    const savingSettingsRef = useRef(false);
    const userIdRef = useRef(userId);
    userIdRef.current = userId;

    const bumpSavingAttempt = useCallback(() => {
        savingAttemptRef.current += 1;
    }, []);

    const clearSavingUi = useCallback(() => {
        savingSettingsRef.current = false;
        setSavingSettings(false);
    }, []);

    const invalidateSaveOnUserSwitch = useCallback(() => {
        saveEpochRef.current += 1;
        savingAttemptRef.current += 1;
        clearSavingUi();
    }, [clearSavingUi]);

    const saveCustomization = useCallback(
        async (next: ProfilePageCustomization, options?: { silent?: boolean }): Promise<boolean> => {
            if (!userId || !canOpenProfileStudio(isOwnProfile)) return false;
            const normalized = normalizeProfilePageCustomization(next);
            const current = profileRef.current;
            const previousCustomization = current?.customization
                ? normalizeProfilePageCustomization(current.customization)
                : null;
            const previousProfile = current
                ? {
                      ...current,
                      header: { ...current.header },
                      sections: current.sections.map((section) => ({ ...section })),
                      customization: current.customization,
                  }
                : null;
            if (current) {
                const optimistic: LawyerProfileData = {
                    ...current,
                    customization: normalized,
                };
                setProfile(optimistic);
                setProfileWarmCache(userId, optimistic);
                notifyProfileUpdated(userId);
            }
            /* الحفظ الصامت (مسح تخطيط عند الفتح) لا يقفل الشرائح — وإلا تُمرَّر النقرة للخلفية */
            if (!options?.silent) {
                savingSettingsRef.current = true;
                setSavingSettings(true);
            }
            const saveEpoch = ++saveEpochRef.current;
            const savingAttempt = ++savingAttemptRef.current;
            try {
                const result = await enqueueProfileSave(async () => {
                    const latest = profileRef.current;
                    if (!latest) {
                        throw new Error('profile-missing');
                    }
                    const payload: LawyerProfileData = {
                        ...latest,
                        customization: normalized,
                    };
                    const { ProfileDB } = await import('@/app/services/cloud/lawyerProfileCloud');
                    const saveResult = await ProfileDB.saveProfile(userId, payload, userId);
                    if (saveResult.cloudSynced) {
                        const orphaned = profileMediaPathsRemovedFrom(
                            previousCustomization,
                            normalized,
                        );
                        if (orphaned.length > 0) {
                            scheduleRemoveProfileMediaPaths(orphaned);
                        }
                    }
                    if (saveEpoch === saveEpochRef.current && userId === userIdRef.current) {
                        const persisted = saveResult.profile ?? payload;
                        setProfile(persisted);
                        setProfileWarmCache(userId, persisted);
                    }
                    return saveResult;
                });
                if (saveEpoch !== saveEpochRef.current || userId !== userIdRef.current) {
                    return true;
                }
                if (!options?.silent) {
                    const { isKvProxyNetworkEnabled } = await import('@/app/services/kvProxyConfig');
                    if (result.cloudSynced === false && isKvProxyNetworkEnabled()) {
                        SmartToast.warning(
                            'حُفظ على الجهاز — تعذر المزامنة السحابية. أعد المحاولة لاحقاً',
                        );
                    } else {
                        SmartToast.success('تم حفظ إعدادات الصفحة');
                    }
                }
                return true;
            } catch (error) {
                const timedOut =
                    error instanceof Error && error.message === 'profile-save-timeout';
                if (timedOut) {
                    if (!options?.silent && saveEpoch === saveEpochRef.current) {
                        SmartToast.warning(
                            'الحفظ يستغرق وقتاً أطول من المتوقع — قد يكون اكتمل على الجهاز',
                        );
                    }
                    return options?.silent ? false : true;
                }
                if (previousProfile && saveEpoch === saveEpochRef.current) {
                    setProfile(previousProfile);
                    setProfileWarmCache(userId, previousProfile);
                    notifyProfileUpdated(userId);
                }
                if (!options?.silent) {
                    SmartToast.error('فشل حفظ الإعدادات');
                }
                return false;
            } finally {
                if (savingAttempt === savingAttemptRef.current) {
                    savingSettingsRef.current = false;
                    setSavingSettings(false);
                }
            }
        },
        [userId, isOwnProfile, enqueueProfileSave, profileRef, setProfile],
    );

    return {
        savingSettings,
        savingSettingsRef,
        bumpSavingAttempt,
        clearSavingUi,
        invalidateSaveOnUserSwitch,
        saveCustomization,
    };
}
