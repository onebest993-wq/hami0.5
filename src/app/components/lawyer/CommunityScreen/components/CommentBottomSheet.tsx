import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, MessageSquare, User, BadgeCheck,
  CornerUpLeft, ArrowUp, X, Trash2, Edit2, UserPlus, UserCheck
} from 'lucide-react';
import type { CommunityPost, CommunityComment } from '@/app/services/lawyer-cloud';
import { formatRelativeTime } from '../utils';

export interface CommentBottomSheetProps {
  post: CommunityPost;
  onClose: () => void;
  onAddComment: (postId: string, content: string, parentId?: string) => void;
  currentUserId: string;
  onToggleBestAnswer: (postId: string, commentId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onEditComment: (postId: string, commentId: string, newContent: string) => void;
  onFollow: (targetUserId: string) => void;
  followingIds: Set<string>;
  userStats: Record<string, { followerCount: number; postCount: number }>;
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
}: CommentBottomSheetProps) => {
  const [comment, setComment] = useState('');
  const bestCommentId = post.bestCommentId ?? null;
  const canSelectBest = currentUserId === post.authorId;
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { commentById, childrenByParentId, rootComments, bestComment, bestSubtreeIds } = useMemo(() => {
    const byId = new Map<string, CommunityComment>();
    for (const c of post.comments) byId.set(c.id, c);

    const normalized = post.comments.map((c: CommunityComment) => {
      const parentId = typeof c.parentId === 'string' && byId.has(c.parentId as string) ? c.parentId : undefined;
      return { ...c, parentId };
    });

    const children = new Map<string | null, CommunityComment[]>();
    const roots: CommunityComment[] = [];
    for (const c of normalized) {
      const key = c.parentId ?? null;
      if (!children.has(key)) children.set(key, []);
      children.get(key)!.push(c);
      if (!c.parentId) roots.push(c);
    }
    const sortByTime = (a: CommunityComment, b: CommunityComment) => Date.parse(a.createdAt) - Date.parse(b.createdAt);
    for (const list of children.values()) list.sort(sortByTime);
    roots.sort(sortByTime);

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
      rootComments: roots,
      bestComment: best,
      bestSubtreeIds: subtree,
    };
  }, [post.comments, bestCommentId]);

  const replyingTo = replyingToCommentId ? commentById.get(replyingToCommentId) ?? null : null;

  const renderComment = (c: CommunityComment, depth: number, forceBestStyle: boolean) => {
    const isBest = forceBestStyle || (!!bestCommentId && c.id === bestCommentId);
    const isOwner = currentUserId === c.authorId;
    const indentClass = depth === 0 ? '' : depth === 1 ? 'mr-8' : depth === 2 ? 'mr-16' : 'mr-24';
    const threadClass = depth === 0 ? '' : 'border-r-2 border-slate-700/50 pr-4';
    const isEditing = editingCommentId === c.id;

    if (isEditing) {
      return (
        <div key={c.id} className={`${indentClass} ${threadClass} rounded-2xl p-4 border border-[#E6C673]/40 bg-[#151822]`}>
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
                    : 'text-[#E6C673]/70 bg-[#E6C673]/10 border border-[#E6C673]/20 hover:bg-[#E6C673]/20'
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
            className="w-full bg-[#1A1E2E] text-white/80 text-sm rounded-xl p-3 border border-white/10 outline-none resize-none"
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
              className="text-[11px] px-3 py-1.5 rounded-full bg-[#E6C673] text-black font-bold hover:bg-[#FCEEA7] transition disabled:opacity-50"
            >
              حفظ
            </button>
            <button type="button"
              onClick={() => { setEditingCommentId(null); setEditContent(''); }}
              className="text-[11px] px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white transition"
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
          isBest ? 'bg-[#151822] border-[#E6C673]/40 shadow-[0_0_20px_rgba(230,198,115,0.08)]' : 'bg-white/5 border-white/10'
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
                    : 'text-[#E6C673]/70 bg-[#E6C673]/10 border border-[#E6C673]/20 hover:bg-[#E6C673]/20'
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
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-[#E6C673]/10 text-[#E6C673] border border-[#E6C673]/30">
              <BadgeCheck size={12} />
              أفضل إجابة
            </span>
          )}
          {canSelectBest && (
            <button type="button"
              onClick={() => onToggleBestAnswer(post.id, c.id)}
              className={`opacity-0 group-hover/comment:opacity-100 transition-opacity text-[10px] px-2 py-1 rounded-full border ${
                isBest ? 'bg-[#E6C673]/15 border-[#E6C673]/30 text-[#E6C673]' : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
              }`}
              title="تمييز أفضل إجابة"
            >
              {isBest ? 'إلغاء' : 'أفضل'}
            </button>
          )}
          {isOwner && !confirmDeleteId && (
            <div className="flex gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
              <button type="button"
                onClick={() => { setEditingCommentId(c.id); setEditContent(c.content); }}
                className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
                title="تعديل التعليق"
              >
                <Edit2 size={10} />
              </button>
              <button type="button"
                onClick={() => setConfirmDeleteId(c.id)}
                className="text-[10px] px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                title="حذف التعليق"
              >
                <Trash2 size={10} />
              </button>
            </div>
          )}
          {isOwner && confirmDeleteId === c.id && (
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
        <div className="mt-3 flex items-center gap-2">
          <button type="button"
            onClick={() => setReplyingToCommentId(c.id)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors inline-flex items-center gap-1"
            title="رد"
          >
            <CornerUpLeft size={12} />
            رد
          </button>
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
          className="bg-[#1A1E2E] w-full max-w-2xl h-[70vh] rounded-t-3xl border-t border-[#E6C673]/20 shadow-2xl flex flex-col pointer-events-auto relative z-10"
        >
          <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
            <div className="w-12 h-1.5 rounded-full bg-white/10" />
          </div>

          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <MessageCircle size={20} className="text-[#E6C673]" />
              التعليقات
            </h3>
            <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white">
              <X size={20} />
            </button>
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
            {replyingTo && (
              <div className="mb-3 flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
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
              <div className="flex-1 bg-[#1A1E2E] rounded-2xl border border-white/10 focus-within:border-[#E6C673]/50 transition-colors p-3">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="اكتب تعليقك هنا..."
                  className="w-full bg-transparent text-white text-sm placeholder-white/30 outline-none resize-none max-h-24 custom-scrollbar"
                  rows={1}
                  style={{ minHeight: '40px' }}
                />
              </div>
              <button type="button"
                className={`p-3 rounded-xl transition-all ${comment.trim() ? 'bg-[#E6C673] text-black hover:scale-105' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                disabled={!comment.trim()}
                onClick={() => {
                  const text = comment.trim();
                  if (!text) return;
                  onAddComment(post.id, text, replyingToCommentId ?? undefined);
                  setComment('');
                  setReplyingToCommentId(null);
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
