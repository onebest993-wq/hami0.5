import type { LawyerProfileData, ProfileAction } from '@/app/services/cloud/lawyerProfileTypes';
import {
    normalizeProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import {
    clampProfileDisplayName,
    clampProfileContactLabel,
    clampProfileContactValue,
    sanitizeProfileActionsForPersist,
    sanitizeProfileHeaderPhone,
} from '@/app/services/profile/profileContactInputSecurity';
import type { EditDraft } from '@/app/services/profile/profileEditDraft';
import { buildSections } from '@/app/services/profile/profileSections';

type ProfileEditPersistPayload = {
    header: LawyerProfileData['header'];
    sections: LawyerProfileData['sections'];
    customization: ProfilePageCustomization;
    actionIds: Set<string>;
};

/** يبني حمولة الحفظ من مسودة التحرير — منطق نقي بلا React */
export function buildProfileEditPersistPayload(
    editDraft: EditDraft,
    current: LawyerProfileData,
    customizationOverride?: ProfilePageCustomization,
): ProfileEditPersistPayload {
    const persistActions = sanitizeProfileActionsForPersist(editDraft.actions);
    const name = clampProfileDisplayName(editDraft.header.name ?? '');
    if (!name) {
        throw new Error('profile-edit-name-required');
    }
    const actionIds = new Set(persistActions.map((a) => a.id));
    const header = {
        ...editDraft.header,
        name,
        title: clampProfileContactLabel(editDraft.header.title ?? ''),
        phone: sanitizeProfileHeaderPhone(editDraft.header.phone),
        city: clampProfileContactLabel(editDraft.header.city ?? ''),
        syndicateId: clampProfileContactValue(editDraft.header.syndicateId ?? ''),
    };
    const sections = buildSections({
        ...editDraft,
        actions: persistActions as ProfileAction[],
    });
    const baseCustomization = normalizeProfilePageCustomization(
        customizationOverride ?? current.customization,
    );
    const customization = {
        ...baseCustomization,
        privacy: {
            ...baseCustomization.privacy,
            hiddenContactIds: baseCustomization.privacy.hiddenContactIds.filter((id) =>
                actionIds.has(id),
            ),
        },
    };
    return { header, sections, customization, actionIds };
}
