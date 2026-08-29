import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import type { MentionCandidate } from '@/app/hooks/useForumMentionAutocomplete';
import { useCommunitySheetChrome } from '@/app/hooks/useCommunitySheetChrome';
import { ForumSheetSwipeHandle } from './ForumSheetSwipeHandle';
import { CommentSheetComposer } from './CommentSheetComposer';
import { CommentBottomSheetHeader } from './CommentBottomSheetHeader';
import { CommentBottomSheetThreadList } from './CommentBottomSheetThreadList';
import { useCommentBottomSheetModel } from '../hooks/useCommentBottomSheetModel';
import { FORUM_SHEET } from '../forumPlumTheme';
import { getForumOverlayPortalRoot } from '../forumOverlayPortal';

export interface CommentBottomSheetProps {
  post: CommunityPost;
  onClose: () => void;
  onAddComment: (postId: string, content: string, parentId?: string) => Promise<boolean> | void;
  currentUserId: string;
  onToggleBestAnswer: (postId: string, commentId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => Promise<void> | void;
  onEditComment: (postId: string, commentId: string, newContent: string) => Promise<boolean> | boolean | void;
  onFollow: (targetUserId: string) => void;
  followingIds: Set<string>;
  userStats: Record<string, { followerCount: number; postCount: number }>;
  isAdmin?: boolean;
  onToggleCommentUpvote?: (commentId: string) => void;
  onReportComment?: (commentId: string) => void;
  onMuteUser?: (userId: string) => void;
  mutedUserIds?: Set<string>;
  mentionCandidates?: MentionCandidate[];
  onOpenProfile?: (userId: string, displayName?: string) => void;
}

export const CommentBottomSheet = ({
  post,
  onClose,
  onAddComment,
  currentUserId,
  onToggleBestAnswer,
  onDeleteComment,
  onEditComment,
  onFollow,
  followingIds,
  userStats,
  isAdmin = false,
  onToggleCommentUpvote,
  onReportComment,
  onMuteUser,
  mutedUserIds,
  mentionCandidates = [],
  onOpenProfile,
}: CommentBottomSheetProps) => {
  const reduceMotion = useReduceMotion();
  const { sheetStyle, composerStyle } = useCommunitySheetChrome();
  const canSelectBest = currentUserId === (post.authorId || post.author_id || '');
  const model = useCommentBottomSheetModel(post, mentionCandidates);

  const sheetLayer = (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center pointer-events-none" data-testid="forum-comment-sheet">
      <AnimatePresence>
        <motion.div
          key="backdrop"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/55 pointer-events-auto"
        />

        <motion.div
          key="sheet"
          initial={reduceMotion ? false : { y: '100%' }}
          animate={{ y: 0 }}
          exit={reduceMotion ? undefined : { y: '100%' }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
          style={sheetStyle}
          className={`${FORUM_SHEET} w-full max-w-2xl max-h-[min(78dvh,100%)] h-[70vh] rounded-t-3xl flex flex-col pointer-events-auto relative z-10 border-t-white/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]`}
        >
          <ForumSheetSwipeHandle onClose={onClose} barClassName="w-12 h-1.5 rounded-full bg-white/10" />

          <CommentBottomSheetHeader
            commentCount={post.comments.length}
            isLocked={model.isLocked}
            sortMode={model.sortMode}
            onSortModeChange={model.setSortMode}
            onClose={onClose}
          />

          <CommentBottomSheetThreadList
            post={post}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            isLocked={model.isLocked}
            canSelectBest={canSelectBest}
            followingIds={followingIds}
            userStats={userStats}
            mutedUserIds={mutedUserIds}
            editingCommentId={model.editingCommentId}
            editContent={model.editContent}
            confirmDeleteId={model.confirmDeleteId}
            bestComment={model.bestComment}
            bestCommentId={model.bestCommentId}
            excludedTopIds={model.excludedTopIds}
            windowedTopThreads={model.windowedTopThreads}
            hiddenThreadCount={model.hiddenThreadCount}
            commentSentinelRef={model.commentSentinelRef}
            childrenByParentId={model.childrenByParentId}
            onSetEditingCommentId={model.setEditingCommentId}
            onSetEditContent={model.setEditContent}
            onSetConfirmDeleteId={model.setConfirmDeleteId}
            onSetReplyingToCommentId={model.setReplyingToCommentId}
            onFollow={onFollow}
            onToggleBestAnswer={onToggleBestAnswer}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            onToggleCommentUpvote={onToggleCommentUpvote}
            onReportComment={onReportComment}
            onMuteUser={onMuteUser}
            onOpenProfile={onOpenProfile}
          />

          <CommentSheetComposer
            post={post}
            isLocked={model.isLocked}
            replyingTo={model.replyingTo}
            onCancelReply={() => model.setReplyingToCommentId(null)}
            comment={model.comment}
            mention={model.mention}
            submittingComment={model.submittingComment}
            composerStyle={composerStyle}
            onSubmitComment={async (text, parentId) => {
              model.setSubmittingComment(true);
              try {
                const result = onAddComment(post.id, text, parentId);
                const ok = result instanceof Promise ? await result : true;
                if (ok !== false) {
                  model.setComment('');
                  model.setReplyingToCommentId(null);
                }
              } finally {
                model.setSubmittingComment(false);
              }
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheetLayer, getForumOverlayPortalRoot()) : sheetLayer;
};
