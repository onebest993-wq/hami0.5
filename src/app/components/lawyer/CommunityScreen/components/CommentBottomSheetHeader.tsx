import { MessageCircle } from '@/app/components/ui/icons/MessageCircle';
import { Lock } from '@/app/components/ui/icons/Lock';
import { X } from '@/app/components/ui/icons/X';
import { ArrowDownUp } from '@/app/components/ui/icons/ArrowDownUp';
import type { CommentSortMode } from '../hooks/useCommentThreadTree';
import { FORUM_ICON_BTN, FORUM_SURFACE_INPUT, FORUM_TEXT_APRICOT, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';

type CommentBottomSheetHeaderProps = {
    commentCount: number;
    isLocked: boolean;
    sortMode: CommentSortMode;
    onSortModeChange: (mode: CommentSortMode) => void;
    onClose: () => void;
};

export function CommentBottomSheetHeader({
    commentCount,
    isLocked,
    sortMode,
    onSortModeChange,
    onClose,
}: CommentBottomSheetHeaderProps) {
    return (
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
            <h3 className={`${FORUM_TEXT_PRIMARY} font-bold text-lg flex items-center gap-2`}>
                <MessageCircle size={20} className={FORUM_TEXT_APRICOT} />
                التعليقات
                {isLocked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-red-500/10 text-red-200 border border-red-500/30">
                        <Lock size={11} />
                        مقفل
                    </span>
                ) : null}
            </h3>
            <div className="flex items-center gap-2">
                {commentCount > 1 ? (
                    <div className="flex items-center gap-1 text-[11px]">
                        <ArrowDownUp size={12} className="text-white/40" />
                        <select
                            value={sortMode}
                            onChange={(e) => onSortModeChange(e.target.value as CommentSortMode)}
                            className={`${FORUM_SURFACE_INPUT} min-h-[44px] rounded-md px-2 py-1 text-[16px]`}
                            title="ترتيب التعليقات"
                            aria-label="ترتيب التعليقات"
                        >
                            <option value="oldest" className="bg-[#161E2C]">
                                الأقدم
                            </option>
                            <option value="newest" className="bg-[#161E2C]">
                                الأحدث
                            </option>
                            <option value="top" className="bg-[#161E2C]">
                                الأعلى تصويتاً
                            </option>
                        </select>
                    </div>
                ) : null}
                <button type="button" onClick={onClose} className={FORUM_ICON_BTN} aria-label="إغلاق">
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
