import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { UserMinus } from '@/app/components/ui/icons/UserMinus';
import { Bell } from '@/app/components/ui/icons/Bell';
import { MessageCircle } from '@/app/components/ui/icons/MessageCircle';
import { Reply } from '@/app/components/ui/icons/Reply';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';
import { FORUM_TEXT_MUTED, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';
import { ForumFollowPrefToggle } from './ForumFollowPrefToggle';

type ForumFollowingListProps = {
    following: ForumFollowRecord[];
    authorNames: Record<string, string>;
    expandedId: string | null;
    onToggleExpanded: (userId: string) => void;
    onUnfollow: (userId: string) => void;
    onUpdatePrefs: (
        userId: string,
        prefs: Partial<Pick<ForumFollowRecord, 'notifyPosts' | 'notifyComments' | 'notifyReplies'>>,
    ) => void;
    onOpenProfile?: (userId: string, displayName?: string) => void;
    onRequestClose: () => void;
};

export function ForumFollowingList({
    following,
    authorNames,
    expandedId,
    onToggleExpanded,
    onUnfollow,
    onUpdatePrefs,
    onOpenProfile,
    onRequestClose,
}: ForumFollowingListProps) {
    if (following.length === 0) {
        return (
            <div className="py-10 text-center">
                <UserCheck size={32} className="text-[#E6C673]/30 mx-auto mb-3" />
                <p className={`${FORUM_TEXT_PRIMARY} text-sm font-bold mb-1`}>لا تتابع أحداً بعد</p>
                <p className={`${FORUM_TEXT_MUTED} text-xs`}>
                    اضغط «متابعة» على بطاقة أي محامٍ لتصلك تنبيهات نشاطه
                </p>
            </div>
        );
    }

    return (
        <>
            {following.map((row) => {
                const name = authorNames[row.followingId] ?? 'محامٍ';
                const expanded = expandedId === row.followingId;
                return (
                    <div
                        key={row.followingId}
                        className="rounded-xl hami-forum-panel overflow-hidden"
                    >
                        <div className="flex items-center gap-2 px-3 py-2.5">
                            <div className="w-9 h-9 rounded-full bg-[#E6C673]/12 border border-[#E6C673]/25 flex items-center justify-center text-[#E6C673] text-xs font-bold shrink-0">
                                {name.slice(0, 1)}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onOpenProfile) {
                                        onOpenProfile(row.followingId, name);
                                        onRequestClose();
                                        return;
                                    }
                                    onToggleExpanded(row.followingId);
                                }}
                                className="flex-1 min-h-[44px] min-w-0 text-right flex flex-col justify-center touch-manipulation"
                            >
                                <p className={`${FORUM_TEXT_PRIMARY} text-xs font-bold truncate`}>
                                    {name}
                                </p>
                                <p className={`${FORUM_TEXT_MUTED} text-[10px]`}>
                                    {onOpenProfile
                                        ? 'عرض الملف الشخصي'
                                        : expanded
                                          ? 'إخفاء التفضيلات'
                                          : 'تخصيص التنبيهات'}
                                </p>
                            </button>
                            {onOpenProfile ? (
                                <button
                                    type="button"
                                    onClick={() => onToggleExpanded(row.followingId)}
                                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 text-white/45 touch-manipulation"
                                    title="تخصيص التنبيهات"
                                    aria-label="تخصيص التنبيهات"
                                >
                                    <Bell size={14} />
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => onUnfollow(row.followingId)}
                                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-red-950/30 border border-red-500/20 text-red-300 touch-manipulation"
                                title="إلغاء المتابعة"
                                aria-label="إلغاء المتابعة"
                            >
                                <UserMinus size={14} />
                            </button>
                        </div>
                        {expanded ? (
                            <div className="px-3 pb-3 pt-1 border-t border-[#2A3344]/30">
                                <ForumFollowPrefToggle
                                    label="منشورات جديدة"
                                    icon={Bell}
                                    checked={row.notifyPosts}
                                    onChange={(v) =>
                                        onUpdatePrefs(row.followingId, { notifyPosts: v })
                                    }
                                />
                                <ForumFollowPrefToggle
                                    label="تعليقات على منشوراته"
                                    icon={MessageCircle}
                                    checked={row.notifyComments}
                                    onChange={(v) =>
                                        onUpdatePrefs(row.followingId, { notifyComments: v })
                                    }
                                />
                                <ForumFollowPrefToggle
                                    label="ردود في نقاشاته"
                                    icon={Reply}
                                    checked={row.notifyReplies}
                                    onChange={(v) =>
                                        onUpdatePrefs(row.followingId, { notifyReplies: v })
                                    }
                                />
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </>
    );
}
