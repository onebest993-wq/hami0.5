import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, MessageSquare, User, BadgeCheck, Lock,
  CornerUpLeft, ArrowUp, X, Trash2, Edit2, UserPlus, UserCheck,
  ArrowUpCircle, Flag, ArrowDownUp, VolumeX
} from 'lucide-react';
import type { CommunityPost, CommunityComment } from '@/app/services/lawyer-cloud';
import { formatRelativeTime } from '../utils';
import {
    FORUM_ACCENT_CHIP,
    FORUM_COMMENT_BEST,
    FORUM_COMMENT_CARD,
    FORUM_GHOST_BTN,
    FORUM_ICON_BTN,
    FORUM_INTERACT_BTN,
    FORUM_PANEL,
    FORUM_PUBLISH_BTN,
    FORUM_PUBLISH_BTN_DISABLED,
    FORUM_PUBLISH_BTN_SM,
    FORUM_SHEET,
    FORUM_SURFACE_INPUT,
    FORUM_TEXT_APRICOT,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

/** الحد الأقصى لطول نص التعليق — يجب أن يطابق حدّ السيرفر */
const COMMENT_MAX_LENGTH = 5_000;

/** خيارات ترتيب التعليقات */
type CommentSortMode = 'oldest' | 'newest' | 'top';

export interface CommentBottomSheetProps {
  post: CommunityPost;
  onClose: () => void;
  onAddComment: (postId: string, content: string, parentId?: string) => Promise<boolean> | void;
  currentUserId: string;
  onToggleBestAnswer: (postId: string, commentId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onEditComment: (postId: string, commentId: string, newContent: string) => void;
  onFollow: (targetUserId: string) => void;
  followingIds: Set<string>;
  userStats: Record<string, { followerCount: number; postCount: number }>;
  isAdmin?: boolean;
  onToggleCommentUpvote?: (commentId: string) => void;
  onReportComment?: (commentId: string) => void;
  onMuteUser?: (userId: string) => void;
  mutedUserIds?: Set<string>;
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
}: CommentBottomSheetProps) => {
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sortMode, setSortMode] = useState<CommentSortMode>('oldest');
  const bestCommentId = post.bestCommentId ?? null;
  const canSelectBest = currentUserId === post.authorId;
  const isLocked = post.isLocked === true;
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { commentById, childrenByParentId, bestComment, bestSubtreeIds } = useMemo(() => {
    const byId = new Map<string, CommunityComment>();
    for (const c of post.comments) byId.set(c.id, c);

    const normalized = post.comments.map((c: CommunityComment) => {
      const parentId = typeof c.parentId === 'string' && byId.has(c.parentId as string) ? c.parentId : undefined;
      return { ...c, parentId };
    });

    const children = new Map<string | null, CommunityComment[]>();
    for (const c of normalized) {
      const key = c.parentId ?? null;
      if (!children.has(key)) children.set(key, []);
      children.get(key)!.push(c);
    }

    // ترتيب أولاد كل عقدة وفق sortMode (الجذور تأخذ نفس الترتيب)
    const compareFn = (a: CommunityComment, b: CommunityComment): number => {
      if (sortMode === 'newest') return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (sortMode === 'top') {
        const ua = a.upvoterIds?.length ?? 0;
        const ub = b.upvoterIds?.length ?? 0;
        if (ua !== ub) return ub - ua;
        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      }
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    };
    for (const list of children.values()) list.sort(compareFn);

    const best = bestCommentId ? byId.get(bestCommentId) ?? null : null;

    const subtree = new Set<string>();
    if (best) {
      const stack: string[] = [best.id];
      while (stack.length) {
        const id = stack.pop()!;
        if (subtree.has(id)) continue;
        subtree.add(id);
        const kids = children.get(id) ?? [];
        for (const k of kids) stack.push(k.id);
      }
    }

    return {
      commentById: byId,
      childrenByParentId: children,
      bestComment: best,
      bestSubtreeIds: subtree,
    };
  }, [post.comments, bestCommentId, sortMode]);

  const replyingTo = replyingToCommentId ? commentById.get(replyingToCommentId) ?? null : null;

  const renderComment = (c: CommunityComment, depth: number, forceBestStyle: boolean) => {
    const isBest = forceBestStyle || (!!bestCommentId && c.id === bestCommentId);
    const isCommentAuthor = currentUserId === c.authorId;
    const isPostAuthor = currentUserId === post.authorId;
    const canDeleteComment = isCommentAuthor || isPostAuthor || isAdmin;
    // تعليق «أفضل إجابة» مقفل التعديل لمنع التلاعب بعد تمييزه
    const canEditComment = isCommentAuthor && c.id !== bestCommentId;
    const indentClass = depth === 0 ? '' : depth === 1 ? 'mr-8' : depth === 2 ? 'mr-16' : 'mr-24';
    const threadClass = depth === 0 ? '' : 'border-r-2 border-slate-700/50 pr-4';
    const isEditing = editingCommentId === c.id;

    if (isEditing) {
      return (
        <div key={c.id} className={`${indentClass} ${threadClass} ${FORUM_COMMENT_CARD} border-[#F0B896]/30`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50">
              <User size={14} />
            </div>
            <span className="text-white/80 text-sm font-bold">{c.authorName}</span>
            {c.authorId !== currentUserId && (
              <button type="button"
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
            )}
            <span className="text-white/20 text-xs">•</span>
            <span className="text-white/30 text-xs">تعديل...</span>
          </div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className={`w-full text-sm rounded-xl p-3 outline-none resize-none ${FORUM_SURFACE_INPUT}`}
            rows={3}
          />
          <div className="flex gap-2 mt-3">
            <button type="button"
              onClick={() => {
                if (editContent.trim()) {
                  onEditComment(post.id, c.id, editContent.trim());
                }
                setEditingCommentId(null);
                setEditContent('');
              }}
              disabled={!editContent.trim()}
              className={FORUM_PUBLISH_BTN_SM}
            >
              حفظ
            </button>
            <button type="button"
              onClick={() => { setEditingCommentId(null); setEditContent(''); }}
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
        key={c.id}
        className={`${indentClass} ${threadClass} group/comment rounded-2xl p-4 border transition-colors ${
          isBest ? FORUM_COMMENT_BEST : `${FORUM_COMMENT_CARD}`
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50">
              <User size={14} />
            </div>
            <span className="text-white/80 text-sm font-bold">{c.authorName}</span>
            {c.authorId !== currentUserId && (
              <button type="button"
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
            )}
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
            <button type="button"
              onClick={() => onToggleBestAnswer(post.id, c.id)}
              className={`text-[10px] px-2 py-1 rounded-full border ${
                isBest ? `${FORUM_ACCENT_CHIP} ${FORUM_TEXT_APRICOT}` : `${FORUM_GHOST_BTN} text-[11px] px-2.5 py-1`
              }`}
              title="تمييز أفضل إجابة"
            >
              {isBest ? 'إلغاء' : 'أفضل'}
            </button>
          )}
          {(canEditComment || canDeleteComment) && !confirmDeleteId && (
            <div className="flex gap-1">
              {canEditComment && (
                <button type="button"
                  onClick={() => { setEditingCommentId(c.id); setEditContent(c.content); }}
                  className={`text-[10px] px-2 py-1 rounded-full ${FORUM_GHOST_BTN}`}
                  title="تعديل التعليق"
                >
                  <Edit2 size={10} />
                </button>
              )}
              {canDeleteComment && (
                <button type="button"
                  onClick={() => setConfirmDeleteId(c.id)}
                  className="text-[10px] px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                  title="حذف التعليق"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          )}
          {canDeleteComment && confirmDeleteId === c.id && (
            <div className="flex gap-1">
              <button type="button"
                onClick={() => { onDeleteComment(post.id, c.id); setConfirmDeleteId(null); }}
                className="text-[10px] px-2 py-1 rounded-full bg-red-500 text-white font-bold"
              >
                تأكيد الحذف
              </button>
              <button type="button"
                onClick={() => setConfirmDeleteId(null)}
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
            <button type="button"
              onClick={() => setReplyingToCommentId(c.id)}
              className={`text-[11px] px-2.5 py-1 rounded-full ${FORUM_GHOST_BTN} inline-flex items-center gap-1`}
              title="رد"
            >
              <CornerUpLeft size={12} />
              رد
            </button>
          )}
          {onToggleCommentUpvote && !isCommentAuthor && (
            <button type="button"
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
            <button type="button"
              onClick={() => onReportComment(c.id)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-red-400 hover:border-red-500/30 transition-colors inline-flex items-center gap-1"
              title="الإبلاغ عن التعليق"
            >
              <Flag size={11} />
              إبلاغ
            </button>
          )}
          {onMuteUser && !isCommentAuthor && (
            <button type="button"
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
  };

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

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center pointer-events-none">
      <AnimatePresence>
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto"
        />

        <motion.div
          key="sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`${FORUM_SHEET} w-full max-w-2xl h-[70vh] rounded-t-3xl flex flex-col pointer-events-auto relative z-10 border-t-[#F0B896]/25`}
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
              <button type="button" onClick={onClose} className={`p-2 ${FORUM_ICON_BTN}`}>
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

          <div className="p-4 border-t border-white/10 bg-[#131620]">
            {isLocked && (
              <div className="mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-2 text-red-200 text-xs">
                <Lock size={14} />
                النقاش على هذا المنشور مقفل — لا يمكن إضافة تعليقات جديدة.
              </div>
            )}
            {!isLocked && replyingTo && (
              <div className={`mb-3 flex items-center justify-between ${FORUM_PANEL} px-4 py-2`}>
                <span className="text-white/70 text-xs">
                  أنت ترد على <span className="text-white font-bold">{replyingTo.authorName}</span>...
                </span>
                <button type="button"
                  onClick={() => setReplyingToCommentId(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center"
                  title="إلغاء الرد"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="flex gap-3 items-end">
              <div className={`flex-1 rounded-2xl p-3 ${FORUM_SURFACE_INPUT}`}>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
                  placeholder={isLocked ? 'النقاش مقفل' : 'اكتب تعليقك هنا...'}
                  className="w-full bg-transparent text-white text-sm placeholder-white/30 outline-none resize-none max-h-24 custom-scrollbar disabled:cursor-not-allowed"
                  rows={1}
                  style={{ minHeight: '40px' }}
                  maxLength={COMMENT_MAX_LENGTH}
                  disabled={submittingComment || isLocked}
                />
                {comment.length > COMMENT_MAX_LENGTH * 0.8 && (
                  <div className="text-[10px] text-white/40 text-left mt-1">
                    {comment.length} / {COMMENT_MAX_LENGTH}
                  </div>
                )}
              </div>
              <button type="button"
                className={`p-3 rounded-xl transition-all ${comment.trim() && !submittingComment && !isLocked ? FORUM_PUBLISH_BTN : FORUM_PUBLISH_BTN_DISABLED}`}
                disabled={!comment.trim() || submittingComment || isLocked}
                onClick={async () => {
                  const text = comment.trim();
                  if (!text || submittingComment) return;
                  // حماية النص: لا نمسحه قبل التأكد من النجاح
                  setSubmittingComment(true);
                  try {
                    const result = onAddComment(post.id, text, replyingToCommentId ?? undefined);
                    // إذا كان handler يرجع Promise<boolean>، ننتظر النتيجة
                    const ok = result instanceof Promise ? await result : true;
                    if (ok !== false) {
                      setComment('');
                      setReplyingToCommentId(null);
                    }
                  } finally {
                    setSubmittingComment(false);
                  }
                }}
              >
                <ArrowUp size={20} className={comment.trim() ? '' : 'rotate-90'} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
