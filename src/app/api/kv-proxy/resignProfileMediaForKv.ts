import { getSupabaseAdminClient } from '../security/supabaseAdminClient.ts';
import {
    isStoragePathOwnedByUser,
    resolveUploadBucket,
    SIGNED_URL_TTL_SEC,
} from '../upload/uploadStorageUtils.ts';
import type { LawyerProfileData, ProfileGalleryItem } from '@/app/services/cloud/lawyerProfileTypes';
import { coerceGalleryItems } from '@/app/services/profile/profileGalleryItems';
import {
    normalizeProfilePageCustomization,
    type ProfileCustomBlock,
} from '@/app/services/profile/profilePageCustomization';

/* كل صورة في المعرض تمرّ من هنا؛ ملفّ بعشرين صورة كان يبني عشرين عميلاً */
const getAdmin = getSupabaseAdminClient;

async function signOwnedPath(
    path: string | undefined,
    ownerId: string,
): Promise<string | undefined> {
    const trimmed = path?.trim();
    if (!trimmed || !isStoragePathOwnedByUser(trimmed, ownerId)) return undefined;
    const admin = getAdmin();
    if (!admin) return undefined;
    try {
        const { data, error } = await admin.storage
            .from(resolveUploadBucket())
            .createSignedUrl(trimmed, SIGNED_URL_TTL_SEC);
        if (error || !data?.signedUrl) return undefined;
        return data.signedUrl;
    } catch {
        return undefined;
    }
}

async function resignGalleryItems(
    items: ProfileGalleryItem[],
    ownerId: string,
): Promise<ProfileGalleryItem[]> {
    return Promise.all(
        items.map(async (item) => {
            const signed = await signOwnedPath(item.storagePath, ownerId);
            return signed ? { ...item, url: signed } : item;
        }),
    );
}

async function resignBlocks(
    blocks: ProfileCustomBlock[],
    ownerId: string,
): Promise<ProfileCustomBlock[]> {
    return Promise.all(
        blocks.map(async (block) => {
            let next = block;
            const imageUrl = await signOwnedPath(block.imageStoragePath, ownerId);
            if (imageUrl) next = { ...next, imageUrl };
            const bgPath = block.canvasStyle?.backgroundStoragePath;
            const bgUrl = await signOwnedPath(bgPath, ownerId);
            if (bgUrl && next.canvasStyle) {
                next = {
                    ...next,
                    canvasStyle: { ...next.canvasStyle, backgroundImage: bgUrl },
                };
            }
            return next;
        }),
    );
}

/**
 * قبل redact الزائر: يحدّث روابط الوسائط بتوقيع خدمة جديد لمسارات المالك فقط.
 * بدون هذا تنتهي صلاحية الروابط المخزّنة في KV (~7 أيام) ولا يستطيع الزائر إعادة التوقيع.
 */
export async function resignProfileMediaUrlsForOwner(
    profile: LawyerProfileData,
    ownerId: string,
): Promise<LawyerProfileData> {
    const header = { ...profile.header };
    const avatar = await signOwnedPath(header.profileImagePath, ownerId);
    if (avatar) header.profileImage = avatar;
    const cover = await signOwnedPath(header.coverImagePath, ownerId);
    if (cover) header.coverImage = cover;

    const sections = await Promise.all(
        profile.sections.map(async (section) => {
            if (section.type !== 'gallery' || !Array.isArray(section.data)) return section;
            const items = coerceGalleryItems(section.data);
            return { ...section, data: await resignGalleryItems(items, ownerId) };
        }),
    );

    const customization = normalizeProfilePageCustomization(profile.customization);
    const customBlocks = await resignBlocks(customization.customBlocks, ownerId);

    return {
        ...profile,
        header,
        sections,
        customization: { ...customization, customBlocks },
    };
}
