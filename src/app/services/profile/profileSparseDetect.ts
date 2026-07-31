import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';

/**
 * ملف بلا وسائط/تواصل — stub قبل استقرار البيانات.
 * لا يُرسم كواجهة «جاهزة» حتى لا يومض حرف/فراغ ← صورة/محتوى.
 */
export function shouldAwaitCloudProfileSettle(profile: LawyerProfileData | null | undefined): boolean {
    if (!profile) return true;
    const hasImage = Boolean(profile.header?.profileImage?.trim());
    const gallery = profile.sections?.find((s) => s.type === 'gallery');
    const actions = profile.sections?.find((s) => s.type === 'actions');
    const galleryLen = Array.isArray(gallery?.data) ? gallery.data.length : 0;
    const actionsLen = Array.isArray(actions?.data) ? actions.data.length : 0;
    return !hasImage && galleryLen === 0 && actionsLen === 0;
}

/** جاهز لرسم إطار واحد نظيف — بلا بذرة فارغة */
export function isProfilePaintReady(profile: LawyerProfileData | null | undefined): boolean {
    return Boolean(profile) && !shouldAwaitCloudProfileSettle(profile);
}
