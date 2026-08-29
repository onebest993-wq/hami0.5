import { ProfileDB, type LawyerProfileData } from '@/app/services/lawyer-cloud';
import {
    normalizeProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import { setProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import { ProfileContactValidationError } from '@/app/services/profile/profileContactInputSecurity';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { buildProfileEditPersistPayload } from '@/app/services/profile/buildProfileEditPersistPayload';
import { gcProfileEditOrphanMediaAfterSave } from '@/app/services/profile/gcProfileEditOrphanMedia';
import { normalizeLegalDisplayName } from '@/app/domain/profile/displayNameCorrection';
import {
    DisplayNameCorrectionError,
    submitDisplayNameCorrection,
} from '@/app/services/profile/displayNameCorrectionClient';

type ProfileEditPersistPrepared = {
    header: LawyerProfileData['header'];
    sections: LawyerProfileData['sections'];
    customization: ProfilePageCustomization;
    actionIds: Set<string>;
    previousProfile: LawyerProfileData;
    optimistic: LawyerProfileData;
};

/** يجهّز حمولة الحفظ أو يعرض toast ويرجع null */
export function prepareProfileEditPersist(
    editDraft: EditDraft,
    current: LawyerProfileData,
    customizationOverride?: ProfilePageCustomization,
): ProfileEditPersistPrepared | null {
    const previousProfile: LawyerProfileData = {
        ...current,
        header: { ...current.header },
        sections: current.sections.map((section) => ({ ...section })),
        customization: current.customization,
    };
    try {
        const payload = buildProfileEditPersistPayload(editDraft, current, customizationOverride);
        const optimistic: LawyerProfileData = {
            header: payload.header,
            sections: payload.sections,
            customization: payload.customization,
        };
        return {
            ...payload,
            previousProfile,
            optimistic,
        };
    } catch (error) {
        if (error instanceof Error && error.message === 'profile-edit-name-required') {
            SmartToast.error('الاسم مطلوب قبل الحفظ');
            return null;
        }
        const message =
            error instanceof ProfileContactValidationError
                ? error.message
                : 'بيانات التواصل غير صالحة';
        SmartToast.error(message);
        return null;
    }
}

type ProfileEditCloudSaveArgs = {
    userId: string;
    header: LawyerProfileData['header'];
    sections: LawyerProfileData['sections'];
    customization: ProfilePageCustomization;
    actionIds: Set<string>;
    customizationOverride?: ProfilePageCustomization;
    previousProfile: LawyerProfileData;
    profileRef: React.MutableRefObject<LawyerProfileData | null>;
    saveEpoch: number;
    saveEpochRef: React.MutableRefObject<number>;
    userIdRef: React.MutableRefObject<string>;
    isOwnProfileRef: React.MutableRefObject<boolean>;
    setProfile: (profile: LawyerProfileData) => void;
};

/** جسم قائمة الحفظ: دمج تخصيص متوازٍ + كتابة + GC + تحديث واجهة إن بقيت الجلسة */
export async function executeProfileEditCloudSave({
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
}: ProfileEditCloudSaveArgs): Promise<{ toSave: LawyerProfileData; cloudSynced: boolean }> {
    const latest = profileRef.current;
    const latestCustomization = normalizeProfilePageCustomization(
        customizationOverride ?? latest?.customization ?? customization,
    );
    const previousName = normalizeLegalDisplayName(previousProfile.header.name);
    const nextName = normalizeLegalDisplayName(header.name);
    let nextHeader = header;
    if (previousName !== nextName) {
        try {
            const policy = await submitDisplayNameCorrection(nextName);
            nextHeader = { ...header, name: policy.fullName };
        } catch (error) {
            if (
                error instanceof DisplayNameCorrectionError &&
                (error.code === 'used' || error.code === 'invalid')
            ) {
                throw error;
            }
        }
    }
    const toSave: LawyerProfileData = {
        header: nextHeader,
        sections,
        customization: {
            ...latestCustomization,
            privacy: {
                ...latestCustomization.privacy,
                hiddenContactIds: latestCustomization.privacy.hiddenContactIds.filter((id) =>
                    actionIds.has(id),
                ),
            },
        },
    };
    const result = await ProfileDB.saveProfile(userId, toSave, userId);
    const persisted = result.profile ?? toSave;
    const cloudSynced = result.cloudSynced === true;
    if (cloudSynced) {
        gcProfileEditOrphanMediaAfterSave(previousProfile, persisted);
    }
    if (
        saveEpoch === saveEpochRef.current &&
        userId === userIdRef.current &&
        isOwnProfileRef.current
    ) {
        setProfile(persisted);
        setProfileWarmCache(userId, persisted);
    }
    return { toSave: persisted, cloudSynced };
}

export function notifyProfileUpdated(userId: string): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }));
}

export async function toastProfileEditSaveOutcome(cloudSynced: boolean): Promise<void> {
    if (!cloudSynced) {
        const { isKvProxyNetworkEnabled } = await import('@/app/services/kvProxyConfig');
        if (isKvProxyNetworkEnabled()) {
            SmartToast.warning('حُفظ على الجهاز — تعذر المزامنة السحابية. أعد المحاولة لاحقاً');
            return;
        }
    }
    SmartToast.success('تم حفظ الملف الشخصي');
}
