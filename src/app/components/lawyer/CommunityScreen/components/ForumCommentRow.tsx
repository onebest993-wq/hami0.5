import React from 'react';
import {
    User, BadgeCheck, CornerUpLeft, Trash2, Edit2, UserPlus, UserCheck,
    ArrowUpCircle, Flag, VolumeX,
} from 'lucide-react';
import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';
import { formatRelativeTime } from '../utils';
import { canDeleteComment, canEditComment } from '../communityPermissions';
import {
    FORUM_ACCENT_CHIP,
    FORUM_COMMENT_BEST,
    FORUM_COMMENT_CARD,
    FORUM_GHOST_BTN,
    FORUM_PUBLISH_BTN_SM,
    FORUM_SURFACE_INPUT,
    FORUM_TEXT_APRICOT,
} from '../forumPlumTheme';

export type ForumCommentRowProps = {
    comment: CommunityComment;
    post: CommunityPost;
    depth: number;
    forceBestStyle: boolean;
    bestCommentId: string | null;
    currentUserId: string;
    isAdmin: boolean;
    isLocked: boolean;
    canSelectBest: boolean;
    followingIds: Set<string>;
    userStats: Record<string, { followerCount: number; postCount: number }>;
    mutedUserIds?: Set<string>;
    editingCommentId: string | null;
    editContent: string;
    confirmDeleteId: string | null;
    onSetEditingCommentId: (id: string | null) => void;
    onSetEditContent: (value: string) => void;
    onSetConfirmDeleteId: (id: string | null) => void;
    onSetReplyingToCommentId: (id: string) => void;
    onFollow: (targetUserId: string) => void;
    onToggleBestAnswer: (postId: string, commentId: string) => void;
    onEditComment: (postId: string, commentId: string, newContent: string) => void;
    onDeleteComment: (postId: string, commentId: string) => void;
    onToggleCommentUpvote?: (commentId: string) => void;
    onReportComment?: (commentId: string) => void;
    onMuteUser?: (userId: string) => void;
    onOpenProfile?: (userId: string, displayName?: string) => void;
};

export function ForumCommentRow({
    comment: c,
    post,
    depth,
    forceBestStyle,
    bestCommentId,
    currentUserId,
    isAdmin,
    isLocked,
    canSelectBest,
    followingIds,
    userStats,
    mutedUserIds,
    editingCommentId,
    editContent,
    confirmDeleteId,
    onSetEditingCommentId,
    onSetEditContent,
    onSetConfirmDeleteId,
    onSetReplyingToCommentId,
    onFollow,
    onToggleBestAnswer,
    onEditComment,
    onDeleteComment,
    onToggleCommentUpvote,
    onReportComment,
    onMuteUser,
    onOpenProfile,
}: ForumCommentRowProps) {
    const isBest = forceBestStyle || (!!bestCommentId && c.id === bestCommentId);
    const isCommentAuthor = currentUserId === c.authorId;
    const showDeleteComment = canDeleteComment(post, c, currentUserId, isAdmin);
    const showEditComment = canEditComment(c, currentUserId, post);
    const indentClass = depth === 0 ? '' : depth === 1 ? 'mr-8' : depth === 2 ? 'mr-16' : 'mr-24';
    const threadClass = depth === 0 ? '' : 'border-r-2 border-slate-700/50 pr-4';
    const isEditing = editingCommentId === c.id;

    const authorNameButton =
        onOpenProfile && c.authorId !== currentUserId ? (
            <button
                type="button"
                onClick={() => onOpenProfile(c.authorId, c.authorName)}
                className="hover:text-[#F0B896] transition-colors"
            >
                {c.authorName}
            </button>
        ) : (
            c.authorName
        );

    const followChip =
        c.authorId !== currentUserId ? (
            <button
                type="button"
                onClick={() => onFollow(c.authorId)}
                className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full transition-colors ${
                    followingIds.has(c.authorId)
                        ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 hover:bg-emerald-950/50'
                        : `${FORUM_ACCENT_CHIP} text-xs`
                }`}
                title={followingIds.has(c.authorId) ? 'إلغاء المتابعة' : 'متابعة'}
            >
                {followingIds.has(c.authorId) ? <UserCheck size={10} /> : <UserPlus size={10} />}
                <span className="mr-0.5">{userStats[c.authorId]?.followerCount ?? 0}</span>
            </button>
        ) : null;

    if (isEditing) {
        return (
            <div className={`${indentClass} ${threadClass} ${FORUM_COMMENT_CARD} border-[#F0B896]/30`}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50">
                        <User size={14} />
                    </div>
                    <span className="text-white/80 text-sm font-bold">{authorNameButton}</span>
                    {followChip}
                    <span className="text-white/20 text-xs">•</span>
                    <span className="text-white/30 text-xs">تعديل...</span>
                </div>
                <textarea
                    value={editContent}
                    onChange={(e) => onSetEditContent(e.target.value)}
                    className={`w-full text-sm rounded-xl p-3 outline-none resize-none ${FORUM_SURFACE_INPUT}`}
                    rows={3}
                />
                <div className="flex gap-2 mt-3">
                    <button
                        type="button"
                        onClick={() => {
                            if (editContent.trim()) {
                                onEditComment(post.id, c.id, editContent.trim());
                            }
                            onSetEditingCommentId(null);
                            onSetEditContent('');
                        }}
                        disabled={!editContent.trim()}
                        className={FORUM_PUBLISH_BTN_SM}
                    >
                        حفظ
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onSetEditingCommentId(null);
                            onSetEditContent('');
                        }}
                        className={`text-[11px] px-3 py-1.5 rounded-full ${FORUM_GHOST_BTN}`}
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`${indentClass} ${threadClass} group/comment rounded-2xl p-4 border transition-colors ${
                isBest ? FORUM_COMMENT_BEST : `${FORUM_COMMENT_CARD}`
            }`}
        >
            <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50">
                    <User size={14} />
                </div>
                <span className="text-white/80 text-sm font-bold">{authorNameButton}</span>
                {followChip}
                <span className="text-white/20 text-xs">•</span>
                <span className="text-white/30 text-xs">{formatRelativeTime(c.createdAt)}</span>
                <div className="flex-1" />
                {isBest && (
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${FORUM_ACCENT_CHIP}`}>
                        <BadgeCheck size={12} />
                        أفضل إجابة
                    </span>
                )}
                {canSelectBest && (
                    <button
                        type="button"
                        onClick={() => onToggleBestAnswer(post.id, c.id)}
                        className={`text-[10px] px-2 py-1 rounded-full border ${
                            isBest ? `${FORUM_ACCENT_CHIP} ${FORUM_TEXT_APRICOT}` : `${FORUM_GHOST_BTN} text-[11px] px-2.5 py-1`
                        }`}
                        title="تمييز أفضل إجابة"
                    >
                        {isBest ? 'إلغاء' : 'أفضل'}
                    </button>
                )}
                {(showEditComment || showDeleteComment) && !confirmDeleteId && (
                    <div className="flex gap-1">
                        {showEditComment && (
                            <button
                                type="button"
                                onClick={() => {
                                    onSetEditingCommentId(c.id);
                                    onSetEditContent(c.content);
                                }}
                                className={`text-[10px] px-2 py-1 rounded-full ${FORUM_GHOST_BTN}`}
                                title="تعديل التعليق"
                            >
                                <Edit2 size={10} />
                            </button>
                        )}
                        {showDeleteComment && (
                            <button
                                type="button"
                                onClick={() => onSetConfirmDeleteId(c.id)}
                                className="text-[10px] px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                title="حذف التعليق"
                            >
                                <Trash2 size={10} />
                            </button>
                        )}
                    </div>
                )}
                {showDeleteComment && confirmDeleteId === c.id && (
                    <div className="flex gap-1">
                        <button
                            type="button"
                            onClick={() => {
                                onDeleteComment(post.id, c.id);
                                onSetConfirmDeleteId(null);
                            }}
                            className="text-[10px] px-2 py-1 rounded-full bg-red-500 text-white font-bold"
                        >
                            تأكيد الحذف
                        </button>
                        <button
                            type="button"
                            onClick={() => onSetConfirmDeleteId(null)}
                            className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/60"
                        >
                            إلغاء
                        </button>
                    </div>
                )}
            </div>
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
                {!isLocked && (
                    <button
                        type="button"
                        onClick={() => onSetReplyingToCommentId(c.id)}
                        className={`text-[11px] px-2.5 py-1 rounded-full ${FORUM_GHOST_BTN} inline-flex items-center gap-1`}
                        title="رد"
                    >
                        <CornerUpLeft size={12} />
                        رد
                    </button>
                )}
                {onToggleCommentUpvote && !isCommentAuthor && (
                    <button
                        type="button"
                        onClick={() => onToggleCommentUpvote(c.id)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors inline-flex items-center gap-1 ${
                            (c.upvoterIds ?? []).includes(currentUserId)
                                ? `${FORUM_ACCENT_CHIP} ${FORUM_TEXT_APRICOT}`
                                : `${FORUM_GHOST_BTN} text-[11px] px-2.5 py-1 inline-flex items-center gap-1`
                        }`}
                        title="إعجاب بالتعليق"
                    >
                        <ArrowUpCircle size={12} />
                        {c.upvoterIds?.length ?? 0}
                    </button>
                )}
                {!onToggleCommentUpvote && (c.upvoterIds?.length ?? 0) > 0 && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 inline-flex items-center gap-1">
                        <ArrowUpCircle size={12} />
                        {c.upvoterIds?.length ?? 0}
                    </span>
                )}
                {onReportComment && !isCommentAuthor && (
                    <button
                        type="button"
                        onClick={() => onReportComment(c.id)}
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
                        onClick={() => onMuteUser(c.authorId)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors inline-flex items-center gap-1"
                        title="كتم المستخدم"
                    >
                        <VolumeX size={11} />
                        {mutedUserIds?.has(c.authorId) ? 'إلغاء الكتم' : 'كتم'}
                    </button>
                )}
            </div>
        </div>
    );
}
