import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import {
  MessageCircle, MessageSquare, Lock,
  X, ArrowDownUp,
} from 'lucide-react';
import type { CommunityPost, CommunityComment } from '@/app/services/lawyer-cloud';
import type { MentionCandidate } from '@/app/hooks/useForumMentionAutocomplete';
import { useForumMentionAutocomplete } from '@/app/hooks/useForumMentionAutocomplete';
import { useCommunitySheetChrome } from '@/app/hooks/useCommunitySheetChrome';
import { CommentSheetComposer } from './CommentSheetComposer';
import { ForumCommentRow } from './ForumCommentRow';
import { useCommentThreadTree, type CommentSortMode } from '../hooks/useCommentThreadTree';
import {
    FORUM_ACCENT_CHIP,
    FORUM_GHOST_BTN,
    FORUM_ICON_BTN,
    FORUM_INTERACT_BTN,
    FORUM_PANEL,
    FORUM_SHEET,
    FORUM_SURFACE_INPUT,
    FORUM_TEXT_APRICOT,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

/** خيارات ترتيب التعليقات — re-export للتوافق */
export type { CommentSortMode } from '../hooks/useCommentThreadTree';

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
  const [comment, setComment] = useState('');
  const mention = useForumMentionAutocomplete(comment, setComment, mentionCandidates);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sortMode, setSortMode] = useState<CommentSortMode>('oldest');
  const bestCommentId = post.bestCommentId ?? null;
  const canSelectBest = currentUserId === (post.authorId || post.author_id || '');
  const isLocked = post.isLocked === true;
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const reduceMotion = useReduceMotion();
  const { sheetStyle, composerStyle } = useCommunitySheetChrome();

  const { commentById, childrenByParentId, bestComment, bestSubtreeIds } = useCommentThreadTree(
    post.comments,
    bestCommentId,
    sortMode,
  );

  const replyingTo = replyingToCommentId ? commentById.get(replyingToCommentId) ?? null : null;

  const renderComment = (c: CommunityComment, depth: number, forceBestStyle: boolean) => (
    <ForumCommentRow
      key={c.id}
      comment={c}
      post={post}
      depth={depth}
      forceBestStyle={forceBestStyle}
      bestCommentId={bestCommentId}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      isLocked={isLocked}
      canSelectBest={canSelectBest}
      followingIds={followingIds}
      userStats={userStats}
      mutedUserIds={mutedUserIds}
      editingCommentId={editingCommentId}
      editContent={editContent}
      confirmDeleteId={confirmDeleteId}
      onSetEditingCommentId={setEditingCommentId}
      onSetEditContent={setEditContent}
      onSetConfirmDeleteId={setConfirmDeleteId}
      onSetReplyingToCommentId={setReplyingToCommentId}
      onFollow={onFollow}
      onToggleBestAnswer={onToggleBestAnswer}
      onEditComment={onEditComment}
      onDeleteComment={onDeleteComment}
      onToggleCommentUpvote={onToggleCommentUpvote}
      onReportComment={onReportComment}
      onMuteUser={onMuteUser}
      onOpenProfile={onOpenProfile}
    />
  );

  const renderThread = (parentId: string | null, depth: number, excluded: Set<string>) => {
    const kids = childrenByParentId.get(parentId) ?? [];
    return kids
      .filter((c) => !excluded.has(c.id))
      .map((c) => (
        <React.Fragment key={c.id}>
          {renderComment(c, depth, false)}
          {renderThread(c.id, Math.min(depth + 1, 3), excluded)}
        </React.Fragment>
      ));
  };

    const sheetLayer = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center pointer-events-none" data-testid="forum-comment-sheet">
      <AnimatePresence>
        <motion.div
          key="backdrop"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto"
        />

        <motion.div
          key="sheet"
          initial={reduceMotion ? false : { y: '100%' }}
          animate={{ y: 0 }}
          exit={reduceMotion ? undefined : { y: '100%' }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
          style={sheetStyle}
          className={`${FORUM_SHEET} w-full max-w-2xl h-[70vh] rounded-t-3xl flex flex-col pointer-events-auto relative z-10 border-t-[#F0B896]/25 pb-[env(safe-area-inset-bottom)]`}
        >
          <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
            <div className="w-12 h-1.5 rounded-full bg-white/10" />
          </div>

          <div className="px-6 py-4 border-b border-[#4A3D52]/40 flex items-center justify-between gap-3">
            <h3 className={`${FORUM_TEXT_PRIMARY} font-bold text-lg flex items-center gap-2`}>
              <MessageCircle size={20} className={FORUM_TEXT_APRICOT} />
              التعليقات
              {isLocked && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-red-500/10 text-red-200 border border-red-500/30">
                  <Lock size={11} />
                  مقفل
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {post.comments.length > 1 && (
                <div className="flex items-center gap-1 text-[11px]">
                  <ArrowDownUp size={12} className="text-white/40" />
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as CommentSortMode)}
                    className={`${FORUM_SURFACE_INPUT} rounded-md px-2 py-1 text-sm`}
                    title="ترتيب التعليقات"
                  >
                    <option value="oldest" className="bg-[#221A28]">الأقدم</option>
                    <option value="newest" className="bg-[#221A28]">الأحدث</option>
                    <option value="top" className="bg-[#221A28]">الأعلى تصويتاً</option>
                  </select>
                </div>
              )}
              <button type="button" onClick={onClose} className={FORUM_ICON_BTN} aria-label="إغلاق">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-3">
            {post.comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-80">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <MessageSquare size={32} className="text-white/20" />
                </div>
                <div>
                  <p className="text-white font-bold mb-1">لا توجد تعليقات بعد</p>
                  <p className="text-white/40 text-sm">ابدأ النقاش بشكل مهني وآمن</p>
                </div>
              </div>
            ) : (
              <>
                {bestComment ? (
                  <>
                    {renderComment(bestComment, 0, true)}
                    {renderThread(bestComment.id, 1, new Set())}
                  </>
                ) : null}

                {renderThread(
                  null,
                  0,
                  bestComment ? new Set<string>(bestSubtreeIds) : new Set<string>(),
                )}
              </>
            )}
          </div>

          <CommentSheetComposer
            post={post}
            isLocked={isLocked}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingToCommentId(null)}
            comment={comment}
            mention={mention}
            submittingComment={submittingComment}
            composerStyle={composerStyle}
            onSubmitComment={async (text, parentId) => {
              setSubmittingComment(true);
              try {
                const result = onAddComment(post.id, text, parentId);
                const ok = result instanceof Promise ? await result : true;
                if (ok !== false) {
                  setComment('');
                  setReplyingToCommentId(null);
                }
              } finally {
                setSubmittingComment(false);
              }
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheetLayer, document.body) : sheetLayer;
};
