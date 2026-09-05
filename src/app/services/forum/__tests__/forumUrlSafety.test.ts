import { describe, expect, it } from 'vitest';
import { buildRepositoryPublicFileUrl, isSafeForumAttachmentUrl, isSafeRepositorySharePath, sanitizeForumCoverImage } from '@/app/services/forum/forumUrlSafety';

describe('forumUrlSafety', () => {
    it('يرفض javascript و data:text/html و file:', () => {
        expect(isSafeForumAttachmentUrl('javascript:alert(1)')).toBe(false);
        expect(isSafeForumAttachmentUrl('data:text/html,<h1>x</h1>')).toBe(false);
        expect(isSafeForumAttachmentUrl('vbscript:msgbox')).toBe(false);
        expect(isSafeForumAttachmentUrl('file:///etc/passwd')).toBe(false);
    });

    it('يقبل http(s) و blob و data:image/audio ومسارات بلا مخطط', () => {
        expect(isSafeForumAttachmentUrl('https://cdn.example/a.jpg')).toBe(true);
        expect(isSafeForumAttachmentUrl('http://cdn.example/a.jpg')).toBe(true);
        expect(isSafeForumAttachmentUrl('blob:https://hami.local/uuid')).toBe(true);
        expect(isSafeForumAttachmentUrl('data:image/png;base64,aaa')).toBe(true);
        expect(isSafeForumAttachmentUrl('data:audio/webm;base64,aaa')).toBe(true);
        expect(isSafeForumAttachmentUrl('idb:forum:abc')).toBe(true);
        expect(isSafeForumAttachmentUrl('users/u1/drafts/a.jpg')).toBe(true);
        expect(isSafeForumAttachmentUrl('//evil.example/x.png')).toBe(false);
        expect(isSafeForumAttachmentUrl('users/../etc/passwd')).toBe(false);
    });

    it('يرفض مسارات مشاركة خبيثة ويبني رابطاً آمناً', () => {
        expect(isSafeRepositorySharePath('../etc/passwd')).toBe(false);
        expect(isSafeRepositorySharePath('https://evil.example/a')).toBe(false);
        expect(isSafeRepositorySharePath('idb:forum:abc')).toBe(true);
        expect(buildRepositoryPublicFileUrl('https://h.iq', 'p/1.pdf')).toBe('https://h.iq/api/file/p/1.pdf');
        expect(buildRepositoryPublicFileUrl('javascript:alert(1)', 'p/1.pdf')).toBeNull();
        expect(buildRepositoryPublicFileUrl('https://h.iq', 'a b.pdf')).toBe('https://h.iq/api/file/a%20b.pdf');
    });
    it('يرفض data:image/svg+xml لأنها قابلة لحقن سكربت', () => {
        expect(isSafeForumAttachmentUrl('data:image/svg+xml;base64,PHN2Zy8+')).toBe(false);
        expect(isSafeForumAttachmentUrl('DATA:IMAGE/SVG+XML,<svg></svg>')).toBe(false);
    });

    it('يعقّم غلاف المجموعة', () => {
        expect(sanitizeForumCoverImage('javascript:alert(1)')).toBeNull();
        expect(sanitizeForumCoverImage('//cdn.evil/x')).toBeNull();
        expect(sanitizeForumCoverImage('https://cdn.example/cover.jpg')).toBe('https://cdn.example/cover.jpg');
        expect(sanitizeForumCoverImage('  ')).toBeNull();
    });
});
