import { describe, expect, it } from 'vitest';
import { isSafeForumAttachmentUrl } from '@/app/services/forum/forumUrlSafety';

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
    });
});
