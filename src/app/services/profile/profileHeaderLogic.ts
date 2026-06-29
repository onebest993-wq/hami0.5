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
