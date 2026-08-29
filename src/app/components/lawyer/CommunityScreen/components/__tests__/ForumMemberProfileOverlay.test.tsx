import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ForumMemberProfileOverlay } from '@/app/components/lawyer/CommunityScreen/components/ForumMemberProfileOverlay';

vi.mock('@/app/utils/lazyComponents', () => ({
    LazyRoyalLawyerProfile: () => <div data-testid="forum-member-profile-inner" />,
}));

vi.mock('@/app/utils/bodyScrollLock', async () => {
    const actual = await vi.importActual<typeof import('@/app/utils/bodyScrollLock')>(
        '@/app/utils/bodyScrollLock',
    );
    return {
        ...actual,
        useBodyScrollLock: vi.fn(),
    };
});

describe('ForumMemberProfileOverlay', () => {
    it('حوار مودالي مع قفل تمرير — بلا أدوات مالك في الغلاف', async () => {
        const { useBodyScrollLock } = await import('@/app/utils/bodyScrollLock');
        render(
            <ForumMemberProfileOverlay
                userId="e2e-forum-author-2"
                displayName="محامٍ زائر اختبار"
                onBack={() => undefined}
            />,
        );
        const overlay = screen.getByTestId('forum-member-profile');
        expect(overlay).toHaveAttribute('role', 'dialog');
        expect(overlay).toHaveAttribute('aria-modal', 'true');
        expect(overlay).toHaveAttribute('aria-label', 'ملف محامٍ زائر اختبار');
        expect(useBodyScrollLock).toHaveBeenCalledWith(true);
        expect(overlay).not.toHaveAttribute('data-owner-tools');
    });
});
