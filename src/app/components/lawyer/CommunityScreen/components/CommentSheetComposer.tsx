import { ArrowUp, Lock, X } from '@/app/components/ui/lucideIcons';
import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';
import type { useForumMentionAutocomplete } from '@/app/hooks/useForumMentionAutocomplete';
import { ForumMentionSuggestions } from './ForumMentionSuggestions';
import {
    FORUM_PANEL,
    FORUM_PUBLISH_BTN,
    FORUM_PUBLISH_BTN_DISABLED,
    FORUM_SURFACE_INPUT,
} from '../forumPlumTheme';

export const COMMENT_MAX_LENGTH = 5_000;

export type CommentSheetComposerProps = {
    post: CommunityPost;
    isLocked: boolean;
    replyingTo: CommunityComment | null;
    onCancelReply: () => void;
    comment: string;
    mention: ReturnType<typeof useForumMentionAutocomplete>;
    submittingComment: boolean;
    composerStyle: React.CSSProperties;
    onSubmitComment: (text: string, parentId?: string) => Promise<void>;
};

export function CommentSheetComposer({
    post,
    isLocked,
    replyingTo,
    onCancelReply,
    comment,
    mention,
    submittingComment,
    composerStyle,
    onSubmitComment,
}: CommentSheetComposerProps) {
    return (
        <div
            className="p-4 border-t border-white/10 bg-[#131620] pb-[max(1rem,env(safe-area-inset-bottom))]"
            style={composerStyle}
        >
            {isLocked ? (
                <div className="mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-2 text-red-200 text-xs">
                    <Lock size={14} />
                    النقاش على هذا المنشور مقفل — لا يمكن إضافة تعليقات جديدة.
                </div>
            ) : null}
            {!isLocked && replyingTo ? (
                <div className={`mb-3 flex items-center justify-between ${FORUM_PANEL} px-4 py-2`}>
                    <span className="text-white/70 text-xs">
                        أنت ترد على <span className="text-white font-bold">{replyingTo.authorName}</span>...
                    </span>
                    <button
                        type="button"
                        onClick={onCancelReply}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center"
                        title="إلغاء الرد"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : null}
            <div className="flex gap-3 items-end">
                <div className={`flex-1 rounded-2xl p-3 ${FORUM_SURFACE_INPUT} relative`}>
                    {mention.showSuggestions ? (
                        <ForumMentionSuggestions
                            suggestions={mention.suggestions}
                            activeIndex={mention.activeIndex}
                            onSelect={mention.insertMention}
                            onHover={mention.setActiveIndex}
                        />
                    ) : null}
                    <textarea
                        ref={mention.textareaRef}
                        value={comment}
                        onChange={(e) =>
                            mention.handleValueChange(
                                e.target.value.slice(0, COMMENT_MAX_LENGTH),
                                e.target.selectionStart,
                            )
                        }
                        onKeyDown={mention.handleKeyDown}
                        onBlur={() => window.setTimeout(() => mention.closeSuggestions(), 120)}
                        placeholder={isLocked ? 'النقاش مقفل' : 'اكتب تعليقك هنا... (@ لإشارة زميل)'}
                        className="w-full bg-transparent text-white text-sm placeholder-white/30 outline-none resize-none max-h-24 custom-scrollbar disabled:cursor-not-allowed"
                        rows={1}
                        style={{ minHeight: '40px' }}
                        maxLength={COMMENT_MAX_LENGTH}
                        disabled={submittingComment || isLocked}
                    />
                    {comment.length > COMMENT_MAX_LENGTH * 0.8 ? (
                        <div className="text-[10px] text-white/40 text-left mt-1">
                            {comment.length} / {COMMENT_MAX_LENGTH}
                        </div>
                    ) : null}
                </div>
                <button
                    type="button"
                    className={`min-h-[44px] min-w-[44px] touch-manipulation p-3 rounded-xl transition-all ${comment.trim() && !submittingComment && !isLocked ? FORUM_PUBLISH_BTN : FORUM_PUBLISH_BTN_DISABLED}`}
                    aria-disabled={!comment.trim() || submittingComment || isLocked}
                    onClick={(event) => {
                        event.stopPropagation();
                        const text = comment.trim();
                        if (!text || submittingComment || isLocked) return;
                        void onSubmitComment(text, replyingTo?.id);
                    }}
                >
                    <ArrowUp size={20} className={comment.trim() ? '' : 'rotate-90'} />
                </button>
            </div>
        </div>
    );
}
