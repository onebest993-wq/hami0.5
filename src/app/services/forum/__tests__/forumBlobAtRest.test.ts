import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hasMasterKey = vi.fn(() => false);
const encryptData = vi.fn(async (plain: string) => `iv:${plain}`);
const decryptData = vi.fn(async (cipher: string) => cipher.replace(/^iv:/, ''));

vi.mock('@/app/services/CryptoService', () => ({
    CryptoService: {
        hasMasterKey: () => hasMasterKey(),
        encryptData: (plain: string) => encryptData(plain),
        decryptData: (cipher: string) => decryptData(cipher),
    },
}));

import { unwrapForumBlobFromAtRest, wrapForumBlobForAtRest } from '@/app/services/forum/forumBlobAtRest';

describe('forumBlobAtRest', () => {
    beforeEach(() => {
        hasMasterKey.mockReturnValue(false);
        encryptData.mockClear();
        decryptData.mockClear();
    });

    afterEach(() => {
        hasMasterKey.mockReturnValue(false);
    });

    it('يحفظ واضحاً إن لم يتوفر مفتاح الجلسة', async () => {
        const plain = new Blob(['عقد'], { type: 'application/pdf' });
        const wrapped = await wrapForumBlobForAtRest(plain);
        expect(wrapped.encrypted).toBe(false);
        expect(encryptData).not.toHaveBeenCalled();
        expect(await wrapped.blob.text()).toBe('عقد');
    });

    it('يشفر عند وجود المفتاح', async () => {
        hasMasterKey.mockReturnValue(true);
        const plain = new Blob(['سر'], { type: 'text/plain' });
        const wrapped = await wrapForumBlobForAtRest(plain);
        expect(wrapped.encrypted).toBe(true);
        expect(encryptData).toHaveBeenCalled();
        expect(await unwrapForumBlobFromAtRest({ ...wrapped, mimeType: 'text/plain' })).toBeInstanceOf(Blob);
        expect(await (await unwrapForumBlobFromAtRest({ ...wrapped, mimeType: 'text/plain' }))!.text()).toBe(
            'سر',
        );
    });

    it('يعيد الملف القديم كما هو بلا encrypted', async () => {
        const legacy = new Blob(['قديم'], { type: 'application/pdf' });
        const out = await unwrapForumBlobFromAtRest({ blob: legacy, mimeType: 'application/pdf' });
        expect(out).toBe(legacy);
        expect(decryptData).not.toHaveBeenCalled();
    });

    it('لا يعرض المشفر كنص واضح إن غاب المفتاح', async () => {
        const cipher = new Blob(['iv:aaaa'], { type: 'application/octet-stream' });
        const out = await unwrapForumBlobFromAtRest({
            blob: cipher,
            mimeType: 'application/pdf',
            encrypted: true,
        });
        expect(out).toBeNull();
    });

    it('يرجع للواضح إن فشل التشفير', async () => {
        hasMasterKey.mockReturnValue(true);
        encryptData.mockRejectedValueOnce(new Error('encrypt-failed'));
        const plain = new Blob(['عقد'], { type: 'application/pdf' });
        const wrapped = await wrapForumBlobForAtRest(plain);
        expect(wrapped.encrypted).toBe(false);
        expect(await wrapped.blob.text()).toBe('عقد');
    });
});
