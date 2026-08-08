import React, { memo } from 'react';
import { ArrowRight, LogOut, Shield, Users } from '@/app/components/ui/lucideIcons';
import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { ForumPostList } from './ForumPostList';
import {
    FORUM_ACCENT_CHIP,
    FORUM_PANEL,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

type ForumGroupFeedPanelProps = {
    group: ForumGroup;
    onBack: () => void;
    onLeave: () => void;
    leaving: boolean;
} & Omit<React.ComponentProps<typeof ForumPostList>, 'visiblePosts'> & {
    visiblePosts: CommunityPost[];
};

export const ForumGroupFeedPanel = memo(function ForumGroupFeedPanel({
    group,
    onBack,
    onLeave,
    leaving,
    visiblePosts,
    ...postListProps
}: ForumGroupFeedPanelProps) {
    return (
        <div className="flex flex-col min-h-full">
            <div className={`mx-4 mt-2 mb-4 ${FORUM_PANEL} p-4`}>
                <div className="flex items-start gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 shrink-0"
                        aria-label="رجوع للمجموعات"
                    >
                        <ArrowRight size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h2 className={`text-base font-bold ${FORUM_TEXT_PRIMARY}`}>{group.name}</h2>
                            {group.isOfficial ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/25 bg-sky-950/30 px-2 py-0.5 text-[9px] font-bold text-sky-200">
                                    <Shield size={10} />
                                    رسمية
                                </span>
                            ) : null}
                        </div>
                        <p className={`text-xs leading-relaxed ${FORUM_TEXT_MUTED}`}>{group.description}</p>
                        <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-white/45">
                            <Users size={12} />
                            {group.memberCount} عضو
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onLeave}
                        disabled={leaving}
                        className={`shrink-0 inline-flex items-center gap-1 rounded-xl border px-2.5 py-2 text-[10px] font-bold ${FORUM_ACCENT_CHIP} disabled:opacity-60`}
                    >
                        <LogOut size={12} />
                        {leaving ? '…' : 'مغادرة'}
                    </button>
                </div>
            </div>

            <ForumPostList visiblePosts={visiblePosts} {...postListProps} />
        </div>
    );
});
