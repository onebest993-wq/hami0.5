import { sanitizeForumPostContent } from '@/app/services/forum/forumInputSecurity';
import { VOICE_POST_DEFAULT_CONTENT } from './communityScreenConstants';

export type ForumPublishContentResult =
    | { ok: true; content: string }
    | { ok: false; reason: 'too_short' };

export function resolveForumPostPublishContent(
    rawText: string,
    hasVoiceAttachment: boolean,
): ForumPublishContentResult {
    const rawContent = sanitizeForumPostContent(rawText);
    const content =
        rawContent.length >= 10
            ? rawContent
            : hasVoiceAttachment
              ? VOICE_POST_DEFAULT_CONTENT
              : '';
    if (content.length < 10) return { ok: false, reason: 'too_short' };
    return { ok: true, content };
}

export function parseForumManualTags(
    tagText: string,
    formatTag: (value: string) => string,
): string[] {
    return tagText
        .split(/[,|\s]+/g)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => formatTag(item))
        .filter(Boolean);
}
