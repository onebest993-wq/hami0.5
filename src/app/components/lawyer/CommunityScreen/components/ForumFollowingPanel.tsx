import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserCheck, UserMinus, Bell, MessageCircle, Reply, X } from 'lucide-react';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';
import {
    FORUM_PANEL,
    FORUM_TEXT_APRICOT,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

type ForumFollowingPanelProps = {
    open: boolean;
    onClose: () => void;
    following: ForumFollowRecord[];
    followers: Array<{ followerId: string; createdAt: string }>;
    authorNames: Record<string, string>;
    onUnfollow: (userId: string) => void;
    onFollowBack?: (userId: string) => void;
    onUpdatePrefs: (
        userId: string,
        prefs: Partial<Pick<ForumFollowRecord, 'notifyPosts' | 'notifyComments' | 'notifyReplies'>>,
    ) => void;
    onOpenFollowingFeed: () => void;
};

function PrefToggle({
    label,
    icon: Icon,
    checked,
    onChange,
}: {
    label: string;
    icon: React.ElementType;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between gap-2 py-1.5 cursor-pointer">
            <span className="flex items-center gap-1.5 text-[11px] text-white/55">
                <Icon size={12} className="text-[#F0B896]/70" aria-hidden />
                {label}
            </span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="w-4 h-4 accent-[#F0B896]"
            />
        </label>
    );
}

export const ForumFollowingPanel = memo(function ForumFollowingPanel({
    open,
    onClose,
    following,
    followers,
    authorNames,
    onUnfollow,
    onFollowBack,
    onUpdatePrefs,
    onOpenFollowingFeed,
}: ForumFollowingPanelProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [tab, setTab] = useState<'following' | 'followers'>('following');

    return (
        <AnimatePresence>
            {open ? (
                <>
                    <motion.div
                        key="following-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[96] bg-black/50"
                        onClick={onClose}
                        aria-hidden
                    />
                    <motion.div
                        key="following-sheet"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                        className={`fixed inset-x-0 bottom-0 z-[97] max-h-[78dvh] rounded-t-[24px] ${FORUM_PANEL} shadow-2xl flex flex-col`}
                        role="dialog"
                        aria-label="قائمة المتابعة"
                        dir="rtl"
                    >
                        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-2" aria-hidden />
                        <div className="px-4 pb-3 flex items-center justify-between gap-3 border-b border-[#4A3D52]/40">
                            <div>
                                <h3 className={`${FORUM_TEXT_PRIMARY} font-bold text-sm`}>المتابعة</h3>
                                <p className={`${FORUM_TEXT_MUTED} text-[11px] mt-0.5`}>
                                    {tab === 'following'
                                        ? `${following.length} محامٍ تتابعهم`
                                        : `${followers.length} يتابعونك`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {tab === 'following' && following.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onOpenFollowingFeed();
                                            onClose();
                                        }}
                                        className={`${FORUM_TEXT_APRICOT} text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#F0B896]/10 border border-[#F0B896]/25`}
                                    >
                                        عرض منشوراتهم
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="إغلاق"
                                    className="w-8 h-8 rounded-full bg-[#342C3A] flex items-center justify-center text-white/50"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="px-4 pt-2 flex gap-1">
                            {(['following', 'followers'] as const).map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setTab(key)}
                                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors ${
                                        tab === key
                                            ? 'bg-[#F0B896]/14 text-[#F0B896] border border-[#F0B896]/25'
                                            : 'text-white/45 border border-transparent'
                                    }`}
                                >
                                    {key === 'following' ? 'أتابعهم' : 'متابِعوني'}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                            {tab === 'following' ? (
                            following.length === 0 ? (
                                <div className="py-10 text-center">
                                    <UserCheck size={32} className="text-[#F0B896]/30 mx-auto mb-3" />
                                    <p className={`${FORUM_TEXT_PRIMARY} text-sm font-bold mb-1`}>لا تتابع أحداً بعد</p>
                                    <p className={`${FORUM_TEXT_MUTED} text-xs`}>
                                        اضغط «متابعة» على بطاقة أي محامٍ لتصلك تنبيهات نشاطه
                                    </p>
                                </div>
                            ) : (
                                following.map((row) => {
                                    const name = authorNames[row.followingId] ?? 'محامٍ';
                                    const expanded = expandedId === row.followingId;
                                    return (
                                        <div
                                            key={row.followingId}
                                            className="rounded-xl border border-[#4A3D52]/45 bg-[#342C3A]/60 overflow-hidden"
                                        >
                                            <div className="flex items-center gap-2 px-3 py-2.5">
                                                <div className="w-9 h-9 rounded-full bg-[#F0B896]/12 border border-[#F0B896]/25 flex items-center justify-center text-[#F0B896] text-xs font-bold shrink-0">
                                                    {name.slice(0, 1)}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedId(expanded ? null : row.followingId)
                                                    }
                                                    className="flex-1 min-w-0 text-right"
                                                >
                                                    <p className={`${FORUM_TEXT_PRIMARY} text-xs font-bold truncate`}>
                                                        {name}
                                                    </p>
                                                    <p className={`${FORUM_TEXT_MUTED} text-[10px]`}>
                                                        {expanded ? 'إخفاء التفضيلات' : 'تخصيص التنبيهات'}
                                                    </p>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onUnfollow(row.followingId)}
                                                    className="w-8 h-8 rounded-lg bg-red-950/30 border border-red-500/20 flex items-center justify-center text-red-300"
                                                    title="إلغاء المتابعة"
                                                >
                                                    <UserMinus size={14} />
                                                </button>
                                            </div>
                                            {expanded ? (
                                                <div className="px-3 pb-3 pt-1 border-t border-[#4A3D52]/30">
                                                    <PrefToggle
                                                        label="منشورات جديدة"
                                                        icon={Bell}
                                                        checked={row.notifyPosts}
                                                        onChange={(v) =>
                                                            onUpdatePrefs(row.followingId, { notifyPosts: v })
                                                        }
                                                    />
                                                    <PrefToggle
                                                        label="تعليقات على منشوراته"
                                                        icon={MessageCircle}
                                                        checked={row.notifyComments}
                                                        onChange={(v) =>
                                                            onUpdatePrefs(row.followingId, { notifyComments: v })
                                                        }
                                                    />
                                                    <PrefToggle
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
                                })
                            )
                            ) : followers.length === 0 ? (
                                <div className="py-10 text-center">
                                    <UserCheck size={32} className="text-[#F0B896]/30 mx-auto mb-3" />
                                    <p className={`${FORUM_TEXT_PRIMARY} text-sm font-bold mb-1`}>لا متابعين بعد</p>
                                    <p className={`${FORUM_TEXT_MUTED} text-xs`}>عندما يتابعك محامٍ سيظهر هنا</p>
                                </div>
                            ) : (
                                followers.map((row) => {
                                    const name = authorNames[row.followerId] ?? 'محامٍ';
                                    return (
                                        <div
                                            key={row.followerId}
                                            className="rounded-xl border border-[#4A3D52]/45 bg-[#342C3A]/60 px-3 py-2.5 flex items-center gap-2"
                                        >
                                            <div className="w-9 h-9 rounded-full bg-[#F0B896]/12 border border-[#F0B896]/25 flex items-center justify-center text-[#F0B896] text-xs font-bold shrink-0">
                                                {name.slice(0, 1)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`${FORUM_TEXT_PRIMARY} text-xs font-bold truncate`}>{name}</p>
                                                <p className={`${FORUM_TEXT_MUTED} text-[10px]`}>متابِع لك</p>
                                            </div>
                                            {onFollowBack ? (
                                                <button
                                                    type="button"
                                                    onClick={() => onFollowBack(row.followerId)}
                                                    className={`${FORUM_TEXT_APRICOT} text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-[#F0B896]/10 border border-[#F0B896]/25`}
                                                >
                                                    متابعة
                                                </button>
                                            ) : null}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                </>
            ) : null}
        </AnimatePresence>
    );
});
