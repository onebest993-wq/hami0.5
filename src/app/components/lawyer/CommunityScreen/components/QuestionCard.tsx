import React, { useState, memo, useCallback } from 'react';
import { Pin, Zap } from 'lucide-react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { useForumAttachmentUrl } from '../useForumAttachmentUrl';
import { QuestionCardAttachment } from './QuestionCardAttachment';
import { QuestionCardFooter } from './QuestionCardFooter';
import { QuestionCardHeader } from './QuestionCardHeader';
import {
    FORUM_ACCENT_CHIP,
    FORUM_FEED_CARD,
    FORUM_FEED_CARD_READY,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';
import { canFollowPostAuthor } from '../communityPermissions';
import {
    isActiveUrgentConsultation,
    URGENT_CONSULTATION_BADGE,
    URGENT_CONSULTATION_LABEL,
} from '../forumUrgentConsultation';
import {
    isProcedureGuidePost,
    parseProcedureGuideDataLine,
    requestOpenTransactionsHub,
    stripProcedureGuideMachineLines,
} from '@/app/services/transactions/procedureGuideNavigation';

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
  isBookmarked?: boolean;
  onToggleBookmark?: (postId: string) => void;
  onCopyPostText?: (postId: string) => void;
  onSaveToVault?: (postId: string) => void;
  onSaveToDevice?: (postId: string) => void;
  onToggleLock?: (postId: string) => void;
  onMuteUser?: (userId: string) => void;
  isThreadFollowing?: boolean;
  onToggleThreadFollow?: (postId: string) => void;
  onOpenProfile?: (userId: string, displayName?: string) => void;
  preferEagerImage?: boolean;
}

/**
 * بطاقة منشور — تظهر فوراً (نص/رأس/تذييل).
 * المرفق يتدرج داخلياً بلا إخفاء البطاقة كاملة (معيار تطبيقات احترافية).
 */
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
  onCopyPostText,
  onSaveToVault,
  onSaveToDevice,
  onToggleLock,
  onMuteUser,
  isThreadFollowing = false,
  onToggleThreadFollow,
  onOpenProfile,
  preferEagerImage = false,
}: QuestionCardProps) {
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [showEditInfo, setShowEditInfo] = useState(false);
  const { url: attachmentUrl, loading: attachmentLoading } = useForumAttachmentUrl(post.attachment);
  const onMediaReady = useCallback(() => undefined, []);

  const authorId = post.authorId || post.author_id || '';
  const isUpvoted = currentUserId ? post.upvoterIds.includes(currentUserId) : false;
  const upvoteCount = post.upvoterIds.length;
  const isOwner = !!currentUserId && authorId === currentUserId;
  const isAnonymous = post.isAnonymous === true;
  const isActiveUrgent = isActiveUrgentConsultation(post);
  const isPinned = post.isPinned === true;
  const isLocked = post.isLocked === true;
  const canLockUnlock = isOwner || isAdmin;
  const displayName = isAnonymous ? 'زميل مجهول' : post.authorName;
  const isEdited = post.isEdited === true;
  const editCount = post.editCount ?? (isEdited ? 1 : 0);
  const isFollowing = currentUserId ? followingIds.has(authorId) : false;
  const canFollow = canFollowPostAuthor(post, currentUserId);
  const stats = userStats[authorId];
  const followerCount = stats?.followerCount ?? 0;
  const postCount = stats?.postCount ?? 0;

  const isProcedureGuide = isProcedureGuidePost(post);
  const displayContent = isProcedureGuide
    ? stripProcedureGuideMachineLines(post.content)
    : post.content;

  const cardClassName = [
    FORUM_FEED_CARD,
    FORUM_FEED_CARD_READY,
    isActiveUrgent ? 'ring-1 ring-[#C9A0A4]/30 shadow-[0_0_24px_rgba(201,160,164,0.08)]' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      id={`forum-post-${post.id}`}
      className={cardClassName}
      data-forum-card-hydrated="1"
      aria-busy={attachmentLoading}
    >
      {isActiveUrgent && (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-xl border border-[#C9A0A4]/25" />
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A0A4]/30 bg-gradient-to-l from-[#3A242C]/80 to-[#2A1A20]/70 px-2.5 py-1 text-[11px] font-bold text-[#E8D0D2]">
              <Zap size={12} fill="currentColor" />
              {URGENT_CONSULTATION_LABEL}
              <span className="rounded-full border border-[#C9A0A4]/30 bg-[#C9A0A4]/14 px-1.5 py-px text-[9px] font-black">
                {URGENT_CONSULTATION_BADGE}
              </span>
            </span>
          </div>
        </>
      )}
      {isPinned && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-950/40 px-2.5 py-1 text-[11px] text-amber-200">
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
        isThreadFollowing={isThreadFollowing}
        currentUserId={currentUserId}
        showUserPopup={showUserPopup}
        setShowUserPopup={setShowUserPopup}
        showEditInfo={showEditInfo}
        setShowEditInfo={setShowEditInfo}
        onFollow={onFollow}
        onOpenProfile={onOpenProfile}
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

      <p className={`mb-3 line-clamp-6 whitespace-pre-wrap text-[15px] font-medium leading-[1.65] ${FORUM_TEXT_PRIMARY}`}>
        {displayContent}
      </p>

      <QuestionCardAttachment
        post={post}
        attachmentUrl={attachmentUrl}
        attachmentLoading={attachmentLoading}
        onImageClick={onImageClick}
        onSaveToDevice={onSaveToDevice}
        preferEagerImage={preferEagerImage}
        onMediaReady={onMediaReady}
      />

      {post.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {post.tags.map((tag, i) => (
            <span key={`${post.id}-tag-${i}`} className={`rounded-md border px-2 py-1 text-xs ${FORUM_ACCENT_CHIP}`}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {isProcedureGuide ? (
        <button
          type="button"
          data-testid={`forum-open-transactions-${post.id}`}
          onClick={(event) => {
            event.stopPropagation();
            const guide = parseProcedureGuideDataLine(post.content);
            requestOpenTransactionsHub({
              openAddSheet: true,
              guide,
            });
          }}
          className="mb-4 w-full min-h-[44px] rounded-xl border border-[#C9A0A4]/35 bg-[#3A242C]/70 px-3 py-2.5 text-[12px] font-extrabold text-[#E8D0D2] touch-manipulation hover:bg-[#3A242C]"
        >
          فتح قسم المعاملات — أضف الأسماء والبيانات محلياً
        </button>
      ) : null}

      <div className="mb-3 h-px w-full bg-[#9AA3B2]/20" />

      <QuestionCardFooter
        post={post}
        currentUserId={currentUserId}
        isUpvoted={isUpvoted}
        upvoteCount={upvoteCount}
        isBookmarked={isBookmarked}
        onToggleBookmark={onToggleBookmark}
        onToggleUpvote={onToggleUpvote}
        onCommentClick={onCommentClick}
        onShare={onShare}
      />
    </div>
  );
});
