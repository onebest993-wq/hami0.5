import { User } from '@/app/components/ui/icons/User';
import { UserPlus } from '@/app/components/ui/icons/UserPlus';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { AccreditedLawyerMark } from '@/app/components/shared/AccreditedLawyerMark';
import { useAccreditedLawyerMark } from '@/app/hooks/useAccreditedLawyerMark';
import {
    FORUM_ACCENT_CHIP,
    FORUM_DROPDOWN_PANEL,
    FORUM_STAT_BOX,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

type QuestionCardAuthorPopupProps = {
    displayName: string;
    isAdmin: boolean;
    isFollowing: boolean;
    canFollow: boolean;
    followerCount: number;
    postCount: number;
    authorId: string;
    authorName: string;
    onFollow: (targetUserId: string) => void;
    onOpenProfile?: (userId: string, displayName?: string) => void;
    onClose: () => void;
};

export function QuestionCardAuthorPopup({
    displayName,
    isAdmin,
    isFollowing,
    canFollow,
    followerCount,
    postCount,
    authorId,
    authorName,
    onFollow,
    onOpenProfile,
    onClose,
}: QuestionCardAuthorPopupProps) {
    const accredited = useAccreditedLawyerMark(authorId);
    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div
                className={`absolute top-full right-0 mt-2 z-50 w-64 ${FORUM_DROPDOWN_PANEL} p-4 animate-in fade-in slide-in-from-top-2 duration-200`}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/60 border border-white/10">
                        <User size={24} />
                        {accredited ? <AccreditedLawyerMark /> : null}
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">{displayName}</p>
                        {isAdmin ? <p className="text-gray-500 text-[10px]">معرّف داخلي (إدارة)</p> : null}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={FORUM_STAT_BOX}>
                        <p className={`${FORUM_TEXT_PRIMARY} font-bold text-lg`}>{followerCount}</p>
                        <p className={`${FORUM_TEXT_MUTED} text-[10px]`}>متابعون</p>
                    </div>
                    <div className={FORUM_STAT_BOX}>
                        <p className={`${FORUM_TEXT_PRIMARY} font-bold text-lg`}>{postCount}</p>
                        <p className={`${FORUM_TEXT_MUTED} text-[10px]`}>منشورات</p>
                    </div>
                </div>
                {canFollow ? (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onFollow(authorId);
                            onClose();
                        }}
                        className={`w-full min-h-[44px] text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors mb-2 touch-manipulation ${
                            isFollowing
                                ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 hover:bg-emerald-950/50'
                                : `${FORUM_ACCENT_CHIP} text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg`
                        }`}
                    >
                        {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                        <span>{isFollowing ? 'متابَع' : 'متابعة'}</span>
                        <span className="text-[10px] opacity-60">({followerCount})</span>
                    </button>
                ) : null}
                {onOpenProfile ? (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onOpenProfile(authorId, authorName);
                            onClose();
                        }}
                        className="w-full min-h-[44px] text-xs font-bold py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white/80 hover:bg-white/10 touch-manipulation"
                    >
                        عرض الملف الشخصي
                    </button>
                ) : null}
            </div>
        </>
    );
}
