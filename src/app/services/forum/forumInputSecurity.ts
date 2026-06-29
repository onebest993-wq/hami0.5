export const FORUM_POST_MAX_LENGTH = 10_000;
export const FORUM_TAGS_MAX_LENGTH = 200;

export function clampForumText(value: string, max: number): string {
    return value.slice(0, max);
}

export function sanitizeForumPostContent(content: string): string {
    return clampForumText(content.trim(), FORUM_POST_MAX_LENGTH);
}

export function sanitizeForumTagsInput(tags: string): string {
    return clampForumText(tags.trim(), FORUM_TAGS_MAX_LENGTH);
}
