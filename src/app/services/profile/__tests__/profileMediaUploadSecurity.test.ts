import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/services/storage/lawyerStorageRuntime', () => ({
    LawyerStorage: {
        uploadSmartFile: vi.fn(),
        getSignedUrl: vi.fn(),
    },
}));

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: vi.fn() },
}));

describe('uploadProfileMedia security gates', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('يرفض SVG وملفات غير الصور', async () => {
        const { uploadProfileMedia } = await import('@/app/services/profileMediaService');
        await expect(
            uploadProfileMedia('u1', new File(['x'], 'x.svg', { type: 'image/svg+xml' })),
        ).rejects.toThrow('نوع الملف غير مدعوم');
        await expect(
            uploadProfileMedia('u1', new File(['x'], 'x.txt', { type: 'text/plain' })),
        ).rejects.toThrow('نوع الملف غير مدعوم');
    });

    it('يرفض ملفاً أكبر من الحد الخام', async () => {
        const { uploadProfileMedia } = await import('@/app/services/profileMediaService');
        const big = new File([new Uint8Array(13 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
        await expect(uploadProfileMedia('u1', big)).rejects.toThrow('image too large');
    });
});
