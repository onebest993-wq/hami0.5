import React from 'react';
import { CornerUpLeft } from '@/app/components/ui/icons/CornerUpLeft';
import { ArrowUpCircle } from '@/app/components/ui/icons/ArrowUpCircle';
import { Flag } from '@/app/components/ui/icons/Flag';
import { VolumeX } from '@/app/components/ui/icons/VolumeX';
import type { CommunityComment } from '@/app/services/lawyer-cloud';
import { FORUM_ACCENT_CHIP, FORUM_GHOST_BTN, FORUM_TEXT_APRICOT } from '../forumPlumTheme';

export function ForumCommentRowFooter({
    comment,
    currentUserId,
    isLocked,
    isCommentAuthor,
    commentAuthorId,
    postAuthorId,
    mutedUserIds,
    onSetReplyingToCommentId,
    onToggleCommentUpvote,
    onReportComment,
    onMuteUser,
}: {
    comment: CommunityComment;
    currentUserId: string;
    isLocked: boolean;
    isCommentAuthor: boolean;
    commentAuthorId: string;
    postAuthorId: string;
    mutedUserIds?: Set<string>;
    onSetReplyingToCommentId: (id: string) => void;
    onToggleCommentUpvote?: (commentId: string) => void;
    onReportComment?: (commentId: string) => void;
    onMuteUser?: (userId: string) => void;
}) {
    return (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
            {!isLocked && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onSetReplyingToCommentId(comment.id);
                    }}
                    className={`min-h-[44px] touch-manipulation text-[11px] px-2.5 py-1 rounded-full ${FORUM_GHOST_BTN} inline-flex items-center gap-1`}
                    title="رد"
                >
                    <CornerUpLeft size={12} />
                    رد
                </button>
            )}
            {onToggleCommentUpvote && !isCommentAuthor && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleCommentUpvote(comment.id);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors inline-flex items-center gap-1 ${
                        (comment.upvoterIds ?? []).includes(currentUserId)
                            ? `${FORUM_ACCENT_CHIP} ${FORUM_TEXT_APRICOT}`
                            : `${FORUM_GHOST_BTN} text-[11px] px-2.5 py-1 inline-flex items-center gap-1`
                    }`}
                    title="إعجاب بالتعليق"
                >
                    <ArrowUpCircle size={12} />
                    {comment.upvoterIds?.length ?? 0}
                </button>
            )}
            {!onToggleCommentUpvote && (comment.upvoterIds?.length ?? 0) > 0 && (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 inline-flex items-center gap-1">
                    <ArrowUpCircle size={12} />
                    {comment.upvoterIds?.length ?? 0}
                </span>
            )}
            {onReportComment && !isCommentAuthor && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onReportComment(comment.id);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-red-400 hover:border-red-500/30 transition-colors inline-flex items-center gap-1"
                    title="الإبلاغ عن التعليق"
                >
                    <Flag size={11} />
                    إبلاغ
                </button>
            )}
            {onMuteUser && !isCommentAuthor && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onMuteUser(commentAuthorId || postAuthorId);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors inline-flex items-center gap-1"
                    title="كتم المستخدم"
                >
                    <VolumeX size={11} />
                    {mutedUserIds?.has(commentAuthorId) ? 'إلغاء الكتم' : 'كتم'}
                </button>
            )}
        </div>
    );
}
