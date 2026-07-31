import React, { memo } from 'react';
import { Lock, UserPlus } from 'lucide-react';
import type { ForumProfileFollowState } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfilePageAccess } from '@/app/services/profile/profilePageTypes';
import { getProfilePageAccessMeta } from '@/app/services/profile/profilePageAccess';
import { MoroccanGlassFrame } from '@/app/components/shared/MoroccanGlassOverlay';

export type ProfilePageAccessBlockedProps = {
    pageAccess: ProfilePageAccess;
    displayName: string;
    forumFollow?: ForumProfileFollowState;
    ornatePattern?: boolean;
};

export const ProfilePageAccessBlocked = memo(function ProfilePageAccessBlocked({
    pageAccess,
    displayName,
    forumFollow,
    ornatePattern = false,
}: ProfilePageAccessBlockedProps) {
    const meta = getProfilePageAccessMeta(pageAccess);
    const showFollowCta = pageAccess === 'followers' && forumFollow && !forumFollow.isFollowing;

    return (
        <div className="px-4 mt-4" data-testid="lawyer-profile-access-blocked">
            <MoroccanGlassFrame profilePanel ornatePattern={ornatePattern} className="hami-profile-hero-panel">
                <div className="text-center space-y-3 py-2">
                    <div className="mx-auto w-12 h-12 rounded-full border border-white/15 bg-white/5 flex items-center justify-center">
                        <Lock size={22} className="text-white/55" aria-hidden />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white/90">صفحة {displayName} محمية</p>
                        <p className="text-[13px] text-white/55 mt-1 px-2">{meta.hint}</p>
                    </div>
                    {showFollowCta ? (
                        <button
                            type="button"
                            disabled={forumFollow.busy}
                            onClick={forumFollow.onToggle}
                            className="hami-profile-sigil-follow"
                            data-testid="lawyer-profile-access-follow"
                        >
                            <span className="hami-profile-sigil-follow-glyph" aria-hidden>
                                <UserPlus size={16} />
                            </span>
                            <span className="hami-profile-sigil-follow-text">متابعة لفتح الصفحة</span>
                        </button>
                    ) : null}
                </div>
            </MoroccanGlassFrame>
        </div>
    );
});
