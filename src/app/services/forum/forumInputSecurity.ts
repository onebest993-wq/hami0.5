export const FORUM_POST_MAX_LENGTH = 10_000;
export const FORUM_TAGS_MAX_LENGTH = 200;
export const FORUM_ACTOR_LABEL_MAX = 80;
export const FORUM_REPORT_REASON_MAX = 500;

const FORUM_C0_EXCEPT_WHITESPACE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function clampForumText(value: string, max: number): string {
    return value.slice(0, max);
}

export function sanitizeForumPostContent(content: string): string {
    /* إزالة null/C0 عدا الأسطر البيضاء الشائعة — نص المنشور يُعرض كنص React */
    const cleaned = content.replace(FORUM_C0_EXCEPT_WHITESPACE, '');
    return clampForumText(cleaned.trim(), FORUM_POST_MAX_LENGTH);
}

export function sanitizeForumTagsInput(tags: string): string {
    const cleaned = tags.replace(FORUM_C0_EXCEPT_WHITESPACE, '').replace(/[<>]/g, '');
    return clampForumText(cleaned.trim(), FORUM_TAGS_MAX_LENGTH);
}

/** اسم ظاهر في إشعار متابعة — بلا وسوم ولا محارف تحكم */
export function sanitizeForumActorLabel(name: string): string {
    return clampForumText(sanitizeForumTagsInput(name), FORUM_ACTOR_LABEL_MAX);
}

export function sanitizeForumReportReason(reason: string): string {
    return clampForumText(sanitizeForumPostContent(reason), FORUM_REPORT_REASON_MAX);
}
