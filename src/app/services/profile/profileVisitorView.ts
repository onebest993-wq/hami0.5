import type { LawyerProfileData, LawyerProfileSection, ProfileAction } from '@/app/services/lawyer-cloud';
import {
    filterActionsForVisitor,
    normalizeProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';

function stripHeaderPaths<T extends { profileImagePath?: string; coverImagePath?: string }>(header: T): T {
    const next = { ...header };
    delete next.profileImagePath;
    delete next.coverImagePath;
    return next;
}

function redactSections(
    sections: LawyerProfileSection[],
    privacy: ProfilePageCustomization['privacy'],
): LawyerProfileSection[] {
    return sections.map((section) => {
        if (section.type === 'actions') {
            const actions = Array.isArray(section.data) ? (section.data as ProfileAction[]) : [];
            return {
                ...section,
                data: filterActionsForVisitor(actions, privacy, false),
            };
        }
        if (section.type === 'gallery' && !privacy.showGallery) {
            return { ...section, data: [] };
        }
        return section;
    });
}

/** يزيل الحقول المحظورة على الزائر قبل وضعها في state أو warm-cache peek */
export function redactProfileForVisitorView(profile: LawyerProfileData): LawyerProfileData {
    const customization = normalizeProfilePageCustomization(profile.customization);
    const privacy = customization.privacy;
    const header = stripHeaderPaths({ ...profile.header });

    if (!privacy.showPhoneMeta) {
        header.phone = '';
    }
    if (!privacy.showCityMeta) {
        header.city = '';
    }
    if (!privacy.showSyndicate) {
        header.syndicateId = '';
    }

    return {
        header,
        sections: redactSections(profile.sections, privacy),
        customization: {
            ...customization,
            customBlocks: privacy.showCustomBlocks ? customization.customBlocks : [],
        },
    };
}
