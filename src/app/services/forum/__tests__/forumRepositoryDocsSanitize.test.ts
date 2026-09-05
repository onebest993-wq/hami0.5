import { describe, expect, it } from 'vitest';
import { sanitizeForumRepositoryDocument } from '@/app/services/forum/forumRepositoryDocsSanitize';
import {
    FORUM_REPOSITORY_REF_PREFIX,
    parseForumRepositoryRef,
    redactForumRepositoryDocument,
} from '@/app/services/forum/forumRepositoryDocsMap';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

const AUTHOR = '11111111-1111-4111-8111-111111111111';

function doc(partial: Partial<RepositoryDocument> = {}): Partial<RepositoryDocument> {
    return {
        title: 'عقد شراكة',
        description: 'وصف كافٍ للمستند القانوني',
        type: 'عقد',
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
        storagePath: `${AUTHOR}/repository/a.pdf`,
        fileSize: 12,
        tags: ['#شركات'],
        ...partial,
    };
}

describe('تعقيم مستند المستودع', () => {
    it('يرفض المرفق المحلي قبل الفهرسة', () => {
        expect(() => sanitizeForumRepositoryDocument(doc({ storagePath: 'idb:forum:x' }), AUTHOR, 'محامي')).toThrow(
            'يجب رفع الملف إلى الخادم قبل النشر',
        );
        expect(() => sanitizeForumRepositoryDocument(doc({ storagePath: 'blob:https://x' }), AUTHOR, 'محامي')).toThrow(
            'يجب رفع الملف إلى الخادم قبل النشر',
        );
    });

    it('يرفض مساراً لا يخص الناشر', () => {
        expect(() =>
            sanitizeForumRepositoryDocument(doc({ storagePath: 'other-user/repository/a.pdf' }), AUTHOR, 'محامي'),
        ).toThrow('مسار الملف لا يخص الناشر');
    });

    it('يقبل مساراً سحابياً يملكه الناشر', () => {
        const saved = sanitizeForumRepositoryDocument(doc(), AUTHOR, 'محامي موثوق');
        expect(saved.authorId).toBe(AUTHOR);
        expect(saved.storagePath).toBe(`${AUTHOR}/repository/a.pdf`);
        expect(saved.title).toBe('عقد شراكة');
    });
});

describe('إخفاء مسار المكتبة المشتركة', () => {
    const full: RepositoryDocument = {
        id: '22222222-2222-4222-8222-222222222222',
        title: 'عقد',
        description: 'وصف',
        type: 'عقد',
        authorId: AUTHOR,
        authorName: 'محامي',
        uploadDate: '2026-08-30',
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
        storagePath: `${AUTHOR}/repository/a.pdf`,
        fileSize: 10,
        tags: [],
    };

    it('يخفي authorId ومسار التخزين عن غير المالك', () => {
        const redacted = redactForumRepositoryDocument(full, 'viewer', false);
        expect(redacted.authorId).toBe('');
        expect(redacted.authorName).toBe('محامي');
        expect(redacted.storagePath).toBe(`${FORUM_REPOSITORY_REF_PREFIX}${full.id}`);
        expect(parseForumRepositoryRef(redacted.storagePath)).toBe(full.id);
    });

    it('يبقي المعرّف والمسار للمالك والمشرف', () => {
        expect(redactForumRepositoryDocument(full, AUTHOR, false).storagePath).toBe(full.storagePath);
        expect(redactForumRepositoryDocument(full, 'admin', true).authorId).toBe(AUTHOR);
    });

    it('يرفض مرجع forum-repo غير صالح', () => {
        expect(parseForumRepositoryRef('forum-repo:not-a-uuid')).toBeNull();
        expect(parseForumRepositoryRef(`${AUTHOR}/repository/a.pdf`)).toBeNull();
    });
});
