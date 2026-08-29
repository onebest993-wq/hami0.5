export type ForumGroupCreateGuardResult =
    | { ok: false; warning: string }
    | { ok: true; name: string; description: string };

export function resolveForumGroupCreateFields(
    rawName: string,
    rawDescription: string,
    currentUserId: string | null,
): ForumGroupCreateGuardResult {
    if (!currentUserId) {
        return { ok: false, warning: 'سجّل الدخول لإنشاء مجموعة' };
    }
    const name = rawName.trim();
    const description = rawDescription.trim();
    if (name.length < 3) {
        return { ok: false, warning: 'اسم المجموعة قصير جداً (3 أحرف على الأقل)' };
    }
    if (description.length < 10) {
        return { ok: false, warning: 'اكتب وصفاً أوضح للمجموعة (10 أحرف على الأقل)' };
    }
    return { ok: true, name, description };
}
