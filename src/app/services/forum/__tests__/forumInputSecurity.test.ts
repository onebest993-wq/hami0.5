import { describe, expect, it } from 'vitest';
import {
    clampForumText,
    stripForumHtml,
    sanitizeForumPostContent,
    sanitizeForumTagsInput,
    sanitizeForumActorLabel,
    sanitizeForumReportReason,
    FORUM_POST_MAX_LENGTH,
    FORUM_TAGS_MAX_LENGTH,
    FORUM_REPORT_REASON_MAX,
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

    it('يزيل أقواس الوسوم من الوسوم واسم الممثل', () => {
        expect(sanitizeForumTagsInput('<img src=x>قانون')).toBe('قانون');
        expect(sanitizeForumActorLabel('  <b>محامٍ</b>  ')).toBe('محامٍ');
        expect(sanitizeForumReportReason(`${'س'.repeat(600)}`).length).toBe(FORUM_REPORT_REASON_MAX);
    });

    it('XSS طبقة 1 — stripForumHtml يزيل جميع وسوم HTML الصريحة', () => {
        expect(stripForumHtml('<script>alert(1)</script>مرحبا')).toBe('مرحبا');
        expect(stripForumHtml('<p onload="x=1">نص</p>')).toBe('نص');
        expect(stripForumHtml('<img src=x onerror="alert(1)">')).toBe('');
        expect(stripForumHtml('<a href="javascript:alert(1)">رابط</a>')).toBe('رابط');
        expect(stripForumHtml('<iframe/><!-- comment --><br>أهلًا')).toBe('أهلًا');
    });

    it('XSS — payloadات معروفة تُنظّف تماماً قبل حفظ المنشور', () => {
        expect(sanitizeForumPostContent('<IMG SRC=javascript:alert(\'XSS\')>')).toBe('');
        expect(sanitizeForumPostContent('<ScRiPt>alert(1)</sCrIpT>محتوى')).toBe('محتوى');
        expect(sanitizeForumPostContent('<svg onload=alert(1)>')).toBe('');
        expect(sanitizeForumPostContent('<a href="data:text/html,<script>alert(1)</script>">x</a>')).toBe('x');
    });
});
