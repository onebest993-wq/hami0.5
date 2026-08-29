import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useCommunitySheetChrome } from '@/app/hooks/useCommunitySheetChrome';
import { X } from '@/app/components/ui/icons/X';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';
import {
    FORUM_ICON_BTN,
    FORUM_PANEL,
    FORUM_TEXT_APRICOT,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';
import { getForumOverlayPortalRoot } from '../forumOverlayPortal';
import { ForumFollowingList } from './ForumFollowingList';
import { ForumSheetSwipeHandle } from './ForumSheetSwipeHandle';
import { ForumFollowersList } from './ForumFollowersList';

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
    onOpenProfile?: (userId: string, displayName?: string) => void;
};

export const ForumFollowingPanel = function ForumFollowingPanel({
    onClose,
    following,
    followers,
    authorNames,
    onUnfollow,
    onFollowBack,
    onUpdatePrefs,
    onOpenFollowingFeed,
    onOpenProfile,
}: ForumFollowingPanelProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [tab, setTab] = useState<'following' | 'followers'>('following');
    const reduceMotion = useReduceMotion();
    const { sheetStyle } = useCommunitySheetChrome(true);

    const requestClose = useCallback(() => {
        onClose();
    }, [onClose]);

    const sheetTransition = reduceMotion
        ? { duration: 0 }
        : { type: 'tween' as const, duration: 0.18, ease: [0.32, 0, 0.67, 0] as const };

    const panelLayer = (
        <>
            <motion.div
                key="following-backdrop"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={sheetTransition}
                className="fixed inset-0 z-[120] bg-black/50 pointer-events-auto"
                onClick={requestClose}
                aria-hidden
            />
            <motion.div
                key="following-sheet"
                data-testid="forum-following-panel"
                initial={reduceMotion ? false : { y: '100%' }}
                animate={{ y: 0 }}
                transition={sheetTransition}
                style={sheetStyle}
                        className={`fixed inset-x-0 bottom-0 z-[121] max-h-[min(78dvh,100%)] rounded-t-[24px] ${FORUM_PANEL} flex flex-col pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-auto`}
                        role="dialog"
                        aria-modal="true"
                        aria-label="قائمة المتابعة"
                        dir="rtl"
            >
                        <ForumSheetSwipeHandle
                            onClose={requestClose}
                            barClassName="w-10 h-1 rounded-full bg-white/20"
                        />
                        <div className="px-4 pb-3 flex items-center justify-between gap-3 border-b border-[#2A3344]/40">
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
                                            requestClose();
                                        }}
                                        className={`${FORUM_TEXT_APRICOT} min-h-[44px] text-[11px] font-bold px-3 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/25 touch-manipulation`}
                                    >
                                        عرض منشوراتهم
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={requestClose}
                                    aria-label="إغلاق"
                                    className={FORUM_ICON_BTN}
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
                                    className={`flex-1 min-h-[44px] rounded-lg text-[11px] font-bold transition-colors touch-manipulation ${
                                        tab === key
                                            ? 'bg-[#E6C673]/14 text-[#E6C673] border border-[#E6C673]/25'
                                            : 'text-white/45 border border-transparent'
                                    }`}
                                >
                                    {key === 'following' ? 'أتابعهم' : 'متابِعوني'}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                            {tab === 'following' ? (
                                <ForumFollowingList
                                    following={following}
                                    authorNames={authorNames}
                                    expandedId={expandedId}
                                    onToggleExpanded={(userId) =>
                                        setExpandedId((prev) => (prev === userId ? null : userId))
                                    }
                                    onUnfollow={onUnfollow}
                                    onUpdatePrefs={onUpdatePrefs}
                                    onOpenProfile={onOpenProfile}
                                    onRequestClose={requestClose}
                                />
                            ) : (
                                <ForumFollowersList
                                    followers={followers}
                                    authorNames={authorNames}
                                    onFollowBack={onFollowBack}
                                    onOpenProfile={onOpenProfile}
                                    onRequestClose={requestClose}
                                />
                            )}
                        </div>
            </motion.div>
        </>
    );

    return typeof document !== 'undefined' ? createPortal(panelLayer, getForumOverlayPortalRoot()) : panelLayer;
};
