import { describe, expect, it } from 'vitest';
import {
    clampForumText,
    sanitizeForumPostContent,
    sanitizeForumTagsInput,
    FORUM_POST_MAX_LENGTH,
    FORUM_TAGS_MAX_LENGTH,
} from '@/app/services/forum/forumInputSecurity';

describe('forumInputSecurity', () => {
    it('يقصّ نص المنشور', () => {
        const long = 'أ'.repeat(FORUM_POST_MAX_LENGTH + 10);
        expect(sanitizeForumPostContent(long)).toHaveLength(FORUM_POST_MAX_LENGTH);
    });

    it('ينظّف الوسوم', () => {
        expect(sanitizeForumTagsInput('  ضريبة  ')).toBe('ضريبة');
        expect(clampForumText('ب'.repeat(FORUM_TAGS_MAX_LENGTH + 5), FORUM_TAGS_MAX_LENGTH)).toHaveLength(
            FORUM_TAGS_MAX_LENGTH,
        );
    });

    it('يزيل null bytes ومحارف C0 من نص المنشور', () => {
        expect(sanitizeForumPostContent('مرحبا\u0000عالم\u0007')).toBe('مرحباعالم');
        expect(sanitizeForumPostContent('سطر\nثاني')).toBe('سطر\nثاني');
    });
});
