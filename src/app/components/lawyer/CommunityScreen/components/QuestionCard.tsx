import React, { useState, memo } from 'react';
import { Pin, Zap } from 'lucide-react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { useForumAttachmentUrl } from '../useForumAttachmentUrl';
import { QuestionCardAttachment } from './QuestionCardAttachment';
import { QuestionCardFooter } from './QuestionCardFooter';
import { QuestionCardHeader } from './QuestionCardHeader';
import {
    FORUM_ACCENT_CHIP,
    FORUM_FEED_CARD,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';
import {
    isActiveUrgentConsultation,
    URGENT_CONSULTATION_BADGE,
    URGENT_CONSULTATION_LABEL,
} from '../forumUrgentConsultation';

export interface QuestionCardProps {
  post: CommunityPost;
  currentUserId: string | null;
  onToggleUpvote: (postId: string) => void;
  onImageClick: (url: string) => void;
  onCommentClick: (postId: string) => void;
  onDelete: (postId: string) => void;
  onEdit: (postId: string) => void;
  onReport: (postId: string) => void;
  onShare: (postId: string) => void;
  isAdmin: boolean;
  onTogglePin: (postId: string) => void;
  onFollow: (targetUserId: string) => void;
  followingIds: Set<string>;
  userStats: Record<string, { followerCount: number; postCount: number }>;
  /** Bookmark/Save (اختياري) */
  isBookmarked?: boolean;
  onToggleBookmark?: (postId: string) => void;
  onSaveToNotes?: (postId: string) => void;
  onSaveToVault?: (postId: string) => void;
  /** قفل/فتح النقاش (للمالك أو الأدمن) */
  onToggleLock?: (postId: string) => void;
  /** كتم مستخدم */
  onMuteUser?: (userId: string) => void;
  /** متابعة النقاش — تنبيهات التعليقات على هذا المنشور */
  isThreadFollowing?: boolean;
  onToggleThreadFollow?: (postId: string) => void;
  onOpenProfile?: (userId: string, displayName?: string) => void;
}

export const QuestionCard = memo(function QuestionCard({
  post,
  currentUserId,
  onToggleUpvote,
  onImageClick,
  onCommentClick,
  onDelete,
  onEdit,
  onReport,
  onShare,
  isAdmin,
  onTogglePin,
  onFollow,
  followingIds,
  userStats,
  isBookmarked = false,
  onToggleBookmark,
  onSaveToNotes,
  onSaveToVault,
  onToggleLock,
  onMuteUser,
  isThreadFollowing = false,
  onToggleThreadFollow,
  onOpenProfile,
}: QuestionCardProps) {
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [showEditInfo, setShowEditInfo] = useState(false);
  const { url: attachmentUrl, loading: attachmentLoading } = useForumAttachmentUrl(post.attachment);
  const isUpvoted = currentUserId ? post.upvoterIds.includes(currentUserId) : false;
  const upvoteCount = post.upvoterIds.length;
  const isOwner = !!currentUserId && post.authorId === currentUserId;
  const isAnonymous = post.isAnonymous === true;
  const isActiveUrgent = isActiveUrgentConsultation(post);
  const isPinned = post.isPinned === true;
  const isLocked = post.isLocked === true;
  const canLockUnlock = isOwner || isAdmin;
  const displayName = isAnonymous ? 'زميل مجهول' : post.authorName;
  const isEdited = post.isEdited === true;
  const editCount = post.editCount ?? (isEdited ? 1 : 0);
  const isFollowing = currentUserId ? followingIds.has(post.authorId) : false;
  const canFollow = !!currentUserId && !isOwner && !isAnonymous;
  const stats = userStats[post.authorId];
  const followerCount = stats?.followerCount ?? 0;
  const postCount = stats?.postCount ?? 0;

  return (
    <div
      id={`forum-post-${post.id}`}
      className={`${FORUM_FEED_CARD}${isActiveUrgent ? ' ring-1 ring-amber-400/35 shadow-[0_0_28px_rgba(251,191,36,0.08)]' : ''}`}
    >
      {isActiveUrgent && (
        <>
          <div className="absolute inset-0 rounded-xl border border-amber-400/30 pointer-events-none" />
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-gradient-to-l from-amber-950/50 to-orange-950/40 text-amber-100 border border-amber-400/30 font-bold">
              <Zap size={12} fill="currentColor" />
              {URGENT_CONSULTATION_LABEL}
              <span className="rounded-full border border-amber-300/25 bg-amber-400/15 px-1.5 py-px text-[9px] font-black">
                {URGENT_CONSULTATION_BADGE}
              </span>
            </span>
          </div>
        </>
      )}
      {isPinned && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-amber-950/40 text-amber-200 border border-amber-500/20">
            <Pin size={12} /> منشور مثبت
          </span>
        </div>
      )}
      <QuestionCardHeader
        post={post}
        displayName={displayName}
        isAnonymous={isAnonymous}
        isAdmin={isAdmin}
        isFollowing={isFollowing}
        canFollow={canFollow}
        followerCount={followerCount}
        postCount={postCount}
        isEdited={isEdited}
        editCount={editCount}
        isOwner={isOwner}
        isPinned={isPinned}
        isLocked={isLocked}
        canLockUnlock={canLockUnlock}
        isBookmarked={isBookmarked}
        isThreadFollowing={isThreadFollowing}
        currentUserId={currentUserId}
        showUserPopup={showUserPopup}
        setShowUserPopup={setShowUserPopup}
        showEditInfo={showEditInfo}
        setShowEditInfo={setShowEditInfo}
        onFollow={onFollow}
        onOpenProfile={onOpenProfile}
        onToggleLock={onToggleLock}
        onSaveToNotes={onSaveToNotes}
        onSaveToVault={onSaveToVault}
        onToggleBookmark={onToggleBookmark}
        onToggleThreadFollow={onToggleThreadFollow}
        onMuteUser={onMuteUser}
        onTogglePin={onTogglePin}
        onEdit={onEdit}
        onDelete={onDelete}
        onReport={onReport}
      />

      <p className={`text-[15px] leading-[1.65] line-clamp-3 mb-3 font-medium ${FORUM_TEXT_PRIMARY} whitespace-pre-wrap`}>
        {post.content}
      </p>

      <QuestionCardAttachment
        post={post}
        attachmentUrl={attachmentUrl}
        attachmentLoading={attachmentLoading}
        onImageClick={onImageClick}
      />

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag, i) => (
            <span key={`${post.id}-tag-${i}`} className={`px-2 py-1 rounded-md text-xs border ${FORUM_ACCENT_CHIP}`}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="h-px bg-[#4A3D52]/40 w-full mb-3" />

      <QuestionCardFooter
        post={post}
        currentUserId={currentUserId}
        isUpvoted={isUpvoted}
        upvoteCount={upvoteCount}
        onToggleUpvote={onToggleUpvote}
        onCommentClick={onCommentClick}
        onShare={onShare}
      />
    </div>
  );
});
