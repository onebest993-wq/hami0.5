import { sanitizeForumPostContent } from '@/app/services/forum/forumInputSecurity';

export const COMMENT_MAX_LENGTH = 5_000;

export type ForumCommentContentResult =
    | { ok: true; content: string }
    | { ok: false; reason: 'empty' | 'too_long' };

export function resolveForumCommentContent(raw: string): ForumCommentContentResult {
    const content = sanitizeForumPostContent(raw).slice(0, COMMENT_MAX_LENGTH);
    if (!content) return { ok: false, reason: 'empty' };
    if (raw.trim().length > COMMENT_MAX_LENGTH) return { ok: false, reason: 'too_long' };
    return { ok: true, content };
}
