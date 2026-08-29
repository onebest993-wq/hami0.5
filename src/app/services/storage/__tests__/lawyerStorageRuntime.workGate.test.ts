import { beforeEach, describe, expect, it, vi } from 'vitest';

const isLawyerWorkCloudLive = vi.hoisted(() => vi.fn(() => false));
const fetchSecureResponse = vi.hoisted(() => vi.fn());
const fetchSecure = vi.hoisted(() => vi.fn());

vi.mock('@/app/services/settings/lawyerWorkCloudGate', () => ({
    isLawyerWorkCloudLive: (...args: unknown[]) => isLawyerWorkCloudLive(...args),
}));

vi.mock('@/app/lib/supabase-client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(() =>
                Promise.resolve({
                    data: { session: { user: { id: 'u1' } } },
                    error: null,
                }),
            ),
        },
    },
}));

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecureResponse: (...args: unknown[]) => fetchSecureResponse(...args),
        fetchSecure: (...args: unknown[]) => fetchSecure(...args),
    },
}));

vi.mock('@/app/utils/stripMetadata', () => ({
    stripImageMetadata: async (file: File) => file,
}));

import { LawyerStorage } from '@/app/services/storage/lawyerStorageRuntime';

function pdfFile(): File {
    return new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' });
}

describe('LawyerStorage — بوابة العمل المحلي', () => {
    beforeEach(() => {
        isLawyerWorkCloudLive.mockReturnValue(false);
        fetchSecureResponse.mockReset();
        fetchSecure.mockReset();
    });

    it('يرفض vault/scans قبل /api/upload عندما المزامنة مطفأة', async () => {
        await expect(LawyerStorage.uploadSmartFile('u1', pdfFile(), 'vault')).rejects.toThrow(
            'work_cloud_upload_disabled',
        );
        await expect(LawyerStorage.uploadSmartFile('u1', pdfFile(), 'scans')).rejects.toThrow(
            'work_cloud_upload_disabled',
        );
        expect(fetchSecureResponse).not.toHaveBeenCalled();
    });

    it('يسمح برفع المنتدى والملف المهني والمسودة حتى بلا مزامنة عمل', async () => {
        fetchSecureResponse.mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ path: 'u1/forum-media/x.jpg' }),
        });
        await expect(LawyerStorage.uploadSmartFile('u1', pdfFile(), 'forum-media')).resolves.toMatchObject({
            path: 'u1/forum-media/x.jpg',
        });
        await expect(LawyerStorage.uploadSmartFile('u1', pdfFile(), 'repository')).resolves.toMatchObject({
            path: 'u1/forum-media/x.jpg',
        });
        await expect(LawyerStorage.uploadSmartFile('u1', pdfFile(), 'audio')).resolves.toBeTruthy();
        await expect(LawyerStorage.uploadSmartFile('u1', pdfFile(), 'drafts')).resolves.toBeTruthy();
        expect(fetchSecureResponse).toHaveBeenCalled();
    });

    it('لا يطلب رابط توقيع لمسار vault/scans عندما المزامنة مطفأة', async () => {
        await expect(LawyerStorage.getSignedUrl('u1/vault/x.pdf')).resolves.toBeNull();
        await expect(LawyerStorage.getSignedUrl('u1/scans/x.pdf')).resolves.toBeNull();
        expect(fetchSecure).not.toHaveBeenCalled();
    });

    it('يطلب رابط توقيع لمسار المنتدى حتى بلا مزامنة عمل', async () => {
        fetchSecure.mockResolvedValue({ ok: true, downloadUrl: 'https://cdn.test/f' });
        await expect(LawyerStorage.getSignedUrl('u1/forum-media/x.jpg')).resolves.toBe('https://cdn.test/f');
        expect(fetchSecure).toHaveBeenCalledTimes(1);
    });

    it('يرفع vault عندما مزامنة العمل حيّة', async () => {
        isLawyerWorkCloudLive.mockReturnValue(true);
        fetchSecureResponse.mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ path: 'u1/vault/x.pdf' }),
        });
        await expect(LawyerStorage.uploadSmartFile('u1', pdfFile(), 'vault')).resolves.toMatchObject({
            path: 'u1/vault/x.pdf',
        });
        expect(fetchSecureResponse).toHaveBeenCalled();
    });
});
