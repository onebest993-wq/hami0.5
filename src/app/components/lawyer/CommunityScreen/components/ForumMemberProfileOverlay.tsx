import { Suspense } from 'react';
import { LazyRoyalLawyerProfile } from '@/app/utils/lazyComponents';
import { ProfileLoadingState } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileLoadingState';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import type { ForumProfileFollowState } from '@/app/components/lawyer/RoyalLawyerProfile/types';

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
            <Suspense fallback={<ProfileLoadingState />}>
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
