import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createSignedUrl = vi.fn();
const upload = vi.fn();
const encryptData = vi.fn();
const decryptData = vi.fn();

vi.mock('@/lib/supabaseClient.js', () => ({
    supabase: {
        storage: {
            from: vi.fn(() => ({
                createSignedUrl: (...args: unknown[]) => createSignedUrl(...args),
                upload: (...args: unknown[]) => upload(...args),
            })),
        },
    },
}));

vi.mock('@/app/services/CryptoService', () => ({
    CryptoService: {
        initialize: vi.fn(async () => undefined),
        encryptData: (...args: unknown[]) => encryptData(...args),
        decryptData: (...args: unknown[]) => decryptData(...args),
    },
}));

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        createPost: vi.fn(async (post: unknown) => post),
        addComment: vi.fn(async (_postId: string, comment: unknown) => comment),
        getPostById: vi.fn(async () => ({ id: 'p1', comments: [{ id: 'c1' }], updatedAt: 't1' })),
    },
}));

describe('forumService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        encryptData.mockResolvedValue('cipher-text');
        decryptData.mockResolvedValue(btoa('img-bytes'));
        createSignedUrl.mockResolvedValue({
            data: { signedUrl: 'https://signed.example/enc' },
            error: null,
        });
        upload.mockResolvedValue({ error: null });
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            text: async () => 'cipher-text',
        })));
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:decrypted'),
            revokeObjectURL: vi.fn(),
        });
        vi.stubGlobal('btoa', (s: string) => Buffer.from(s, 'binary').toString('base64'));
        vi.stubGlobal('atob', (s: string) => Buffer.from(s, 'base64').toString('binary'));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('buildForumMediaStoragePath يضع الملف تحت images مشفرة', async () => {
        const { buildForumMediaStoragePath } = await import('@/lib/forumService.js');
        const path = buildForumMediaStoragePath('user-1', 'photo.jpg');
        expect(path).toMatch(/^user-1\/images\/\d+_photo\.jpg\.enc$/);
    });

    it('uploadEncryptedForumImage يرفع blob مشفر إلى forum-media', async () => {
        const { uploadEncryptedForumImage, FORUM_MEDIA_BUCKET } = await import('@/lib/forumService.js');
        const file = new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' });
        Object.defineProperty(file, 'arrayBuffer', {
            value: async () => new TextEncoder().encode('pixels').buffer,
        });
        const attachment = await uploadEncryptedForumImage('user-1', file);

        expect(encryptData).toHaveBeenCalled();
        expect(upload).toHaveBeenCalled();
        expect(attachment).toMatchObject({
            type: 'image',
            bucket: FORUM_MEDIA_BUCKET,
            encrypted: true,
            name: 'photo.jpg',
        });
    });

    it('resolveEncryptedForumImageUrl يفك التشفير بعد createSignedUrl', async () => {
        const { resolveEncryptedForumImageUrl } = await import('@/lib/forumService.js');
        const url = await resolveEncryptedForumImageUrl({
            storagePath: 'user-1/images/x.enc',
            mimeType: 'image/jpeg',
        });

        expect(createSignedUrl).toHaveBeenCalledWith('user-1/images/x.enc', expect.any(Number));
        expect(decryptData).toHaveBeenCalledWith('cipher-text');
        expect(url).toBe('blob:decrypted');
    });

    it('subscribeToPostComments يستدعي onUpdate عبر polling', async () => {
        const { subscribeToPostComments } = await import('@/lib/forumService.js');
        const onUpdate = vi.fn();

        const unsubscribe = subscribeToPostComments('p1', onUpdate);
        await vi.waitFor(() => {
            expect(onUpdate).toHaveBeenCalledWith([{ id: 'c1' }], expect.objectContaining({ id: 'p1' }));
        });

        vi.useFakeTimers();
        unsubscribe();
        onUpdate.mockClear();
        await vi.advanceTimersByTimeAsync(10_000);
        expect(onUpdate).not.toHaveBeenCalled();
    });
});
