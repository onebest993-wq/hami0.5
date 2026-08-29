import { useCallback, useState, memo } from 'react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { useForumAttachmentUrl } from '../useForumAttachmentUrl';
import { QuestionCardAttachment } from './QuestionCardAttachment';
import { QuestionCardFooter } from './QuestionCardFooter';
import { QuestionCardHeader } from './QuestionCardHeader';
import { QuestionCardProcedureCta } from './QuestionCardProcedureCta';
import { QuestionCardStatusBadges } from './QuestionCardStatusBadges';
import { QuestionCardTagRow } from './QuestionCardTagRow';
import { FORUM_FEED_CARD, FORUM_FEED_CARD_READY, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';
import { useQuestionCardModel } from '../hooks/useQuestionCardModel';

export interface QuestionCardProps {
  post: CommunityPost;
  currentUserId: string | null;
  onToggleUpvote: (postId: string) => void;
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
  const model = useQuestionCardModel(post, currentUserId, followingIds, userStats, preferEagerImage, isAdmin);
  const { url: attachmentUrl, loading: attachmentLoading } = useForumAttachmentUrl(post.attachment, {
    enabled: model.attachmentInView,
  });
  const onMediaReady = useCallback(() => undefined, []);

  const cardClassName = [
    FORUM_FEED_CARD,
    FORUM_FEED_CARD_READY,
    model.isActiveUrgent ? 'ring-1 ring-[#C9A0A4]/30 shadow-[0_0_24px_rgba(201,160,164,0.08)]' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={model.cardRef}
      id={`forum-post-${post.id}`}
      className={cardClassName}
      data-forum-card-hydrated="1"
      aria-busy={attachmentLoading}
    >
      <QuestionCardStatusBadges isActiveUrgent={model.isActiveUrgent} isPinned={model.isPinned} />
      <QuestionCardHeader
        post={post}
        displayName={model.displayName}
        isAnonymous={model.isAnonymous}
        isAdmin={isAdmin}
        isFollowing={model.isFollowing}
        canFollow={model.canFollow}
        followerCount={model.followerCount}
        postCount={model.postCount}
        isEdited={model.isEdited}
        editCount={model.editCount}
        isOwner={model.isOwner}
        isPinned={model.isPinned}
        isLocked={model.isLocked}
        canLockUnlock={model.canLockUnlock}
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

      <QuestionCardTagRow postId={post.id} tags={post.tags} />

      <p className={`mb-3 line-clamp-6 whitespace-pre-wrap text-[15px] font-medium leading-[1.65] ${FORUM_TEXT_PRIMARY}`}>
        {model.displayContent}
      </p>

      <QuestionCardAttachment
        post={post}
        attachmentUrl={attachmentUrl}
        attachmentLoading={attachmentLoading}
        onSaveToDevice={onSaveToDevice}
        preferEagerImage={preferEagerImage}
        onMediaReady={onMediaReady}
      />

      {model.isProcedureGuide ? (
        <QuestionCardProcedureCta postId={post.id} content={post.content} />
      ) : null}

      <div className="mb-3 h-px w-full bg-[#9AA3B2]/20" />

      <QuestionCardFooter
        post={post}
        currentUserId={currentUserId}
        isUpvoted={model.isUpvoted}
        upvoteCount={model.upvoteCount}
        isBookmarked={isBookmarked}
        onToggleBookmark={onToggleBookmark}
        onToggleUpvote={onToggleUpvote}
        onCommentClick={onCommentClick}
        onShare={onShare}
      />
    </div>
  );
});
