import React, { memo, useState } from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { Check } from '@/app/components/ui/icons/Check';
import { Shield } from '@/app/components/ui/icons/Shield';
import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import { ForumPublishFab } from './ForumPublishFab';
import {
    FORUM_ACCENT_CHIP,
    FORUM_CONTENT_COLUMN,
    FORUM_FEED_CARD,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

interface ForumGroupsDirectoryProps {
    groups: ForumGroup[];
    loading: boolean;
    onJoin: (groupId: string) => void;
    onOpenGroup: (groupId: string) => void;
    onCreateClick: () => void;
    joiningGroupId: string | null;
}

export const ForumGroupsDirectory = memo(function ForumGroupsDirectory({
    groups,
    loading,
    onJoin,
    onOpenGroup,
    onCreateClick,
    joiningGroupId,
}: ForumGroupsDirectoryProps) {
    return (
        <div className={`${FORUM_CONTENT_COLUMN} pt-1 pb-28 space-y-4`} data-testid="forum-groups-directory">
            {loading ? (
                <p className={`text-center text-sm py-10 ${FORUM_TEXT_MUTED}`}>جاري تحميل المجموعات…</p>
            ) : groups.length === 0 ? (
                <div
                    className="min-h-[min(48vh,26rem)] flex flex-col items-center justify-end text-center px-3 pb-6"
                    data-testid="forum-groups-empty"
                >
                    <p className={`text-sm ${FORUM_TEXT_MUTED} max-w-xs`}>
                        لا مجموعات بعد — أنشئ واحدة من الزر أدناه.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {groups.map((group, index) => (
                        <div
                            key={group.id}
                            style={
                                index > 1
                                    ? { contentVisibility: 'auto', containIntrinsicSize: '0 120px' }
                                    : undefined
                            }
                        >
                        <GroupCard
                            group={group}
                            joining={joiningGroupId === group.id}
                            onJoin={() => onJoin(group.id)}
                            onOpen={() => onOpenGroup(group.id)}
                        />
                        </div>
                    ))}
                </div>
            )}

            <ForumPublishFab
                label="إنشاء مجموعة"
                testId="forum-create-group-fab"
                onClick={onCreateClick}
                icon={<Plus size={18} />}
            />
        </div>
    );
});

function GroupCard({
    group,
    joining,
    onJoin,
    onOpen,
}: {
    group: ForumGroup;
    joining: boolean;
    onJoin: () => void;
    onOpen: () => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <article
            className={`${FORUM_FEED_CARD} p-4 ${group.isMember ? 'cursor-pointer' : ''}`}
            onClick={() => {
                if (group.isMember) onOpen();
            }}
            onKeyDown={(e) => {
                if (group.isMember && (e.key === 'Enter' || e.key === ' ')) onOpen();
            }}
            role={group.isMember ? 'button' : undefined}
            tabIndex={group.isMember ? 0 : undefined}
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className={`text-sm font-bold ${FORUM_TEXT_PRIMARY}`}>{group.name}</h3>
                        {group.isOfficial ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/25 bg-sky-950/30 px-2 py-0.5 text-[9px] font-bold text-sky-200">
                                <Shield size={10} />
                                رسمية
                            </span>
                        ) : null}
                    </div>
                    <p className={`text-xs leading-relaxed ${FORUM_TEXT_MUTED} ${expanded ? '' : 'line-clamp-2'}`}>
                        {group.description}
                    </p>
                    {group.description.length > 90 ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpanded((v) => !v);
                            }}
                            className="mt-1 text-[10px] text-[#E6C673]/80"
                        >
                            {expanded ? 'أقل' : 'المزيد'}
                        </button>
                    ) : null}
                </div>
                <div className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center ${FORUM_ACCENT_CHIP}`}>
                    <p className="text-sm font-black text-[#E6C673]">{group.memberCount}</p>
                    <p className="text-[9px] text-[#9AA3B2]">عضو</p>
                </div>
            </div>

            <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
                {group.isMember ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-950/30 px-3 py-1.5 text-[11px] font-bold text-emerald-200">
                        <Check size={14} />
                        مشترك — ادخل للمجموعة
                    </span>
                ) : (
                    <button
                        type="button"
                        disabled={joining}
                        onClick={onJoin}
                        className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-950/35 px-3 py-1.5 text-[11px] font-bold text-sky-100 hover:bg-sky-950/55 disabled:opacity-60"
                    >
                        <Plus size={14} />
                        {joining ? 'جاري الانضمام…' : 'انضمام'}
                    </button>
                )}
            </div>
        </article>
    );
}
