import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { peekForumRateLimit } from '../../forumRateLimit';

const reportPost = vi.fn();

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        warning: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        reportPost: (...args: unknown[]) => reportPost(...args),
        togglePin: vi.fn(),
        toggleLockDiscussion: vi.fn(),
    },
}));

import { useCommunityScreenPostAdmin } from '../useCommunityScreenPostAdmin';
import { SmartToast } from '@/app/components/ui/SmartToast';

describe('useCommunityScreenPostAdmin report', () => {
    beforeEach(() => {
        reportPost.mockReset();
        vi.mocked(SmartToast.warning).mockReset();
        vi.mocked(SmartToast.success).mockReset();
        vi.mocked(SmartToast.error).mockReset();
        window.localStorage.clear();
    });

    function renderAdmin() {
        return renderHook(() =>
            useCommunityScreenPostAdmin({
                currentUserId: 'u1',
                isAdmin: false,
                findPostById: () => undefined,
                updatePostList: vi.fn(),
                runInflight: async (_key, action) => {
                    await action();
                },
            }),
        );
    }

    it('لا يستهلك حد الإبلاغ إذا فشل الخادم', async () => {
        reportPost.mockRejectedValueOnce(new Error('fail'));
        const { result } = renderAdmin();
        await act(async () => {
            await result.current.handleReportPost('post-1');
        });
        expect(SmartToast.error).toHaveBeenCalledWith('تعذّر إرسال البلاغ');
        expect(peekForumRateLimit('report', 'u1', { postId: 'post-1' }).allowed).toBe(true);
    });

    it('يستهلك الحد بعد نجاح البلاغ', async () => {
        reportPost.mockResolvedValueOnce({ ok: true });
        const { result } = renderAdmin();
        await act(async () => {
            await result.current.handleReportPost('post-1');
        });
        expect(SmartToast.success).toHaveBeenCalledWith('تم رفع البلاغ للإدارة');
        expect(peekForumRateLimit('report', 'u1', { postId: 'post-1' }).allowed).toBe(false);
    });
});
