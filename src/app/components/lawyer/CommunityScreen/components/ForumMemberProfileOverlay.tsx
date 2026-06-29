import React, { Suspense } from 'react';
import { LazyRoyalLawyerProfile } from '@/app/utils/lazyComponents';
import { ProfileLoadingState } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileLoadingState';
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
    return (
        <div className="fixed inset-0 z-[200]" dir="rtl" data-testid="forum-member-profile">
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
