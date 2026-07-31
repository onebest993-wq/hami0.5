import React from 'react';
import { User, EyeOff, UserPlus, UserCheck } from 'lucide-react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { formatRelativeTime } from '../utils';
import { QuestionCardMoreMenu } from './QuestionCardMoreMenu';
import {
    FORUM_ACCENT_CHIP,
    FORUM_PANEL,
    FORUM_STAT_BOX,
    FORUM_TEXT_APRICOT,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

export type QuestionCardHeaderProps = {
    post: CommunityPost;
    displayName: string;
    isAnonymous: boolean;
    isAdmin: boolean;
    isFollowing: boolean;
    canFollow: boolean;
    followerCount: number;
    postCount: number;
    isEdited: boolean;
    editCount: number;
    isOwner: boolean;
    isPinned: boolean;
    isLocked: boolean;
    canLockUnlock: boolean;
    isThreadFollowing: boolean;
    currentUserId: string | null;
    showUserPopup: boolean;
    setShowUserPopup: (open: boolean) => void;
    showEditInfo: boolean;
    setShowEditInfo: (open: boolean | ((v: boolean) => boolean)) => void;
    onFollow: (targetUserId: string) => void;
    onOpenProfile?: (userId: string, displayName?: string) => void;
    onToggleLock?: (postId: string) => void;
    onCopyPostText?: (postId: string) => void;
    onSaveToVault?: (postId: string) => void;
    onToggleThreadFollow?: (postId: string) => void;
    onMuteUser?: (userId: string) => void;
    onTogglePin: (postId: string) => void;
    onEdit: (postId: string) => void;
    onDelete: (postId: string) => void;
    onReport: (postId: string) => void;
};

export function QuestionCardHeader({
    post,
    displayName,
    isAnonymous,
    isAdmin,
    isFollowing,
    canFollow,
    followerCount,
    postCount,
    isEdited,
    editCount,
    isOwner,
    isPinned,
    isLocked,
    canLockUnlock,
    isThreadFollowing,
    currentUserId,
    showUserPopup,
    setShowUserPopup,
    showEditInfo,
    setShowEditInfo,
    onFollow,
    onOpenProfile,
    onToggleLock,
    onCopyPostText,
    onSaveToVault,
    onToggleThreadFollow,
    onMuteUser,
    onTogglePin,
    onEdit,
    onDelete,
    onReport,
}: QuestionCardHeaderProps) {
    const authorId = post.authorId || post.author_id || '';

    return (
        <div className="mb-3 flex items-start gap-2 min-w-0">
            <div
                className={`mt-0.5 p-1.5 rounded-full shrink-0 ${isAnonymous ? `${FORUM_ACCENT_CHIP}` : 'bg-[#1A2333] text-[#9AA3B2]'}`}
            >
                {isAnonymous ? <EyeOff size={16} /> : <User size={16} />}
            </div>

            <div className="relative min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        type="button"
                        data-testid={isAnonymous ? undefined : 'forum-open-author-profile'}
                        onClick={(event) => {
                            event.stopPropagation();
                            if (isAnonymous) return;
                            if (onOpenProfile) {
                                onOpenProfile(authorId, post.authorName);
                                return;
                            }
                            setShowUserPopup(!showUserPopup);
                        }}
                        className={`text-sm font-bold truncate max-w-full text-right ${isAnonymous ? `${FORUM_TEXT_MUTED} cursor-default` : `${FORUM_TEXT_PRIMARY} hover:text-[#C9A86C] transition-colors`}`}
                    >
                        {displayName}
                    </button>
                    {canFollow ? (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onFollow(authorId);
                            }}
                            className={`shrink-0 text-xs flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
                                isFollowing
                                    ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 hover:bg-emerald-950/50'
                                    : `${FORUM_ACCENT_CHIP} text-xs flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors`
                            }`}
                            title={isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
                        >
                            {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
                            <span className="hidden sm:inline">{isFollowing ? 'متابَع' : 'متابعة'}</span>
                        </button>
                    ) : null}
                </div>

                <div className="mt-0.5 flex items-center gap-2 min-w-0">
                    <span className="text-gray-500 text-xs shrink-0">{formatRelativeTime(post.createdAt)}</span>
                    {isEdited ? (
                        <div className="relative shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowEditInfo((v) => !v)}
                                className={`text-xs ${FORUM_TEXT_APRICOT} hover:text-[#F8C4A8] transition-colors underline-offset-2 hover:underline`}
                                aria-expanded={showEditInfo}
                            >
                                (مُعدّل{editCount > 0 ? ` · ${editCount}` : ''})
                            </button>
                            {showEditInfo ? (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowEditInfo(false)} aria-hidden />
                                    <div
                                        className={`absolute top-full right-0 mt-2 z-50 w-[min(320px,calc(100vw-2rem))] ${FORUM_PANEL} shadow-2xl p-4`}
                                    >
                                        <p className={`${FORUM_TEXT_PRIMARY} font-bold text-sm mb-1`}>سجل التعديل</p>
                                        <p className={`${FORUM_TEXT_MUTED} text-[11px] mb-3`}>
                                            عدد مرات التعديل:{' '}
                                            <span className={`${FORUM_TEXT_APRICOT} font-bold`}>{editCount || 1}</span>
                                        </p>
                                        <p className={`${FORUM_TEXT_MUTED} text-[10px] mb-1`}>النص الحالي (بعد التعديل):</p>
                                        <p
                                            className={`${FORUM_TEXT_PRIMARY} text-[13px] leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto`}
                                        >
                                            {post.content}
                                        </p>
                                        {(post.editHistory?.length ?? 0) > 0 ? (
                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                <p className="text-white/40 text-[10px] mb-2">آخر نسخة قبل التعديل:</p>
                                                <p className="text-white/60 text-[12px] leading-relaxed whitespace-pre-wrap line-clamp-4">
                                                    {post.editHistory![post.editHistory!.length - 1]?.content}
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>
                                </>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {showUserPopup && !isAnonymous ? (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowUserPopup(false)} />
                        <div
                            className={`absolute top-full right-0 mt-2 z-50 w-64 ${FORUM_PANEL} shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200`}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/60 border border-white/10">
                                    <User size={24} />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">{displayName}</p>
                                    {isAdmin ? <p className="text-gray-500 text-[10px]">معرّف داخلي (إدارة)</p> : null}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className={`${FORUM_STAT_BOX}`}>
                                    <p className={`${FORUM_TEXT_PRIMARY} font-bold text-lg`}>{followerCount}</p>
                                    <p className={`${FORUM_TEXT_MUTED} text-[10px]`}>متابعون</p>
                                </div>
                                <div className={`${FORUM_STAT_BOX}`}>
                                    <p className={`${FORUM_TEXT_PRIMARY} font-bold text-lg`}>{postCount}</p>
                                    <p className={`${FORUM_TEXT_MUTED} text-[10px]`}>منشورات</p>
                                </div>
                            </div>
                            {canFollow ? (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onFollow(authorId);
                                        setShowUserPopup(false);
                                    }}
                                    className={`w-full text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors mb-2 ${
                                        isFollowing
                                            ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 hover:bg-emerald-950/50'
                                            : `${FORUM_ACCENT_CHIP} text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg`
                                    }`}
                                >
                                    {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                                    <span>{isFollowing ? 'متابَع' : 'متابعة'}</span>
                                    <span className="text-[10px] opacity-60">({followerCount})</span>
                                </button>
                            ) : null}
                            {onOpenProfile ? (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onOpenProfile(authorId, post.authorName);
                                        setShowUserPopup(false);
                                    }}
                                    className="w-full text-xs font-bold py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white/80 hover:bg-white/10"
                                >
                                    عرض الملف الشخصي
                                </button>
                            ) : null}
                        </div>
                    </>
                ) : null}
            </div>

            <QuestionCardMoreMenu
                post={post}
                currentUserId={currentUserId}
                isOwner={isOwner}
                isAdmin={isAdmin}
                isAnonymous={isAnonymous}
                isPinned={isPinned}
                isLocked={isLocked}
                isThreadFollowing={isThreadFollowing}
                canLockUnlock={canLockUnlock}
                onToggleLock={onToggleLock}
                onCopyPostText={onCopyPostText}
                onSaveToVault={onSaveToVault}
                onToggleThreadFollow={onToggleThreadFollow}
                onMuteUser={onMuteUser}
                onTogglePin={onTogglePin}
                onEdit={onEdit}
                onDelete={onDelete}
                onReport={onReport}
            />
        </div>
    );
}
