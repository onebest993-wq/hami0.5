import React, { useState, memo } from 'react';
import {
  User, ArrowUp, MessageCircle,
  FileText, ZoomIn, EyeOff, Loader2, Sparkles,
  Trash2, Pencil, Flag, Link2, X, Eye, Pin, UserPlus, UserCheck,
  Bookmark, Lock, Unlock, VolumeX, Zap, Book, FolderOpen, BellRing
} from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { formatRelativeTime } from '../utils';
import { useForumAttachmentUrl } from '../useForumAttachmentUrl';
import {
    FORUM_ACCENT_CHIP,
    FORUM_FEED_CARD,
    FORUM_INTERACT_BTN,
    FORUM_INTERACT_ICON,
    FORUM_INTERACT_ICON_ACTIVE,
    FORUM_INTERACT_LABEL,
    FORUM_INTERACT_LABEL_ACTIVE,
    FORUM_ICON_BTN,
    FORUM_PANEL,
    FORUM_STAT_BOX,
    FORUM_TEXT_APRICOT,
    FORUM_TEXT_MUTED,
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
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-full ${isAnonymous ? `${FORUM_ACCENT_CHIP}` : 'bg-[#342C3E] text-[#9A9098]'}`}>
          {isAnonymous ? <EyeOff size={16} /> : <User size={16} />}
        </div>
        <div className="relative">
          <button type="button"
            onClick={() => !isAnonymous && setShowUserPopup(!showUserPopup)}
            className={`text-sm font-bold ${isAnonymous ? `${FORUM_TEXT_MUTED} cursor-default` : `${FORUM_TEXT_PRIMARY} hover:text-[#F0B896] transition-colors`}`}
          >
            {displayName}
          </button>
          {showUserPopup && !isAnonymous && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserPopup(false)} />
              <div className={`absolute top-full right-0 mt-2 z-50 w-64 ${FORUM_PANEL} shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/60 border border-white/10">
                    <User size={24} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{displayName}</p>
                    {isAdmin && (
                      <p className="text-gray-500 text-[10px]">معرّف داخلي (إدارة)</p>
                    )}
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
                {canFollow && (
                  <button type="button"
                    onClick={() => { onFollow(post.authorId); setShowUserPopup(false); }}
                    className={`w-full text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                      isFollowing
                        ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 hover:bg-emerald-950/50'
                        : `${FORUM_ACCENT_CHIP} text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg`
                    }`}
                  >
                    {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                    <span>{isFollowing ? 'متابَع' : 'متابعة'}</span>
                    <span className="text-[10px] opacity-60">({followerCount})</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        {canFollow && (
          <button type="button"
            onClick={() => onFollow(post.authorId)}
            className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
              isFollowing
                ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 hover:bg-emerald-950/50'
                : `${FORUM_ACCENT_CHIP} text-xs flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors`
            }`}
            title={isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
          >
            {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
            <span>{isFollowing ? 'متابَع' : 'متابعة'}</span>
          </button>
        )}
        <span className="text-gray-500 text-xs">•</span>
        <span className="text-gray-500 text-xs">{formatRelativeTime(post.createdAt)}</span>
        {isEdited && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEditInfo((v) => !v)}
              className={`text-xs ${FORUM_TEXT_APRICOT} hover:text-[#F8C4A8] transition-colors underline-offset-2 hover:underline`}
              aria-expanded={showEditInfo}
            >
              (مُعدّل{editCount > 0 ? ` · ${editCount}` : ''})
            </button>
            {showEditInfo && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowEditInfo(false)} aria-hidden />
                <div className={`absolute top-full right-0 mt-2 z-50 w-[min(320px,calc(100vw-2rem))] ${FORUM_PANEL} shadow-2xl p-4`}>
                  <p className={`${FORUM_TEXT_PRIMARY} font-bold text-sm mb-1`}>سجل التعديل</p>
                  <p className={`${FORUM_TEXT_MUTED} text-[11px] mb-3`}>
                    عدد مرات التعديل:{' '}
                    <span className={`${FORUM_TEXT_APRICOT} font-bold`}>{editCount || 1}</span>
                  </p>
                  <p className={`${FORUM_TEXT_MUTED} text-[10px] mb-1`}>النص الحالي (بعد التعديل):</p>
                  <p className={`${FORUM_TEXT_PRIMARY} text-[13px] leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto`}>
                    {post.content}
                  </p>
                  {(post.editHistory?.length ?? 0) > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-white/40 text-[10px] mb-2">آخر نسخة قبل التعديل:</p>
                      <p className="text-white/60 text-[12px] leading-relaxed whitespace-pre-wrap line-clamp-4">
                        {post.editHistory![post.editHistory!.length - 1]?.content}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        <div className="flex-1" />
        {/* قفل النقاش — للمالك أو الأدمن */}
        {canLockUnlock && onToggleLock && (
          <button type="button"
            onClick={() => onToggleLock(post.id)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isLocked
                ? 'bg-red-950/40 text-red-300 hover:bg-red-950/60'
                : 'bg-[#342C3A] hover:bg-[#3A3040] text-[#9A9098] hover:text-[#E6E0E4]'
            }`}
            title={isLocked ? 'فتح النقاش' : 'قفل النقاش'}
          >
            {isLocked ? <Lock size={15} /> : <Unlock size={15} />}
          </button>
        )}
        {onSaveToNotes && currentUserId ? (
          <button type="button"
            onClick={() => onSaveToNotes(post.id)}
            className={`w-8 h-8 ${FORUM_ICON_BTN}`}
            title="حفظ في الملاحظات"
          >
            <Book size={15} />
          </button>
        ) : null}
        {onSaveToVault && currentUserId && post.attachment ? (
          <button type="button"
            onClick={() => onSaveToVault(post.id)}
            className={`w-8 h-8 ${FORUM_ICON_BTN}`}
            title="حفظ المرفق في المخزن"
          >
            <FolderOpen size={15} />
          </button>
        ) : null}
        {/* Bookmark — يتطلب تسجيل دخول، يظهر لو لم يكن المنشور للمالك */}
        {onToggleBookmark && currentUserId && (
          <button type="button"
            onClick={() => onToggleBookmark(post.id)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isBookmarked
                ? `${FORUM_ACCENT_CHIP} ${FORUM_TEXT_APRICOT}`
                : 'bg-[#342C3E] hover:bg-[#3A3040] text-[#9A9098] hover:text-[#E6E0E4]'
            }`}
            title={isBookmarked ? 'إلغاء الحفظ' : 'حفظ للقراءة لاحقاً'}
          >
            <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        )}
        {onToggleThreadFollow && currentUserId && (
          <button type="button"
            onClick={() => onToggleThreadFollow(post.id)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isThreadFollowing
                ? `${FORUM_ACCENT_CHIP} ${FORUM_TEXT_APRICOT}`
                : 'bg-[#342C3E] hover:bg-[#3A3040] text-[#9A9098] hover:text-[#E6E0E4]'
            }`}
            title={isThreadFollowing ? 'إلغاء متابعة النقاش' : 'متابعة النقاش — تنبيهات التعليقات'}
          >
            <BellRing size={15} />
          </button>
        )}
        {/* Mute — لا يظهر للمالك ولا للمنشور المجهول */}
        {!isOwner && !isAnonymous && onMuteUser && (
          <button type="button"
            onClick={() => onMuteUser(post.authorId)}
            className={`w-8 h-8 ${FORUM_ICON_BTN}`}
            title="كتم منشورات هذا المستخدم"
          >
            <VolumeX size={15} />
          </button>
        )}
        {isAdmin && (
          <button type="button"
            onClick={() => onTogglePin(post.id)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isPinned
                ? 'bg-amber-950/40 text-amber-300 hover:bg-amber-950/60'
                : 'bg-[#342C3A] hover:bg-[#3A3040] text-[#9A9098] hover:text-[#E6E0E4]'
            }`}
            title={isPinned ? 'إلغاء التثبيت' : 'تثبيت المنشور'}
          >
            <Pin size={16} />
          </button>
        )}
        {isOwner ? (
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => onEdit(post.id)}
              className={`w-8 h-8 ${FORUM_ICON_BTN}`}
              title="تعديل"
            >
              <Pencil size={16} />
            </button>
            <button type="button"
              onClick={() => onDelete(post.id)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-rose-500/15 text-white/40 hover:text-rose-300 flex items-center justify-center"
              title="حذف"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : isAdmin ? (
          <button type="button"
            onClick={() => onDelete(post.id)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-rose-500/15 text-white/40 hover:text-rose-300 flex items-center justify-center"
            title="حذف (إدارة)"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <button type="button"
            onClick={() => onReport(post.id)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-rose-500/15 text-white/40 hover:text-rose-200 flex items-center justify-center"
            title="إبلاغ"
          >
            <Flag size={16} />
          </button>
        )}
      </div>

      <p className={`text-[15px] leading-[1.65] line-clamp-3 mb-3 font-medium ${FORUM_TEXT_PRIMARY} whitespace-pre-wrap`}>
        {post.content}
      </p>

      {post.attachment && (
        <div className="mb-4 mt-2">
          {post.attachment.type === 'image' && (
            <div
              className="w-full h-[150px] relative rounded-xl overflow-hidden group/att cursor-pointer border border-[#4A3D52]/50 bg-[#221A28]"
              onClick={() => attachmentUrl && onImageClick(attachmentUrl)}
            >
              {attachmentLoading ? (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <Loader2 size={22} className="animate-spin text-white/40" />
                </div>
              ) : attachmentUrl ? (
                <>
                  <div className="absolute inset-0 bg-black/20 group-hover/att:bg-black/10 transition-colors z-10" />
                  <ImageWithFallback
                    src={attachmentUrl}
                    alt={post.attachment.name || 'Attachment'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none opacity-0 group-hover/att:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <ZoomIn size={20} className="text-white" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs px-4 text-center">
                  تعذّر تحميل الصورة — قد يكون الرابط منتهياً
                </div>
              )}
            </div>
          )}

          {post.attachment.type === 'audio' && (
            <div className={`w-full ${FORUM_PANEL} p-3`}>
              <p className="text-white/50 text-[10px] mb-2">مقطع صوتي</p>
              {attachmentLoading ? (
                <div className="flex items-center gap-2 text-white/40 text-xs">
                  <Loader2 size={14} className="animate-spin" />
                  جاري تحميل المقطع...
                </div>
              ) : attachmentUrl ? (
                <audio
                  src={attachmentUrl}
                  controls
                  preload="metadata"
                  className="w-full h-10"
                />
              ) : (
                <p className="text-white/40 text-xs">تعذّر تحميل المقطع الصوتي</p>
              )}
            </div>
          )}

          {post.attachment.type === 'document' && (
            attachmentUrl ? (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className={`w-full ${FORUM_PANEL} p-3 flex items-center gap-3 hover:bg-[#342C3E] transition-colors cursor-pointer group/doc`}
            >
              <div className={`w-10 h-10 rounded-lg bg-[#F0B896]/10 flex items-center justify-center border border-[#F0B896]/25 group-hover/doc:border-[#F0B896]/45 transition-colors`}>
                <FileText size={20} className="text-[#F0B896]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/90 text-sm font-medium truncate">{post.attachment.name}</p>
                <p className="text-white/40 text-[10px]">فتح/تحميل</p>
              </div>
              <div className="opacity-0 group-hover/doc:opacity-100 transition-opacity">
                <Eye size={16} className="text-white/50" />
              </div>
            </a>
            ) : (
              <div className={`w-full ${FORUM_PANEL} p-3 flex items-center gap-3`}>
                <div className="w-10 h-10 rounded-lg bg-[#F0B896]/10 flex items-center justify-center border border-[#F0B896]/25">
                  <FileText size={20} className="text-[#F0B896]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate">{post.attachment.name}</p>
                  <p className="text-white/40 text-[10px]">
                    {attachmentLoading ? 'جاري التحميل...' : 'تعذّر فتح الملف'}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      )}

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

      <div className="flex items-center gap-4 mt-2">
        <button type="button"
          onClick={() => onToggleUpvote(post.id)}
          className={`group/up ${FORUM_INTERACT_BTN}`}
          disabled={!currentUserId}
          title={!currentUserId ? 'سجّل الدخول للتصويت' : 'تصويت'}
        >
          <ArrowUp
            size={20}
            className={`transition-colors duration-300 ${isUpvoted ? FORUM_INTERACT_ICON_ACTIVE : FORUM_INTERACT_ICON}`}
          />
          <span className={isUpvoted ? FORUM_INTERACT_LABEL_ACTIVE : FORUM_INTERACT_LABEL}>
            {upvoteCount}
          </span>
        </button>

        <button type="button"
          onClick={() => onCommentClick(post.id)}
          className={`group/c ${FORUM_INTERACT_BTN}`}
        >
          <MessageCircle size={20} className={`${FORUM_INTERACT_ICON} group-hover/c:text-[#F0B896]`} />
          <span className={`${FORUM_INTERACT_LABEL} group-hover/c:text-[#E6E0E4]`}>{post.comments.length} تعليقات زملاء</span>
        </button>

        <button type="button"
          onClick={() => onShare(post.id)}
          className={`group/s ${FORUM_INTERACT_BTN}`}
          title="مشاركة"
        >
          <Link2 size={20} className={`${FORUM_INTERACT_ICON} group-hover/s:text-[#F0B896]`} />
          <span className={`${FORUM_INTERACT_LABEL} group-hover/s:text-[#E6E0E4]`}>مشاركة 🔗</span>
        </button>
      </div>
    </div>
  );
});
