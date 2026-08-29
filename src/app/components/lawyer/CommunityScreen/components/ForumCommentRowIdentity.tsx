import React from 'react';
import { UserPlus } from '@/app/components/ui/icons/UserPlus';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { FORUM_ACCENT_CHIP } from '../forumPlumTheme';

export function ForumCommentRowIdentity({
    commentAuthorId,
    currentUserId,
    authorName,
    onOpenProfile,
    onFollow,
    followingIds,
    userStats,
}: {
    commentAuthorId: string;
    currentUserId: string;
    authorName: string;
    onOpenProfile?: (userId: string, displayName?: string) => void;
    onFollow: (targetUserId: string) => void;
    followingIds: Set<string>;
    userStats: Record<string, { followerCount: number; postCount: number }>;
}) {
    const authorNameButton =
        onOpenProfile && commentAuthorId !== currentUserId ? (
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onOpenProfile(commentAuthorId, authorName);
                }}
                className="hover:text-[#E6C673] transition-colors"
            >
                {authorName}
            </button>
        ) : (
            authorName
        );

    const followChip =
        commentAuthorId !== currentUserId ? (
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onFollow(commentAuthorId);
                }}
                className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full transition-colors ${
                    followingIds.has(commentAuthorId)
                        ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 hover:bg-emerald-950/50'
                        : `${FORUM_ACCENT_CHIP} text-xs`
                }`}
                title={followingIds.has(commentAuthorId) ? 'إلغاء المتابعة' : 'متابعة'}
            >
                {followingIds.has(commentAuthorId) ? <UserCheck size={10} /> : <UserPlus size={10} />}
                <span className="mr-0.5">{userStats[commentAuthorId]?.followerCount ?? 0}</span>
            </button>
        ) : null;

    return (
        <>
            <span className="text-white/80 text-sm font-bold">{authorNameButton}</span>
            {followChip}
        </>
    );
}
