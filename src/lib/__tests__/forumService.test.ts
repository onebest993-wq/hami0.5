import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const encryptData = vi.fn();
const decryptData = vi.fn();

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

const fetchSecure = vi.fn();
const fetchSecureResponse = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: (...args: unknown[]) => fetchSecure(...args),
        fetchSecureResponse: (...args: unknown[]) => fetchSecureResponse(...args),
    },
}));

describe('forumService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        encryptData.mockResolvedValue('cipher-text');
        decryptData.mockResolvedValue(btoa('img-bytes'));
        fetchSecure.mockResolvedValue({ downloadUrl: 'https://bff.example/enc' });
        fetchSecureResponse.mockResolvedValue({
            ok: true,
            json: async () => ({
                ok: true,
                path: 'user-1/forum-media/1_photo.jpg.enc',
                downloadUrl: 'https://bff.example/enc',
            }),
        });
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

    it('uploadEncryptedForumImage يرفع عبر /api/upload الموقّع لا التخزين المباشر', async () => {
        const { uploadEncryptedForumImage, FORUM_MEDIA_BUCKET } = await import('@/lib/forumService.js');
        const file = new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' });
        Object.defineProperty(file, 'arrayBuffer', {
            value: async () => new TextEncoder().encode('pixels').buffer,
        });
        const attachment = await uploadEncryptedForumImage('user-1', file);

        expect(encryptData).toHaveBeenCalled();
        expect(fetchSecureResponse).toHaveBeenCalledWith(
            '/api/upload',
            expect.objectContaining({ method: 'POST' }),
        );
        expect(attachment).toMatchObject({
            type: 'image',
            bucket: FORUM_MEDIA_BUCKET,
            encrypted: true,
            name: 'photo.jpg',
            storagePath: 'user-1/forum-media/1_photo.jpg.enc',
        });
    });

    it('resolveEncryptedForumImageUrl يفك التشفير بعد signed-url عبر BFF', async () => {
        const { resolveEncryptedForumImageUrl } = await import('@/lib/forumService.js');
        const url = await resolveEncryptedForumImageUrl({
            storagePath: 'user-1/images/x.enc',
            mimeType: 'image/jpeg',
        });

        expect(fetchSecure).toHaveBeenCalledWith(
            '/api/upload/signed-url',
            expect.objectContaining({ method: 'POST' }),
        );
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
