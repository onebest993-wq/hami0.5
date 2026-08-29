import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';
import type { EditDraft } from '@/app/services/profile/profileEditDraft';
import { getActions, getGallery } from '@/app/services/profile/profileSections';

/** يبني مسودة تحرير من ملف محمّل — منطق نقي */
export function buildEditDraftFromProfile(profile: LawyerProfileData): EditDraft {
    return {
        header: { ...profile.header },
        actions: [...getActions(profile.sections)],
        gallery: [...getGallery(profile.sections)],
    };
}
