import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { FORUM_TEXT_APRICOT, FORUM_TEXT_MUTED, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';

type ForumFollowersListProps = {
    followers: Array<{ followerId: string; createdAt: string }>;
    authorNames: Record<string, string>;
    onFollowBack?: (userId: string) => void;
    onOpenProfile?: (userId: string, displayName?: string) => void;
    onRequestClose: () => void;
};

export function ForumFollowersList({
    followers,
    authorNames,
    onFollowBack,
    onOpenProfile,
    onRequestClose,
}: ForumFollowersListProps) {
    if (followers.length === 0) {
        return (
            <div className="py-10 text-center">
                <UserCheck size={32} className="text-[#E6C673]/30 mx-auto mb-3" />
                <p className={`${FORUM_TEXT_PRIMARY} text-sm font-bold mb-1`}>لا متابعين بعد</p>
                <p className={`${FORUM_TEXT_MUTED} text-xs`}>عندما يتابعك محامٍ سيظهر هنا</p>
            </div>
        );
    }

    return (
        <>
            {followers.map((row) => {
                const name = authorNames[row.followerId] ?? 'محامٍ';
                return (
                    <div
                        key={row.followerId}
                        className="rounded-xl hami-forum-panel px-3 py-2.5 flex items-center gap-2"
                    >
                        <div className="w-9 h-9 rounded-full bg-[#E6C673]/12 border border-[#E6C673]/25 flex items-center justify-center text-[#E6C673] text-xs font-bold shrink-0">
                            {name.slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                            {onOpenProfile ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenProfile(row.followerId, name);
                                        onRequestClose();
                                    }}
                                    className="text-right w-full min-h-[44px] flex flex-col justify-center touch-manipulation"
                                >
                                    <p className={`${FORUM_TEXT_PRIMARY} text-xs font-bold truncate`}>{name}</p>
                                    <p className={`${FORUM_TEXT_MUTED} text-[10px]`}>عرض الملف الشخصي</p>
                                </button>
                            ) : (
                                <>
                                    <p className={`${FORUM_TEXT_PRIMARY} text-xs font-bold truncate`}>{name}</p>
                                    <p className={`${FORUM_TEXT_MUTED} text-[10px]`}>متابِع لك</p>
                                </>
                            )}
                        </div>
                        {onFollowBack ? (
                            <button
                                type="button"
                                onClick={() => onFollowBack(row.followerId)}
                                className={`${FORUM_TEXT_APRICOT} min-h-[44px] text-[10px] font-bold px-3 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/25 touch-manipulation`}
                            >
                                متابعة
                            </button>
                        ) : null}
                    </div>
                );
            })}
        </>
    );
}
