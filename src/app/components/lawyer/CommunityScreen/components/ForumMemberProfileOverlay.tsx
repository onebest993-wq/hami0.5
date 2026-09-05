import { lazy, Suspense } from 'react';
import { ForumProfileOverlayBodySlots } from '@/app/components/lawyer/CommunityScreen/components/ForumOverlayInstantCovers';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import type { ForumProfileFollowState } from '@/app/components/lawyer/RoyalLawyerProfile/types';

const LazyRoyalLawyerProfile = lazy(() =>
    import('@/app/runtime/royalLawyerProfileLoader').then((m) =>
        m.loadRoyalLawyerProfileModule().then((mod) => ({
            default: mod.RoyalLawyerProfile,
        })),
    ),
);

type ForumMemberProfileOverlayProps = {
    userId: string;
    displayName?: string;
    onBack: () => void;
    forumFollow?: ForumProfileFollowState;
};

export function ForumMemberProfileOverlay({
    userId,
    displayName,
    onBack,
    forumFollow,
}: ForumMemberProfileOverlayProps) {
    useBodyScrollLock(true);
    const label = displayName?.trim() ? `ملف ${displayName.trim()}` : 'ملف مهني';

    return (
        <div
            className="fixed inset-0 z-[200]"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            data-testid="forum-member-profile"
        >
            <Suspense fallback={<ForumProfileOverlayBodySlots onClose={onBack} />}>
                <LazyRoyalLawyerProfile
                    key={`forum-profile-${userId}`}
                    isScreenMode
                    targetUserId={userId}
                    displayNameHint={displayName}
                    onBack={onBack}
                    forumFollow={forumFollow}
                />
            </Suspense>
        </div>
    );
}
