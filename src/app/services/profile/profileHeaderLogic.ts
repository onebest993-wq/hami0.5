import {
    isNamePrefixEnrichment,
    preferRicherLawyerDisplayName,
} from '@/app/services/profile/resolveLawyerDisplayName';

/** الحرف الأول لعرضه في شارة الهيدر عند غياب الصورة */
export function resolveProfileHeaderInitial(displayName: string, fallback = 'م'): string {
    const trimmed = displayName.trim();
    return trimmed.charAt(0) || fallback;
}

/** هل حدث تحديث الملف يخص المستخدم الحالي */
export function shouldApplyProfileHeaderUpdate(
    eventUserId: string | undefined,
    currentUserId: string,
): boolean {
    if (!eventUserId?.trim()) return true;
    return eventUserId === currentUserId;
}

/**
 * جلب قديم بعد الحفظ كان يستبدل الاسم المحفوظ باسم الجلسة/القرص السابق.
 * إن طابق المعروض الكاش الدافئ، لا نقبل اسماً وارداً مختلفاً إلا إغناء بادئة.
 */
export function resolveHeaderDisplayNameAfterLoad(
    displayed: string,
    incoming: string,
    warmName: string,
): string {
    const shown = displayed.trim();
    const next = incoming.trim();
    const warm = warmName.trim();
    if (
        shown &&
        warm &&
        shown === warm &&
        next &&
        next !== shown &&
        !isNamePrefixEnrichment(shown, next)
    ) {
        return shown;
    }
    return preferRicherLawyerDisplayName(shown, next);
}
