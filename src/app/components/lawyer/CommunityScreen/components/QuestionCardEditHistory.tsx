import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { FORUM_DROPDOWN_PANEL, FORUM_TEXT_APRICOT, FORUM_TEXT_MUTED, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';

type QuestionCardEditHistoryProps = {
    post: CommunityPost;
    editCount: number;
    showEditInfo: boolean;
    setShowEditInfo: (open: boolean | ((v: boolean) => boolean)) => void;
};

export function QuestionCardEditHistory({
    post,
    editCount,
    showEditInfo,
    setShowEditInfo,
}: QuestionCardEditHistoryProps) {
    return (
        <div className="relative shrink-0">
            <button
                type="button"
                onClick={() => setShowEditInfo((v) => !v)}
                className={`min-h-[44px] text-xs ${FORUM_TEXT_APRICOT} hover:text-[#F8C4A8] transition-colors underline-offset-2 hover:underline touch-manipulation`}
                aria-expanded={showEditInfo}
            >
                (مُعدّل{editCount > 0 ? ` · ${editCount}` : ''})
            </button>
            {showEditInfo ? (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEditInfo(false)} aria-hidden />
                    <div
                        className={`absolute top-full right-0 mt-2 z-50 w-[min(320px,calc(100vw-2rem))] ${FORUM_DROPDOWN_PANEL} p-4`}
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
    );
}
