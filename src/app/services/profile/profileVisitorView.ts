import type { LawyerProfileData, LawyerProfileSection, ProfileAction } from '@/app/services/profile/profileTypes';
import type { ProfileGalleryItem } from '@/app/services/cloud/lawyerProfileTypes';
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

function stripStoragePathsFromGallery(
    data: string[] | ProfileGalleryItem[],
): string[] | ProfileGalleryItem[] {
    return data.map((entry): string | ProfileGalleryItem => {
        if (typeof entry === 'string') return entry;
        const item: ProfileGalleryItem = { ...entry };
        delete item.storagePath;
        return item;
    }) as string[] | ProfileGalleryItem[];
}

function stripStoragePathsFromBlocks(
    blocks: ProfilePageCustomization['customBlocks'],
): ProfilePageCustomization['customBlocks'] {
    return blocks.map((block) => {
        const next = { ...block };
        delete next.imageStoragePath;
        if (next.canvasStyle?.backgroundStoragePath) {
            const canvasStyle = { ...next.canvasStyle };
            delete canvasStyle.backgroundStoragePath;
            next.canvasStyle = canvasStyle;
        }
        return next;
    });
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
        if (section.type === 'gallery') {
            if (!privacy.showGallery) {
                return { ...section, data: [] };
            }
            const galleryData = Array.isArray(section.data)
                ? (section.data as string[] | ProfileGalleryItem[])
                : [];
            return { ...section, data: stripStoragePathsFromGallery(galleryData) };
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

    const customBlocks = privacy.showCustomBlocks
        ? stripStoragePathsFromBlocks(customization.customBlocks)
        : [];

    return {
        header,
        sections: redactSections(profile.sections, privacy),
        customization: {
            ...customization,
            /* لا تُسرَّب قائمة الإخفاء للزائر — يكفي تطبيقها على القنوات */
            privacy: {
                ...privacy,
                hiddenContactIds: [],
            },
            customBlocks,
        },
    };
}
