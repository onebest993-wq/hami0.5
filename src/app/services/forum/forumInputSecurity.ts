export const FORUM_POST_MAX_LENGTH = 10_000;
export const FORUM_TAGS_MAX_LENGTH = 200;

export function clampForumText(value: string, max: number): string {
    return value.slice(0, max);
}

export function sanitizeForumPostContent(content: string): string {
    /* إزالة null/C0 عدا الأسطر البيضاء الشائعة — نص المنشور يُعرض كنص React */
    const cleaned = content.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    return clampForumText(cleaned.trim(), FORUM_POST_MAX_LENGTH);
}

export function sanitizeForumTagsInput(tags: string): string {
    return clampForumText(tags.trim(), FORUM_TAGS_MAX_LENGTH);
}
