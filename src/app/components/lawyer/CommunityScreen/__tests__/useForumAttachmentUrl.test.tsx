import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useForumAttachmentUrl } from '@/app/components/lawyer/CommunityScreen/useForumAttachmentUrl';

vi.mock('@/app/services/forumAttachmentService', () => ({
    resolveCommunityAttachmentUrl: vi.fn(async () => null),
}));

import { resolveCommunityAttachmentUrl } from '@/app/services/forumAttachmentService';

describe('useForumAttachmentUrl', () => {
    beforeEach(() => {
        vi.mocked(resolveCommunityAttachmentUrl).mockReset();
        vi.mocked(resolveCommunityAttachmentUrl).mockResolvedValue(null);
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    it('لا يعرض فوراً رابط javascript: غير آمن', async () => {
        const { result } = renderHook(() =>
            useForumAttachmentUrl({
                type: 'image',
                name: 'x.png',
                url: 'javascript:alert(1)',
            }),
        );
        expect(result.current.url).toBeNull();
        await waitFor(() => {
            expect(resolveCommunityAttachmentUrl).toHaveBeenCalled();
        });
        expect(result.current.url).toBeNull();
    });

    it('يعرض فوراً https آمن', () => {
        const { result } = renderHook(() =>
            useForumAttachmentUrl({
                type: 'image',
                name: 'a.jpg',
                url: 'https://cdn.example/a.jpg',
            }),
        );
        expect(result.current.url).toBe('https://cdn.example/a.jpg');
        expect(result.current.loading).toBe(false);
    });

    it('عند فشل resolve لا يعيد javascript كـ fallback', async () => {
        vi.mocked(resolveCommunityAttachmentUrl).mockImplementation(() =>
            Promise.reject(new Error('fail')),
        );
        const { result } = renderHook(() =>
            useForumAttachmentUrl({
                type: 'image',
                name: 'x.png',
                url: 'javascript:alert(1)',
            }),
        );
        await waitFor(
            () => {
                expect(result.current.loading).toBe(false);
            },
            { timeout: 5_000 },
        );
        expect(result.current.url).toBeNull();
    });
});
