import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    createInstantForumAttachmentPreview,
    prepareForumAttachmentForPublish,
    resolveCommunityAttachmentUrl,
} from '@/app/services/forumAttachmentService';

vi.mock('@/app/services/lawyer-cloud', () => ({
    LawyerStorage: {
        getSignedUrl: vi.fn(async (path: string) => `https://cdn.example/${path}`),
        uploadSmartFile: vi.fn(),
    },
}));

vi.mock('@/app/services/forumBlobStore', () => ({
    FORUM_IDB_PREFIX: 'idb:forum:',
    buildForumIdbPath: (key: string) => `idb:forum:${key}`,
    parseForumIdbPath: (path?: string | null) =>
        path?.startsWith('idb:forum:') ? path.slice('idb:forum:'.length) : null,
    getForumBlob: vi.fn(),
    getForumBlobObjectUrl: vi.fn(),
    putForumBlob: vi.fn(),
}));

describe('forumAttachmentService', () => {
    const revoke = vi.fn();

    beforeEach(() => {
        revoke.mockReset();
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:preview'),
            revokeObjectURL: revoke,
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('createInstantForumAttachmentPreview يُرجع blob URL فوراً', () => {
        const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
        const preview = createInstantForumAttachmentPreview(file);
        expect(preview.url).toBe('blob:preview');
        expect(preview.storagePath).toMatch(/^idb:forum:pending:/);
    });

    it('resolveCommunityAttachmentUrl يفضّل مسار السحابة على blob الميت', async () => {
        const url = await resolveCommunityAttachmentUrl({
            type: 'image',
            url: 'blob:dead-session-url',
            name: 'photo.jpg',
            storagePath: 'users/u1/drafts/photo.jpg',
            mimeType: 'image/jpeg',
        });
        expect(url).toBe('https://cdn.example/users/u1/drafts/photo.jpg');
    });

    it('prepareForumAttachmentForPublish يعود إلى IDB المحلي إذا فشل الرفع السحابي', async () => {
        const { LawyerStorage } = await import('@/app/services/lawyer-cloud');
        vi.mocked(LawyerStorage.uploadSmartFile).mockRejectedValueOnce(new Error('Upload failed'));

        const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
        const prepared = await prepareForumAttachmentForPublish(
            {
                type: 'image',
                url: 'blob:preview',
                name: 'photo.jpg',
                mimeType: 'image/jpeg',
                storagePath: 'idb:forum:pending:test',
            },
            'user-1',
            file,
        );

        expect(prepared.storagePath).toMatch(/^idb:forum:/);
        expect(prepared.storagePath).not.toContain('pending:');
        expect(prepared.url).toBe('blob:preview');
        expect(prepared.type).toBe('image');
    });
});
