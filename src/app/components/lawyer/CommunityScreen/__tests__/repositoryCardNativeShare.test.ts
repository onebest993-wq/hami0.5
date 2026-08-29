import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: toast,
}));

import { shareRepositoryDocument } from '../repositoryCardNativeShare';

describe('shareRepositoryDocument', () => {
    beforeEach(() => {
        toast.error.mockReset();
        toast.success.mockReset();
    });

    it('يرفض بلا مسار تخزين', async () => {
        await shareRepositoryDocument({ title: 'ع', description: '', storagePath: '' }, 'https://h.iq');
        expect(toast.error).toHaveBeenCalledWith('رابط الملف غير متاح للمشاركة');
    });

    it('ينسخ الرابط إن لم تتوفر المشاركة الأصلية', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        await shareRepositoryDocument(
            { title: 'عقد', description: 'وصف', storagePath: 'p/1.pdf' },
            'https://h.iq',
            { share: undefined, clipboard: { writeText } } as unknown as Navigator,
        );
        expect(writeText).toHaveBeenCalledWith('https://h.iq/api/file/p/1.pdf');
        expect(toast.success).toHaveBeenCalledWith('تم نسخ رابط الملف');
    });

    it('يرفض مساراً خارج المستودع', async () => {
        await shareRepositoryDocument(
            { title: 'ع', description: '', storagePath: '../secret' },
            'https://h.iq',
        );
        expect(toast.error).toHaveBeenCalledWith('رابط الملف غير متاح للمشاركة');
    });

    it('يستدعي navigator.share عند التوفر', async () => {
        const share = vi.fn().mockResolvedValue(undefined);
        await shareRepositoryDocument(
            { title: 'عقد', description: '', storagePath: 'p/1.pdf' },
            'https://h.iq',
            { share, clipboard: { writeText: vi.fn() } } as unknown as Navigator,
        );
        expect(share).toHaveBeenCalledWith({
            title: 'عقد',
            text: 'مستند: عقد',
            url: 'https://h.iq/api/file/p/1.pdf',
        });
    });
});
