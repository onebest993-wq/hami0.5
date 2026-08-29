import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { LawyerProfileData } from '@/app/services/lawyer-cloud';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { createProfileSaveQueue } from '@/app/services/profile/profileSaveQueue';
import { setProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import {
    executeProfileEditCloudSave,
    notifyProfileUpdated,
    prepareProfileEditPersist,
    toastProfileEditSaveOutcome,
} from '@/app/components/lawyer/RoyalLawyerProfile/hooks/profileEditPersist';
import { DisplayNameCorrectionError } from '@/app/services/profile/displayNameCorrectionClient';

type UseProfileEditSaveArgs = {
    userId: string;
    isOwnProfile: boolean;
    draft: EditDraft | null;
    draftRef: React.MutableRefObject<EditDraft | null>;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
    profileRef: React.MutableRefObject<LawyerProfileData | null>;
    setProfile: (profile: LawyerProfileData) => void;
    userIdRef: React.MutableRefObject<string>;
    isOwnProfileRef: React.MutableRefObject<boolean>;
    saveEpochRef: React.MutableRefObject<number>;
    onEditPersistStart?: () => void;
};

/** حفظ الملف المهني فقط — منفصل عن دورة حياة المسودة */
export function useProfileEditSave({
    userId,
    isOwnProfile,
    draft,
    draftRef,
    setDraft,
    setIsEditing,
    profileRef,
    setProfile,
    userIdRef,
    isOwnProfileRef,
    saveEpochRef,
    onEditPersistStart,
}: UseProfileEditSaveArgs) {
    const [saving, setSaving] = useState(false);
    const savingAttemptRef = useRef(0);
    const enqueueProfileSave = useRef(createProfileSaveQueue()).current;

    const saveProfile = useCallback(
        async (customizationOverride?: ProfilePageCustomization): Promise<boolean> => {
            const editDraft = draftRef.current ?? draft;
            if (!userId || !editDraft || !isOwnProfile) return false;
            const current = profileRef.current;
            if (!current) return false;

            const prepared = prepareProfileEditPersist(editDraft, current, customizationOverride);
            if (!prepared) return false;

            const { header, sections, customization, actionIds, previousProfile, optimistic } =
                prepared;
            const saveEpoch = ++saveEpochRef.current;
            const savingAttempt = ++savingAttemptRef.current;
            onEditPersistStart?.();
            setSaving(true);
            try {
                setProfile(optimistic);
                setProfileWarmCache(userId, optimistic);
                const saveResult = await enqueueProfileSave(() =>
                    executeProfileEditCloudSave({
                        userId,
                        header,
                        sections,
                        customization,
                        actionIds,
                        customizationOverride,
                        previousProfile,
                        profileRef,
                        saveEpoch,
                        saveEpochRef,
                        userIdRef,
                        isOwnProfileRef,
                        setProfile,
                    }),
                );
                if (saveEpoch !== saveEpochRef.current || userId !== userIdRef.current) {
                    return true;
                }
                flushSync(() => {
                    setIsEditing(false);
                    setDraft(null);
                });
                notifyProfileUpdated(userId);
                await toastProfileEditSaveOutcome(saveResult.cloudSynced);
                return true;
            } catch (error) {
                const timedOut =
                    error instanceof Error && error.message === 'profile-save-timeout';
                if (timedOut) {
                    if (saveEpoch === saveEpochRef.current) {
                        flushSync(() => {
                            setIsEditing(false);
                            setDraft(null);
                        });
                        SmartToast.warning(
                            'الحفظ يستغرق وقتاً أطول من المتوقع — قد يكون اكتمل على الجهاز',
                        );
                    }
                    return true;
                }
                if (saveEpoch === saveEpochRef.current) {
                    setProfile(previousProfile);
                    setProfileWarmCache(userId, previousProfile);
                    flushSync(() => {
                        setDraft(editDraft);
                        setIsEditing(true);
                    });
                    notifyProfileUpdated(userId);
                }
                SmartToast.error(
                    error instanceof DisplayNameCorrectionError ? error.message : 'فشل حفظ الملف الشخصي',
                );
                return false;
            } finally {
                if (savingAttempt === savingAttemptRef.current) {
                    setSaving(false);
                }
            }
        },
        [
            userId,
            draft,
            draftRef,
            isOwnProfile,
            enqueueProfileSave,
            profileRef,
            setProfile,
            setDraft,
            setIsEditing,
            onEditPersistStart,
            saveEpochRef,
            userIdRef,
            isOwnProfileRef,
        ],
    );

    return { saving, saveProfile, enqueueProfileSave };
}
