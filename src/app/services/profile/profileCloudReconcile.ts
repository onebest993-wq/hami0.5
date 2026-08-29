import type {
    LawyerProfileData,
    LawyerProfileHeader,
    LawyerProfileSection,
    ProfileAction,
    ProfileGalleryItem,
} from '@/app/services/cloud/lawyerProfileTypes';
import { coerceGalleryItems } from '@/app/services/profile/profileGalleryItems';
import { getActions, getGallery } from '@/app/services/profile/profileSections';
import { normalizeProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { preferRicherLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import {
    isProfilePaintReady,
    shouldAwaitCloudProfileSettle,
} from '@/app/services/profile/profileSparseDetect';

function pickNonEmpty(local: string | undefined, remote: string | undefined): string {
    const a = local?.trim() ?? '';
    const b = remote?.trim() ?? '';
    if (a && !b) return a;
    if (b && !a) return b;
    return a.length >= b.length ? a : b;
}

function mergeHeaders(local: LawyerProfileHeader, remote: LawyerProfileHeader): LawyerProfileHeader {
    return {
        ...remote,
        ...local,
        name: preferRicherLawyerDisplayName(remote.name ?? '', local.name ?? ''),
        title: pickNonEmpty(local.title, remote.title),
        coverImage: pickNonEmpty(local.coverImage, remote.coverImage),
        profileImage: pickNonEmpty(local.profileImage, remote.profileImage),
        profileImagePath: pickNonEmpty(local.profileImagePath, remote.profileImagePath) || undefined,
        coverImagePath: pickNonEmpty(local.coverImagePath, remote.coverImagePath) || undefined,
        phone: pickNonEmpty(local.phone, remote.phone),
        city: pickNonEmpty(local.city, remote.city),
        workplace: pickNonEmpty(local.workplace, remote.workplace),
        specialization: pickNonEmpty(local.specialization, remote.specialization),
        syndicateId: pickNonEmpty(local.syndicateId, remote.syndicateId),
        practiceSinceYear: local.practiceSinceYear ?? remote.practiceSinceYear,
    };
}

function galleryItemKey(item: ProfileGalleryItem): string {
    return (item.storagePath || item.url || '').trim();
}

function mergeGallery(
    local: ProfileGalleryItem[],
    remote: ProfileGalleryItem[],
): ProfileGalleryItem[] {
    const byKey = new Map<string, ProfileGalleryItem>();
    for (const item of remote) {
        const key = galleryItemKey(item);
        if (key) byKey.set(key, item);
    }
    for (const item of local) {
        const key = galleryItemKey(item);
        if (key) byKey.set(key, item);
    }
    const merged = [...byKey.values()];
    if (merged.length > 0) return merged;
    return local.length >= remote.length ? local : remote;
}

function mergeActions(local: ProfileAction[], remote: ProfileAction[]): ProfileAction[] {
    const byId = new Map<string, ProfileAction>();
    for (const action of remote) {
        if (action.id) byId.set(action.id, action);
    }
    for (const action of local) {
        if (!action.id) continue;
        const existing = byId.get(action.id);
        if (!existing) {
            byId.set(action.id, action);
            continue;
        }
        byId.set(
            action.id,
            (action.value?.trim().length ?? 0) >= (existing.value?.trim().length ?? 0)
                ? action
                : existing,
        );
    }
    const merged = [...byId.values()];
    if (merged.length > 0) return merged;
    return local.length >= remote.length ? local : remote;
}

function upsertSection(
    sections: LawyerProfileSection[],
    type: 'gallery' | 'actions',
    data: ProfileGalleryItem[] | ProfileAction[],
): LawyerProfileSection[] {
    const fallbackId = type === 'gallery' ? 'gallery-1' : 'actions-1';
    const existing = sections.find((section) => section.type === type);
    const next: LawyerProfileSection = {
        id: existing?.id ?? fallbackId,
        type,
        data,
    };
    return [...sections.filter((section) => section.type !== type), next];
}

function mergeOwnerProfiles(local: LawyerProfileData, remote: LawyerProfileData): LawyerProfileData {
    const localGallery = coerceGalleryItems(getGallery(local.sections));
    const remoteGallery = coerceGalleryItems(getGallery(remote.sections));
    const gallery = mergeGallery(localGallery, remoteGallery);
    const actions = mergeActions(getActions(local.sections), getActions(remote.sections));
    const baseSections = local.sections.length > 0 ? local.sections : remote.sections;
    const sections = upsertSection(
        upsertSection(baseSections, 'gallery', gallery),
        'actions',
        actions,
    );
    const localCustomization = normalizeProfilePageCustomization(local.customization);
    const remoteCustomization = normalizeProfilePageCustomization(remote.customization);
    const localBlocks = localCustomization.customBlocks.length;
    const remoteBlocks = remoteCustomization.customBlocks.length;
    const customization =
        localBlocks > 0 && remoteBlocks === 0
            ? localCustomization
            : remoteBlocks > 0 && localBlocks === 0
              ? remoteCustomization
              : {
                    ...remoteCustomization,
                    ...localCustomization,
                    customBlocks:
                        localBlocks >= remoteBlocks
                            ? localCustomization.customBlocks
                            : remoteCustomization.customBlocks,
                    appearance: localCustomization.appearance ?? remoteCustomization.appearance,
                    privacy: localCustomization.privacy ?? remoteCustomization.privacy,
                };

    return {
        header: mergeHeaders(local.header, remote.header),
        sections,
        customization,
    };
}

/**
 * لا تُكتب سحابة شحيحة فوق ملف محلي أغنى (معرض/تواصل لم تُزامَن بعد).
 * عند الطرفين الغنيين تُدمج القنوات والمعرض بدل آخر-كتابة-تفوز.
 */
export function reconcileOwnerProfileFromCloud(
    local: LawyerProfileData | null,
    remote: LawyerProfileData,
): LawyerProfileData {
    if (!local) return remote;
    if (isProfilePaintReady(local) && shouldAwaitCloudProfileSettle(remote)) {
        return local;
    }
    if (shouldAwaitCloudProfileSettle(local) && isProfilePaintReady(remote)) {
        return remote;
    }
    if (shouldAwaitCloudProfileSettle(local) && shouldAwaitCloudProfileSettle(remote)) {
        return local.header.name?.trim() ? local : remote;
    }
    return mergeOwnerProfiles(local, remote);
}
