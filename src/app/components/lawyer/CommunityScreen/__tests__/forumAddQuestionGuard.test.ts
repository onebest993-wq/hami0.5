import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        warning: vi.fn(),
    },
}));

import { SmartToast } from '@/app/components/ui/SmartToast';
import { openForumAddQuestionGuard } from '@/app/components/lawyer/CommunityScreen/forumAddQuestionGuard';

describe('openForumAddQuestionGuard', () => {
    it('blocks when user is not signed in', () => {
        const onOpen = vi.fn();
        openForumAddQuestionGuard(null, onOpen);
        expect(SmartToast.warning).toHaveBeenCalledWith('سجّل الدخول أولاً');
        expect(onOpen).not.toHaveBeenCalled();
    });

    it('blocks banned users', () => {
        const onOpen = vi.fn();
        openForumAddQuestionGuard('user-1', onOpen, { isBanned: true });
        expect(SmartToast.warning).toHaveBeenCalledWith('حسابك محظور من النشر في المنتدى');
        expect(onOpen).not.toHaveBeenCalled();
    });

    it('opens when user is allowed', () => {
        const onOpen = vi.fn();
        openForumAddQuestionGuard('user-1', onOpen);
        expect(onOpen).toHaveBeenCalledOnce();
    });
});
